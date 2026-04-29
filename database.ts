/**
 * MySQL connection pool (.env ilə konfiq). MYSQL_USER və MYSQL_DATABASE boşdursa bağlantı qurulmur.
 */
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getMysqlPool(): mysql.Pool | null {
  return pool;
}

/** Pool-u bir dəfə yaradır və ya null qaytarır. */
export function initMysqlPool(): mysql.Pool | null {
  const user = process.env.MYSQL_USER?.trim();
  const database = process.env.MYSQL_DATABASE?.trim();

  if (!user || !database) {
    console.log(
      "[mysql] MYSQL_USER / MYSQL_DATABASE təyin olunmayıb — MySQL bağlantısı aktiv deyil.",
    );
    return null;
  }

  if (pool) return pool;

  const host = process.env.MYSQL_HOST?.trim() || "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const password = process.env.MYSQL_PASSWORD ?? "";
  const connLimitRaw = Number(process.env.MYSQL_CONNECTION_LIMIT);
  const connectionLimit =
    Number.isFinite(connLimitRaw) && connLimitRaw > 0 ? connLimitRaw : 10;

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    enableKeepAlive: true,
    charset: "utf8mb4",
  });

  console.log(`[mysql] Pool: ${host}:${port} / ${database}`);
  return pool;
}

export async function pingMysql(): Promise<"ok" | "skipped" | "error"> {
  const p = getMysqlPool();
  if (!p) return "skipped";
  try {
    await p.query("SELECT 1 AS ping");
    return "ok";
  } catch (e) {
    console.error("[mysql] Ping xətası:", e);
    return "error";
  }
}
