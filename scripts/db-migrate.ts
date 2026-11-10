// Aplica as migrations pendentes de db/migrations. Uso: npm run db:migrate
// Lê DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME do ambiente ou do arquivo .env.
// Em produção o servidor (server.js) já faz isso sozinho ao iniciar.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { dbConfigFromEnv, migrate } from "../db/migrate.mjs";

const envFile = join(import.meta.dirname, "..", ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const config = dbConfigFromEnv();
if (!config) {
  console.error("Defina DB_USER e DB_NAME (e DB_PASSWORD) no ambiente ou no arquivo .env.");
  process.exit(1);
}

const applied = await migrate(config);
console.log(applied.length ? `✓ ${applied.length} migration(s) aplicada(s).` : "✓ Banco já está atualizado.");
