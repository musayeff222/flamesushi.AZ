import type { Pool, RowDataPacket } from "mysql2/promise";
import bcrypt from "bcryptjs";

interface AdminPwdRow extends RowDataPacket {
  password_hash: string;
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
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
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

export type LoginFailReason = "no_admins" | "email_not_found" | "wrong_password";

export type VerifyLoginResult =
  | { ok: true }
  | { ok: false; reason: LoginFailReason };

/** Giriş üçün dəqiq səbəb — 401 mesajları üçün */
export async function verifyAdminLogin(
  pool: Pool,
  emailNorm: string,
  passwordPlain: string,
): Promise<VerifyLoginResult> {
  const [rows] = await pool.execute<AdminPwdRow[]>(
    `SELECT password_hash FROM admins WHERE email = ? LIMIT 1`,
    [emailNorm],
  );
  const row = rows[0];
  if (row?.password_hash) {
    const match = await bcrypt.compare(passwordPlain, row.password_hash);
    return match ? { ok: true } : { ok: false, reason: "wrong_password" };
  }

  const [cntRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM admins`,
    [],
  );
  const raw = cntRows[0]?.cnt;
  const n = typeof raw === "bigint" ? Number(raw) : Number(raw ?? 0);
  if (n === 0) return { ok: false, reason: "no_admins" };
  return { ok: false, reason: "email_not_found" };
}

export async function verifyAdminCredentials(
  pool: Pool,
  emailNorm: string,
  passwordPlain: string,
): Promise<boolean> {
  const r = await verifyAdminLogin(pool, emailNorm, passwordPlain);
  return r.ok === true;
}
