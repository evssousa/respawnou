// Conexão com o MySQL. Só roda no servidor.
//
// Na Hostinger o banco fica no mesmo servidor do site: conectar em 127.0.0.1:3306
// (não em "localhost", que pode resolver para IPv6, nem no host srvNNNN.hstgr.io).
// Sem DB_NAME definido, o site usa os dados de exemplo (mock-data.ts).
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

export const hasDatabase = () => Boolean(process.env.DB_NAME && process.env.DB_USER);

let pool: Pool | undefined;

export function db(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: Number(process.env.DB_POOL || 5),
      charset: "utf8mb4",
      timezone: "Z", // DATETIME gravado e lido sempre em UTC
      dateStrings: true,
      waitForConnections: true,
    });
  }
  return pool;
}

/** SELECT tipado: devolve as linhas como `T[]`. */
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await db().query<RowDataPacket[]>(sql, params);
  return rows as T[];
}

/** No MariaDB, colunas JSON chegam como texto; no MySQL 8, como objeto. */
export function json<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

/** "2026-11-10 14:30:00" (UTC, como vem do banco) → ISO "2026-11-10T14:30:00Z". */
export function iso(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value.length === 10 ? value : `${value.replace(" ", "T")}Z`;
}
