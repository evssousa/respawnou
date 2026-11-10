// Aplica as migrations pendentes de db/migrations, em ordem.
// Uso: npm run db:migrate   (lê DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME do ambiente ou do .env)
//
// Cada arquivo NNN_nome.sql roda uma única vez; as aplicadas ficam em schema_migrations.
// Na Hostinger também dá para colar o SQL no phpMyAdmin, na mesma ordem.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { connect } from "./db-connect.ts";

const dir = join(import.meta.dirname, "..", "db", "migrations");
const conn = await connect({ multipleStatements: true });

await conn.query(
  "CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(50) NOT NULL PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
);
const [rows] = await conn.query("SELECT version FROM schema_migrations");
const applied = new Set((rows as { version: string }[]).map((r) => r.version));

const files = readdirSync(dir)
  .filter((f) => /^\d{3}_.+\.sql$/.test(f))
  .sort();

let count = 0;
for (const file of files) {
  const version = file.replace(/\.sql$/, "");
  if (applied.has(version)) continue;
  console.log(`→ aplicando ${file}`);
  await conn.query(readFileSync(join(dir, file), "utf8"));
  // A migration normalmente se registra sozinha; garante o registro caso não o faça.
  await conn.query("INSERT IGNORE INTO schema_migrations (version) VALUES (?)", [version]);
  count++;
}

console.log(count ? `✓ ${count} migration(s) aplicada(s).` : "✓ Banco já está atualizado.");
await conn.end();
