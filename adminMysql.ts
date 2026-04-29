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

/** .env dəki ADMIN_EMAIL + ADMIN_PASSWORD ilə bir admin yoxdursa əlavə edir (ilk qurulum). */
export async function seedAdminFromEnvIfEmpty(pool: Pool): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM admins`,
    [],
  );
  const cnt = rows[0]?.cnt;
  const n = typeof cnt === "bigint" ? Number(cnt) : Number(cnt ?? 0);
  if (n > 0) return;

  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
  const hash = await bcrypt.hash(password, rounds);
  await pool.execute(
    `INSERT INTO admins (email, password_hash) VALUES (?, ?)`,
    [email, hash],
  );
  console.log(`[admin] İlkin administrator yaradıldı: ${email}`);
}

export async function verifyAdminCredentials(
  pool: Pool,
  emailNorm: string,
  passwordPlain: string,
): Promise<boolean> {
  const [rows] = await pool.execute<AdminPwdRow[]>(
    `SELECT password_hash FROM admins WHERE email = ? LIMIT 1`,
    [emailNorm],
  );
  const row = rows[0];
  if (!row?.password_hash) return false;
  return bcrypt.compare(passwordPlain, row.password_hash);
}
