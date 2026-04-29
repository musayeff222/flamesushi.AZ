/**
 * MySQL connection pool (.env ilə konfiq). MYSQL_USER və MYSQL_DATABASE boşdursa bağlantı qurulmur.
 */
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export type MysqlPingStatus = "ok" | "skipped" | "error";

export interface MysqlPingDetail {
  mysql: MysqlPingStatus;
  /** MySQL / Node kodu — diaqnostika üçün (məs: ER_ACCESS_DENIED_ERROR, ECONNREFUSED) */
  mysqlCode?: string;
  mysqlHint?: string;
}

export function getMysqlPool(): mysql.Pool | null {
  return pool;
}

function connectTimeoutMs(): number {
  const n = Number(process.env.MYSQL_CONNECT_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 15_000;
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

  const sslMode = process.env.MYSQL_SSL?.trim()?.toLowerCase();
  /** Uzaq MariaDB/MySQL üçün TLS — Hostinger “Remote MySQL” bəzən bunu istəyir */
  const sslEnabled = sslMode === "true" || sslMode === "1" || sslMode === "yes";
  const ssl =
    sslEnabled ?
      (
        process.env.MYSQL_SSL_INSECURE === "true"
          /** Bəzi paylaşılmış hostlarında öz imzalı sertifikat — yalnız problemlə mübarizədə */
          ? { rejectUnauthorized: false }
          : {}
      )
    : undefined;

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
    connectTimeout: connectTimeoutMs(),
    ...(ssl !== undefined ? { ssl } : {}),
  });

  console.log(`[mysql] Pool: ${host}:${port} / ${database}${sslEnabled ? " (SSL)" : ""}`);
  return pool;
}

/** Təkcə köhnə yoxlama üçün — `pingMysqlDetail` üstündür. */
export async function pingMysql(): Promise<MysqlPingStatus> {
  const d = await pingMysqlDetail();
  return d.mysql;
}

function sanitizeMysqlHint(msg: string): string {
  return msg
    .replace(/pwd=[^\s;)]+/gi, "pwd=***")
    .replace(/password[^\s;=]+=[^\s;)]+/gi, "password=***")
    .slice(0, 220);
}

export async function pingMysqlDetail(): Promise<MysqlPingDetail> {
  const p = getMysqlPool();
  if (!p) {
    return { mysql: "skipped" };
  }
  try {
    await p.query("SELECT 1 AS ping");
    return { mysql: "ok" };
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException & { code?: string; errno?: number; sqlMessage?: string };
    const mysqlCode =
      err.code ??
      (typeof err.errno === "number" ? String(err.errno) : "UNKNOWN");
    const rawMsg =
      err.sqlMessage ??
      err.message ??
      (typeof e === "object" && e !== null && "message" in e
        ? String((e as Error).message)
        : String(e));
    const hint = sanitizeMysqlHint(rawMsg);
    console.error("[mysql] Ping xətası:", mysqlCode, hint);
    return {
      mysql: "error",
      mysqlCode,
      mysqlHint: hint,
    };
  }
}
