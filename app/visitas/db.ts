// Ponte com o banco do site (ESPECÍFICO DO SITE: ao copiar o módulo, ajuste estas poucas linhas).
import type { ResultSetHeader } from "mysql2/promise";
import { db } from "~/lib/db.server";

export { hasDatabase, query } from "~/lib/db.server";

/** INSERT/UPDATE/DELETE: devolve as linhas afetadas. */
export async function exec(sql: string, params: unknown[] = []) {
  const [res] = await db().query<ResultSetHeader>(sql, params);
  return { affected: res.affectedRows, insertId: res.insertId };
}
