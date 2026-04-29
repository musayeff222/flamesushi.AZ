import "dotenv/config";
import crypto from "node:crypto";
import express, { type Request, type Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer as createViteServer } from "vite";

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

function sessionSecret(adminPasswordTrimmed: string | undefined): string | null {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicit) return explicit;
  if (!adminPasswordTrimmed) return null;
  return crypto
    .createHash("sha256")
    .update(`flamesushi_admin_sess:${adminPasswordTrimmed}`)
    .digest("hex");
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
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const adminSecretResolved = (): string | null => sessionSecret(adminPassword);

  app.get("/api/catalog", async (_req, res) => {
    try {
      const catalog = await readCatalogDisk(cwd);
      res.json(catalog);
    } catch {
      res.status(500).json({ error: "Catalog load failed" });
    }
  });

  app.get("/api/admin/me", (req, res) => {
    const secret = adminSecretResolved();
    if (!adminPassword) {
      res.json({
        authenticated: false,
        reason: "admin_not_configured" as const,
      });
      return;
    }
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
    const secret = adminSecretResolved();
    if (!secret || !adminPassword) {
      res.status(503).json({ error: "Admin şifrəsi təyin olunmayıb" });
      return;
    }
    const pwd =
      typeof req.body?.password === "string"
        ? (req.body.password as string)
        : "";
    if (pwd !== adminPassword) {
      res.status(401).json({ error: "Yanlış şifrə" });
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
    const secret = adminSecretResolved();
    if (!secret || !adminPassword) {
      res.status(503).json({
        error: "Admin şifrəsi və ya ADMIN_SESSION_SECRET təyin olunmayıb",
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer();
