import "dotenv/config";
import crypto from "node:crypto";
import { mkdirSync } from "node:fs";
import express, { type Request, type Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import { initMysqlPool, pingMysqlDetail, getMysqlPool } from "./database.js";
import {
  ensureAdminsTable,
  listAdminEmailsForDiagnostic,
  normalizeEmailForAuth,
  replaceAllAdminsFromEnv,
  seedAdminFromEnvIfEmpty,
  trySeedAdminFromEnv,
  updateAdminPassword,
  verifyAdminLogin,
} from "./adminMysql.js";
import multer from "multer";
const SESSION_COOKIE = "flamesushi_admin_session";

interface CatalogPayload {
  categories: Array<{ id: string; name: string; image: string }>;
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    discountPrice?: number;
    category: string;
    image: string;
    popular?: boolean;
    sortOrder?: number;
    discountPercent?: number;
    discountFixedAmount?: number;
    discountMode?: string;
    availabilityNote?: string;
    orderWindow?: Record<string, unknown>;
  }>;
  businessHours: { open: string; close: string };
  whatsapp: string;
  siteSettings?: Record<string, unknown>;
  siteBanners?: {
    slides?: Array<Record<string, unknown>>;
    heroImageUrls?: string[];
    featuredProductIds?: string[];
    carouselSeconds?: number;
  };
  promoCodes?: Array<{
    id: string;
    code: string;
    discountType?: string;
    discountPercent?: number;
    discountFixedAmount?: number;
    activeOnWebsite: boolean;
    validFrom?: string;
    validTo?: string;
    note?: string;
    createdAt: string;
  }>;
}

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const segment of header.split(";")) {
    const idx = segment.indexOf("=");
    if (idx === -1) continue;
    const key = decodeURIComponent(segment.slice(0, idx).trim());
    let val = decodeURIComponent(segment.slice(idx + 1).trim());
    const q = val.indexOf(";");
    if (q !== -1) val = val.slice(0, q).trimEnd();
    out[key] = val;
  }
  return out;
}

/** Sessiya kukilərinin imzası — ADMIN_SESSION_SECRET və ya MYSQL_DATABASE + ADMIN_EMAIL derivasiya. */
function signingSecret(): string | null {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicit) return explicit;
  const db = process.env.MYSQL_DATABASE?.trim();
  const envMail = process.env.ADMIN_EMAIL?.trim();
  const email = envMail ? normalizeEmailForAuth(envMail) : "";
  if (db && email) {
    return crypto
      .createHash("sha256")
      .update(`fs_sess:v1:${db}:${email}`)
      .digest("hex");
  }
  return null;
}

interface AdminSessionPayload {
  sub: string;
  exp: number;
  /** Normalizə olunmuş giriş e-poçtu (köhnə kukilər üçün facultativ). */
  email?: string;
}

function createSessionToken(secret: string, adminEmailNormalized: string): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const payload = Buffer.from(
    JSON.stringify({
      sub: "admin",
      exp,
      email: adminEmailNormalized,
    }),
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** İmzanı və süresini yoxlayır; əsasən köhnə kukilər üçün email boş ola bilər. */
function parseVerifiedSessionToken(
  token: string,
  secret: string,
): AdminSessionPayload | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payloadPart = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac("sha256", secret).update(payloadPart).digest(
      "base64url",
    );
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }
    const decoded = Buffer.from(payloadPart, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<AdminSessionPayload>;
    if (parsed.sub !== "admin" || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    if (parsed.email !== undefined && typeof parsed.email !== "string") return null;
    const em =
      typeof parsed.email === "string" && parsed.email.length > 0
        ? parsed.email.trim()
        : undefined;
    return em
      ? { sub: "admin", exp: parsed.exp, email: em }
      : { sub: "admin", exp: parsed.exp };
  } catch {
    return null;
  }
}

function getSessionToken(req: Request): string | undefined {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE];
}

/** Nginx / Hostinger arxasında HTTPS — Secure kuki (JWT / brauzer uyğunluğu) */
function adminSessionCookieSecure(req: Request): boolean {
  if (process.env.ADMIN_COOKIE_SECURE === "false") return false;
  if (process.env.NODE_ENV !== "production") return false;
  const xf = req.get("x-forwarded-proto")?.toLowerCase();
  if (xf === "http") return false;
  if (xf === "https") return true;
  if (req.secure) return true;
  /** Əksər paylaşılmış hostində Node HTTP-dədir, qarşı tərəf HTTPS — əvvəlki kimi default secure */
  return true;
}

function clearAdminSessionCookie(req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    path: "/",
    httpOnly: true,
    secure: adminSessionCookieSecure(req),
    sameSite: "lax",
  });
}

/** Bootstrap token — seed / admin bərpası endpoint-ləri üçün */
function readBootstrapToken(req: Request): string {
  return (
    (typeof req.headers.authorization === "string"
      ? req.headers.authorization.replace(/^Bearer\s+/i, "").trim()
      : "") ||
    (typeof req.headers["x-admin-bootstrap"] === "string"
      ? String(req.headers["x-admin-bootstrap"]).trim()
      : "")
  );
}

function isCatalogPayload(body: unknown): body is CatalogPayload {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  if (!Array.isArray(o.categories) || !Array.isArray(o.products)) return false;
  if (!o.businessHours || typeof o.businessHours !== "object") return false;
  const bh = o.businessHours as Record<string, unknown>;
  if (typeof bh.open !== "string" || typeof bh.close !== "string") return false;
  if (typeof o.whatsapp !== "string") return false;
  if (o.siteBanners !== undefined) {
    const sb = o.siteBanners as Record<string, unknown>;
    if (typeof sb !== "object" || sb === null) return false;
    if (sb.heroImageUrls !== undefined && !Array.isArray(sb.heroImageUrls))
      return false;
    if (sb.featuredProductIds !== undefined && !Array.isArray(sb.featuredProductIds))
      return false;
    if (sb.slides !== undefined && !Array.isArray(sb.slides)) return false;
  }
  if (o.promoCodes !== undefined && !Array.isArray(o.promoCodes)) return false;
  if (o.siteSettings !== undefined && (typeof o.siteSettings !== 'object' || o.siteSettings === null)) return false;
  return true;
}

async function ensureDataDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readCatalogDisk(
  cwd: string,
): Promise<CatalogPayload> {
  const dataDir = path.join(cwd, "data");
  const catalogFile = path.join(dataDir, "catalog.json");
  const seedFile = path.join(cwd, "catalog.seed.json");
  await ensureDataDir(dataDir);

  async function safeRead(fp: string) {
    return JSON.parse(await fs.readFile(fp, "utf8")) as CatalogPayload;
  }

  try {
    return await safeRead(catalogFile);
  } catch {
    /* try seed */
  }
  try {
    return await safeRead(seedFile);
  } catch {
    console.error("[catalog] Missing catalog.json and catalog.seed.json");
    throw new Error("Catalog unavailable");
  }
}

async function writeCatalogDisk(cwd: string, catalog: CatalogPayload) {
  const dataDir = path.join(cwd, "data");
  await ensureDataDir(dataDir);
  const catalogFile = path.join(dataDir, "catalog.json");
  await fs.writeFile(catalogFile, JSON.stringify(catalog, null, 2), "utf8");
}

function attachApi(app: express.Application, cwd: string) {
  const uploadsDir = path.join(cwd, "data", "uploads");
  mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(uploadsDir));

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (_req, file, cb) => {
        const extRaw = path.extname(file.originalname).toLowerCase();
        const safe =
          extRaw === ".jpg" ||
          extRaw === ".jpeg" ||
          extRaw === ".png" ||
          extRaw === ".webp" ||
          extRaw === ".gif"
            ? extRaw
            : ".jpg";
        cb(
          null,
          `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safe}`,
        );
      },
    }),
    limits: { fileSize: 6 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (/^image\/(jpeg|pjpeg|png|gif|webp)$/i.test(file.mimetype)) {
        cb(null, true);
        return;
      }
      cb(
        new Error(
          "Yalnız şəkil (JPEG, PNG, WebP, GIF) — cihaz yaddaşından seçin",
        ),
      );
    },
  });

  const guardAdminUpload: express.RequestHandler = (req, res, next) => {
    const secret = signingSecret();
    if (!secret) {
      res.status(503).json({
        error:
          "ADMIN_SESSION_SECRET və ya ADMIN_EMAIL + MYSQL_DATABASE tələb olunur",
      });
      return;
    }
    const tok = getSessionToken(req);
    if (!tok || !parseVerifiedSessionToken(tok, secret)) {
      res.status(401).json({ error: "Giriş tələb olunur" });
      return;
    }
    next();
  };

  app.post("/api/admin/upload", guardAdminUpload, (req, res) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const code =
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code?: string }).code === "LIMIT_FILE_SIZE";
        res.status(code ? 413 : 400).json({
          error: code
            ? "Fayl ən çox 6 MB ola bilər"
            : err instanceof Error && err.message
              ? err.message
              : "Yükləmə alınmadı",
        });
        return;
      }
      type Multered = Request & { file?: { filename: string } };
      const mf = req as Multered;
      if (!mf.file?.filename) {
        res.status(400).json({ error: "Şəkil faylı seçin (cihazdan)" });
        return;
      }
      res.json({ ok: true, url: `/uploads/${mf.file.filename}` });
    });
  });

  app.get("/api/health", async (_req, res) => {
    const d = await pingMysqlDetail();
    const dbName =
      getMysqlPool() ? process.env.MYSQL_DATABASE?.trim() : undefined;
    res.json({
      ok: true,
      mysql: d.mysql,
      ...(dbName !== undefined ? { mysqlDatabase: dbName } : {}),
      ...(d.mysqlCode ? { mysqlCode: d.mysqlCode } : {}),
      ...(d.mysqlHint ? { mysqlHint: d.mysqlHint } : {}),
    });
  });

  /**
   * Boş admins üçün: .env — ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_BOOTSTRAP_TOKEN.
   * Header: Authorization: Bearer <token> və ya x-admin-bootstrap: <token>
   */
  app.post("/api/setup/seed-first-admin", async (req, res) => {
    const expected = process.env.ADMIN_BOOTSTRAP_TOKEN?.trim();
    const given = readBootstrapToken(req);

    if (!expected) {
      res.status(503).json({
        error:
          "Hostingdə ADMIN_BOOTSTRAP_TOKEN əlavə edin (təsadüfi uzun mətn), sonra yenidən cəhd edin.",
      });
      return;
    }
    if (given !== expected) {
      res.status(401).json({
        error: "Yanlış token — Authorization: Bearer ... və ya x-admin-bootstrap",
      });
      return;
    }

    const pool = getMysqlPool();
    if (!pool) {
      res.status(503).json({ error: "MySQL yoxdur" });
      return;
    }

    try {
      await ensureAdminsTable(pool);
      const r = await trySeedAdminFromEnv(pool);
      if (r.seeded) {
        res.json({ ok: true, message: r.message });
        return;
      }
      const code = (r.adminsCount ?? 0) > 0 ? 409 : 400;
      res.status(code).json({ ok: false, message: r.message });
    } catch (e) {
      console.error("[setup/seed-first-admin]", e);
      res.status(500).json({
        ok: false,
        error: String(e instanceof Error ? e.message : e).slice(0, 240),
      });
    }
  });

  /**
   * Məcburi bərpa: admins cədvəlindəki bütün sətirləri silir və yalnız
   * .env ADMIN_EMAIL + bcrypt(ADMIN_PASSWORD) ilə tək admin yazır (bootstrap token lazımdır).
   * İstifadə: giriş çox uzun müddət işləməyəndə və ya phpMyAdmin ilə uyğunsuzluq olanda — bir dəfə POST, sonra .env-dəki ünvanla giriş.
   */
  app.post("/api/setup/replace-admin-from-env", async (req, res) => {
    const expected = process.env.ADMIN_BOOTSTRAP_TOKEN?.trim();
    const given = readBootstrapToken(req);

    if (!expected) {
      res.status(503).json({
        error:
          "Hostingdə ADMIN_BOOTSTRAP_TOKEN əlavə edin (təsadüfi uzun mətn), sonra yenidən cəhd edin.",
      });
      return;
    }
    if (given !== expected) {
      res.status(401).json({
        error: "Yanlış token — Authorization: Bearer ... və ya x-admin-bootstrap",
      });
      return;
    }

    const pool = getMysqlPool();
    if (!pool) {
      res.status(503).json({ error: "MySQL yoxdur" });
      return;
    }

    try {
      await ensureAdminsTable(pool);
      const r = await replaceAllAdminsFromEnv(pool);
      if (r.ok) {
        res.json({ ok: true, message: r.message });
        return;
      }
      res.status(400).json({ ok: false, message: r.message });
    } catch (e) {
      console.error("[setup/replace-admin-from-env]", e);
      res.status(500).json({
        ok: false,
        error: String(e instanceof Error ? e.message : e).slice(0, 240),
      });
    }
  });

  /** Bootstrap token ilə: bazada hansı e-poçtların olduğunu və .env ilə uyğunluğu göstərir. */
  app.get("/api/setup/admin-diagnostic", async (req, res) => {
    const expected = process.env.ADMIN_BOOTSTRAP_TOKEN?.trim();
    const given = readBootstrapToken(req);

    if (!expected) {
      res.status(503).json({
        error:
          "Hostingdə ADMIN_BOOTSTRAP_TOKEN təyin olunmayıb — diaqnostika üçün lazımdır.",
      });
      return;
    }
    if (given !== expected) {
      res.status(401).json({
        error: "Yanlış token — Authorization: Bearer ... və ya x-admin-bootstrap",
      });
      return;
    }

    const pool = getMysqlPool();
    if (!pool) {
      res.status(503).json({ error: "MySQL yoxdur", mysqlConfigured: false });
      return;
    }

    try {
      await ensureAdminsTable(pool);
      const admins = await listAdminEmailsForDiagnostic(pool);
      const envEmailRaw = process.env.ADMIN_EMAIL?.trim();
      const adminEmailNormalized = envEmailRaw
        ? normalizeEmailForAuth(envEmailRaw)
        : null;

      let envMismatch = false;
      if (adminEmailNormalized && admins.length > 0) {
        const hit = admins.some(
          (a) => a.normalized === adminEmailNormalized,
        );
        envMismatch = !hit;
      }

      res.json({
        ok: true,
        mysqlDatabase: process.env.MYSQL_DATABASE?.trim() ?? null,
        adminEmailFromEnvNormalized: adminEmailNormalized,
        adminsInDatabase: admins,
        envAdminPresentInDb:
          adminEmailNormalized === null
            ? null
            : admins.some((a) => a.normalized === adminEmailNormalized),
        hint: envMismatch
          ? "ADMIN_EMAIL .env-dəki normalizədən sonra bazada yoxdur — POST /api/setup/replace-admin-from-env işlədin."
          : undefined,
      });
    } catch (e) {
      console.error("[setup/admin-diagnostic]", e);
      res.status(500).json({
        error: String(e instanceof Error ? e.message : e).slice(0, 240),
      });
    }
  });

  app.get("/api/catalog", async (_req, res) => {
    /** Canlı menyunu keşdə köhnə saxlamasin — dəyişiklik dərhal görünməlidir */
    res.setHeader(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    try {
      const catalog = await readCatalogDisk(cwd);
      res.json(catalog);
    } catch {
      res.status(500).json({ error: "Catalog load failed" });
    }
  });

  app.get("/api/admin/me", (req, res) => {
    const mysqlPool = getMysqlPool();
    if (!mysqlPool) {
      res.json({
        authenticated: false,
        reason: "mysql_not_configured" as const,
      });
      return;
    }
    const secret = signingSecret();
    if (!secret) {
      res.json({
        authenticated: false,
        reason: "session_not_configurable" as const,
      });
      return;
    }
    const tok = getSessionToken(req);
    const sess = tok ? parseVerifiedSessionToken(tok, secret) : null;
    if (!sess) {
      res.json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      email: sess.email ?? null,
    });
  });

  app.post("/api/admin/login", async (req, res) => {
    const mysqlPool = getMysqlPool();
    if (!mysqlPool) {
      res.status(503).json({
        error: "MySQL təyin olunmayıb (MYSQL_USER / MYSQL_DATABASE)",
      });
      return;
    }
    const secret = signingSecret();
    if (!secret) {
      res.status(503).json({
        error:
          "ADMIN_SESSION_SECRET yazın və ya ADMIN_EMAIL ilə MYSQL_DATABASE birlikdə olsun",
      });
      return;
    }

    const emailRaw = typeof req.body?.email === "string" ? req.body.email : "";
    const pwdRaw = typeof req.body?.password === "string" ? req.body.password : "";
    const email = normalizeEmailForAuth(emailRaw);

    if (!email || !pwdRaw) {
      res.status(400).json({ error: "E-poçt və şifrə tələb olunur" });
      return;
    }

    const result = await verifyAdminLogin(mysqlPool, email, pwdRaw);
    if (result.ok === false) {
      let msg: string;
      let code: string;
      switch (result.reason) {
        case "no_admins":
          msg =
            "Administrator hələ yaradılmayıb: hostingdə ADMIN_EMAIL və ADMIN_PASSWORD təyin edib Node-u restart edin və ya /api/setup/seed-first-admin ilə seed edin.";
          code = "NO_ADMINS";
          break;
        case "email_not_found":
          msg =
            "Bu e-poçt uyğun gəlmir. GET /api/setup/admin-diagnostic (bootstrap token) ilə bazadakı e-poçtları yoxlayın; sonra POST /api/setup/replace-admin-from-env və ya eyni normalizə olunmuş ünvanla giriş edin.";
          code = "EMAIL_NOT_FOUND";
          break;
        case "password_not_configured":
          msg =
            "admins sətirində bcrypt şifrə (password_hash) yoxdur və ya boşdur. phpMyAdmin-də sırf əl ilə email əlavə etmək kifayət deyil — .env ADMIN_EMAIL/ADMIN_PASSWORD ilə seed və ya uyğun hash əlavə edin.";
          code = "PASSWORD_NOT_CONFIGURED";
          break;
        case "wrong_password":
        default:
          msg = "Şifrə yanlışdır.";
          code = "WRONG_PASSWORD";
          break;
      }
      res.status(401).json({ error: msg, code });
      return;
    }

    const token = createSessionToken(secret, email);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: adminSessionCookieSecure(req),
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    res.json({ ok: true });
  });

  app.post("/api/admin/logout", (req, res) => {
    clearAdminSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.post("/api/admin/change-password", async (req, res) => {
    const mysqlPool = getMysqlPool();
    const secret = signingSecret();
    if (!mysqlPool || !secret) {
      res.status(503).json({
        error: "MySQL və sessiya dəyərləri lazımdır",
      });
      return;
    }
    const tok = getSessionToken(req);
    const sess = tok ? parseVerifiedSessionToken(tok, secret) : null;
    if (!sess) {
      res.status(401).json({ error: "Giriş tələb olunur" });
      return;
    }
    if (!sess.email) {
      res.status(403).json({
        error:
          "Köhnə sessiya — şifrəni dəyişmək üçün bir dəfə çıxıb yenidən daxil olun.",
      });
      return;
    }

    const cur =
      typeof req.body?.currentPassword === "string"
        ? req.body.currentPassword
        : "";
    const nw =
      typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    if (!cur || !nw) {
      res.status(400).json({ error: "Cari və yeni şifrə tələb olunur" });
      return;
    }

    const outcome = await updateAdminPassword(mysqlPool, sess.email, cur, nw);
    if (outcome.ok === false) {
      let msg: string;
      switch (outcome.reason) {
        case "wrong_password":
          msg = "Cari şifrə yanlışdır.";
          break;
        case "not_found":
          msg = "Administrator tapılmadı — yenidən giriş edin.";
          break;
        case "password_not_configured":
          msg = "Şifrə təyin olunmayıb — hostingdə ADMIN_EMAIL ilə seed edin.";
          break;
        case "weak_password":
          msg = "Yeni şifrə ən azı 8 simvol olmalıdır.";
          break;
        case "same_as_current":
          msg = "Yeni şifrə cari şifrədən fərqli olmalıdır.";
          break;
        default:
          msg = "Şifrə yenilənə bilmədi.";
          break;
      }
      res.status(400).json({ error: msg });
      return;
    }

    res.json({ ok: true });
  });

  app.put("/api/admin/catalog", async (req, res) => {
    const mysqlPool = getMysqlPool();
    const secret = signingSecret();
    if (!mysqlPool || !secret) {
      res.status(503).json({
        error: "MySQL və sessiya dəyərləri lazımdır",
      });
      return;
    }
    const tok = getSessionToken(req);
    if (!tok || !parseVerifiedSessionToken(tok, secret)) {
      res.status(401).json({ error: "Giriş tələb olunur" });
      return;
    }
    if (!isCatalogPayload(req.body)) {
      res.status(400).json({ error: "Yanlış kataloq formatı" });
      return;
    }
    await writeCatalogDisk(cwd, req.body);
    res.json({ ok: true });
  });
}

async function startServer() {
  const app = express();
  /** Nginx əks istiqamət — X-Forwarded-Proto ilə Secure kuki */
  app.set("trust proxy", 1);

  const cwd = process.cwd();
  const PORT = Number(process.env.PORT) || 3000;

  initMysqlPool();
  const pool = getMysqlPool();
  if (pool) {
    try {
      await ensureAdminsTable(pool);
      await seedAdminFromEnvIfEmpty(pool);
    } catch (err) {
      console.error(
        "[mysql/admin] Migrasiya / seed zamanı xəta — əsas sayt işləsin deyə server davam edir:",
        err,
      );
      console.warn(
        "[mysql/admin] phpMyHosting-də MYSQL_HOST/USER/PASSWORD və icazələri yoxlayın.",
      );
    }
  }

  app.use(express.json({ limit: "2mb" }));
  attachApi(app, cwd);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(cwd, "dist");
    app.use(express.static(distPath));

    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    const d = await pingMysqlDetail();
    if (d.mysql === "ok") console.log("[mysql] Bağlantı hazırdır.");
    else if (d.mysql === "skipped")
      console.warn("[mysql] Aktiv deyil — MYSQL_USER / MYSQL_DATABASE yazın.");
    else
      console.warn(
        `[mysql] Xəta (${d.mysqlCode ?? "?"}): ${d.mysqlHint ?? "—"}`,
      );
  });
}

void startServer().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
