import type { Pool, RowDataPacket } from "mysql2/promise";
import bcrypt from "bcryptjs";

interface AdminPwdRow extends RowDataPacket {
  email: string;
  password_hash: string;
}

/**
 * Giriş / .env üçün eyni format — MySQL LOWER(TRIM) ilə uyğunlaşmayan Unicode hallarını bağlayır.
 */
export function normalizeEmailForAuth(raw: string): string {
  return raw.normalize("NFKC").trim().toLowerCase();
}

/** MySQLdə admins cədvəli — e-poçt + bcrypt şifrə. */
export async function ensureAdminsTable(pool: Pool): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_admin_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export interface SeedOutcome {
  /** true yalnız yeni sətir əlavə edildikdə */
  seeded: boolean;
  message: string;
  /** admins cədvəlində mövcud sətir sayı */
  adminsCount?: number;
}

/**
 * ADMIN_EMAIL + ADMIN_PASSWORD ilə ilk admin yaradılması (əgər admins boşdursa).
 */
export async function trySeedAdminFromEnv(pool: Pool): Promise<SeedOutcome> {
  const envEmail = process.env.ADMIN_EMAIL ?? "";
  const email = envEmail ? normalizeEmailForAuth(envEmail) : "";
  const password = process.env.ADMIN_PASSWORD ?? "";

  const [cntRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM admins`,
    [],
  );
  const raw = cntRows[0]?.cnt;
  const count =
    typeof raw === "bigint" ? Number(raw) : Number(raw ?? 0);

  if (count > 0) {
    return {
      seeded: false,
      message: `admins cədvəlində artıq ${count} administrator var`,
      adminsCount: count,
    };
  }

  if (!email || !String(password).length) {
    return {
      seeded: false,
      message:
        "ADMIN_EMAIL və ADMIN_PASSWORD təyin edilməyib — ilk giriş üçün hər ikisi lazımdır",
      adminsCount: 0,
    };
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
  const hash = await bcrypt.hash(String(password), rounds);
  await pool.execute(
    `INSERT INTO admins (email, password_hash) VALUES (?, ?)`,
    [email, hash],
  );

  return {
    seeded: true,
    message: `Administrator yaradıldı: ${email}`,
    adminsCount: 1,
  };
}

/** Server start üçün — loqlar */
export async function seedAdminFromEnvIfEmpty(pool: Pool): Promise<void> {
  const r = await trySeedAdminFromEnv(pool);
  if (r.seeded) {
    console.log(`[admin] ${r.message}`);
    return;
  }
  if (r.adminsCount === 0) {
    console.warn(`[admin] ${r.message}`);
  }
}

export type LoginFailReason =
  | "no_admins"
  | "email_not_found"
  | "wrong_password"
  | "password_not_configured";

export type VerifyLoginResult =
  | { ok: true }
  | { ok: false; reason: LoginFailReason };

/** Cədvəl kiçik olduğu üçün müqayisə JS-də (Unicode + gizli simvollar üçün). */
export async function verifyAdminLogin(
  pool: Pool,
  emailNorm: string,
  passwordPlain: string,
): Promise<VerifyLoginResult> {
  const [rows] = await pool.execute<AdminPwdRow[]>(
    `SELECT email, password_hash FROM admins`,
  );

  if (rows.length === 0) {
    return { ok: false, reason: "no_admins" };
  }

  const match = rows.find(
    (r) => normalizeEmailForAuth(String(r.email)) === emailNorm,
  );

  if (!match) {
    return { ok: false, reason: "email_not_found" };
  }

  const hash =
    typeof match.password_hash === "string"
      ? match.password_hash.trim()
      : "";

  if (hash.length === 0) {
    return { ok: false, reason: "password_not_configured" };
  }

  const passwordOk = await bcrypt.compare(passwordPlain, match.password_hash);
  return passwordOk ? { ok: true } : { ok: false, reason: "wrong_password" };
}

export type ChangePasswordFailReason =
  | "not_found"
  | "wrong_password"
  | "password_not_configured"
  | "weak_password"
  | "same_as_current";

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: ChangePasswordFailReason };

const MIN_ADMIN_PASSWORD_LENGTH = 8;

/**
 * Cari şifrəni yoxlayıb bcrypt hash-i yenisi ilə əvəz edir.
 */
export async function updateAdminPassword(
  pool: Pool,
  emailNorm: string,
  currentPlain: string,
  newPlain: string,
): Promise<ChangePasswordResult> {
  if (typeof newPlain !== "string" || newPlain.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "weak_password" };
  }
  if (newPlain === currentPlain) {
    return { ok: false, reason: "same_as_current" };
  }

  const [rows] = await pool.execute<AdminPwdRow[]>(
    `SELECT email, password_hash FROM admins`,
  );

  const match = rows.find(
    (r) => normalizeEmailForAuth(String(r.email)) === emailNorm,
  );

  if (!match) {
    return { ok: false, reason: "not_found" };
  }

  const hash =
    typeof match.password_hash === "string"
      ? match.password_hash.trim()
      : "";

  if (!hash.length) {
    return { ok: false, reason: "password_not_configured" };
  }

  const currentOk = await bcrypt.compare(currentPlain, match.password_hash);
  if (!currentOk) {
    return { ok: false, reason: "wrong_password" };
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
  const nextHash = await bcrypt.hash(String(newPlain), rounds);
  await pool.execute(`UPDATE admins SET password_hash = ? WHERE email = ?`, [
    nextHash,
    match.email,
  ]);

  return { ok: true };
}

export type AdminEmailDiagnosticRow = {
  id: number;
  raw: string;
  normalized: string;
};

export async function listAdminEmailsForDiagnostic(
  pool: Pool,
): Promise<AdminEmailDiagnosticRow[]> {
  const [rows] = await pool.execute<
    (RowDataPacket & { id: number; email: string })[]
  >(`SELECT id, email FROM admins ORDER BY id`);
  return rows.map((r) => ({
    id: Number(r.id),
    raw: String(r.email),
    normalized: normalizeEmailForAuth(String(r.email)),
  }));
}

export async function verifyAdminCredentials(
  pool: Pool,
  emailNorm: string,
  passwordPlain: string,
): Promise<boolean> {
  const r = await verifyAdminLogin(pool, emailNorm, passwordPlain);
  return r.ok === true;
}

export interface AdminReplaceResult {
  ok: boolean;
  message: string;
}

/**
 * ADMIN_BOOTSTRAP_TOKEN ilə çağırılan “sərt bərpa”: bütün admins sətirlərini silib
 * yalnız .env-dəki ADMIN_EMAIL + bcrypt(ADMIN_PASSWORD) ilə tək admin yazır.
 */
export async function replaceAllAdminsFromEnv(
  pool: Pool,
): Promise<AdminReplaceResult> {
  const raw = process.env.ADMIN_EMAIL ?? "";
  const email = raw ? normalizeEmailForAuth(raw) : "";
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!email || !String(password).length) {
    return {
      ok: false,
      message:
        "ADMIN_EMAIL və ADMIN_PASSWORD .env-də təyin olunmalıdır (sinxron üçün)",
    };
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
  const hash = await bcrypt.hash(String(password), rounds);
  await ensureAdminsTable(pool);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(`DELETE FROM admins`);
    await conn.execute(
      `INSERT INTO admins (email, password_hash) VALUES (?, ?)`,
      [email, hash],
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return {
    ok: true,
    message: `admins bərpa olundu — giriş e-poçtu: ${email}`,
  };
}
