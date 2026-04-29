import "dotenv/config";
import crypto from "node:crypto";
import express, { type Request, type Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import { initMysqlPool, pingMysqlDetail, getMysqlPool } from "./database.js";
import {
  ensureAdminsTable,
  seedAdminFromEnvIfEmpty,
  trySeedAdminFromEnv,
  verifyAdminCredentials,
} from "./adminMysql.js";
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
  }>;
  businessHours: { open: string; close: string };
  whatsapp: string;
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
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (db && email) {
    return crypto
      .createHash("sha256")
      .update(`fs_sess:v1:${db}:${email}`)
      .digest("hex");
  }
  return null;
}

function createSessionToken(secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ sub: "admin", exp })).toString(
    "base64url",
  );
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string, secret: string): boolean {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return false;
    const payloadPart = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac("sha256", secret).update(payloadPart).digest(
      "base64url",
    );
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return false;
    }
    const decoded = Buffer.from(payloadPart, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { sub?: string; exp?: number };
    if (parsed.sub !== "admin" || typeof parsed.exp !== "number") return false;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

function getSessionToken(req: Request): string | undefined {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE];
}

function isCatalogPayload(body: unknown): body is CatalogPayload {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  if (!Array.isArray(o.categories) || !Array.isArray(o.products)) return false;
  if (!o.businessHours || typeof o.businessHours !== "object") return false;
  const bh = o.businessHours as Record<string, unknown>;
  if (typeof bh.open !== "string" || typeof bh.close !== "string") return false;
  if (typeof o.whatsapp !== "string") return false;
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
  app.get("/api/health", async (_req, res) => {
    const d = await pingMysqlDetail();
    res.json({
      ok: true,
      mysql: d.mysql,
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
    const given =
      (typeof req.headers.authorization === "string"
        ? req.headers.authorization.replace(/^Bearer\s+/i, "").trim()
        : "") ||
      (typeof req.headers["x-admin-bootstrap"] === "string"
        ? String(req.headers["x-admin-bootstrap"]).trim()
        : "");

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

  app.get("/api/catalog", async (_req, res) => {
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
    if (!tok || !verifySessionToken(tok, secret)) {
      res.json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true });
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
    const email = emailRaw.trim().toLowerCase();

    if (!email || !pwdRaw) {
      res.status(400).json({ error: "E-poçt və şifrə tələb olunur" });
      return;
    }

    const ok = await verifyAdminCredentials(mysqlPool, email, pwdRaw);
    if (!ok) {
      res.status(401).json({ error: "E-poçt və ya şifrə yanlışdır" });
      return;
    }

    const token = createSessionToken(secret);
    const isProd = process.env.NODE_ENV === "production";
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: Boolean(isProd),
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    res.json({ ok: true });
  });

  app.post("/api/admin/logout", (_req, res) => {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
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
    if (!tok || !verifySessionToken(tok, secret)) {
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
