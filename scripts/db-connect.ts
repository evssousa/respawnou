// Conexão usada pelos scripts de linha de comando (migrate, seed).
// Lê as variáveis do ambiente; se existir um arquivo .env na raiz, carrega dele antes.
import { existsSync } from "node:fs";
import { join } from "node:path";
import mysql, { type ConnectionOptions } from "mysql2/promise";

const envFile = join(import.meta.dirname, "..", ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

export async function connect(extra: ConnectionOptions = {}) {
  const { DB_HOST = "127.0.0.1", DB_PORT = "3306", DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_USER || !DB_NAME) {
    console.error("Defina DB_USER e DB_NAME (e DB_PASSWORD) no ambiente ou no arquivo .env.");
    process.exit(1);
  }
  return mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: "utf8mb4",
    timezone: "Z",
    ...extra,
  });
}
