// Aplica as migrations pendentes de db/migrations (NNN_nome.sql), em ordem.
// Usado pelo servidor ao iniciar (server.js) e pelo comando `npm run db:migrate`.
// Em JavaScript puro para rodar em produção sem etapa de build.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import mysql from "mysql2/promise";

const DIR = join(import.meta.dirname, "migrations");

export function dbConfigFromEnv(env = process.env) {
  if (!env.DB_NAME || !env.DB_USER) return null;
  return {
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: "utf8mb4",
    timezone: "Z",
  };
}

/** Retorna a lista de versões aplicadas nesta execução. */
export async function migrate(config, log = console.log) {
  const conn = await mysql.createConnection({ ...config, multipleStatements: true });
  try {
    await conn.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(50) NOT NULL PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    );
    const [rows] = await conn.query("SELECT version FROM schema_migrations");
    const done = new Set(rows.map((r) => r.version));
    const files = readdirSync(DIR)
      .filter((f) => /^\d{3}_.+\.sql$/.test(f))
      .sort();
    const applied = [];
    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      if (done.has(version)) continue;
      log(`[migrate] aplicando ${file}`);
      await conn.query(readFileSync(join(DIR, file), "utf8"));
      await conn.query("INSERT IGNORE INTO schema_migrations (version) VALUES (?)", [version]);
      applied.push(version);
    }
    return applied;
  } finally {
    await conn.end();
  }
}
