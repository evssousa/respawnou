// Sal diário do código de visitante: um valor aleatório que muda a cada dia (de Brasília) e é apagado ao virar o dia.
// Sem o sal de ontem, os códigos de ontem não voltam a ser ligados a ninguém. Fica em settings, como texto.
import { randomBytes } from "node:crypto";
import { exec, query } from "../db";

let cache: { dia: string; sal: string } | null = null;

function ler(valor: unknown): { dia: string; sal: string } | null {
  try {
    const v = typeof valor === "string" ? JSON.parse(valor) : valor;
    return v && typeof v === "object" && typeof (v as { dia?: unknown }).dia === "string" && typeof (v as { sal?: unknown }).sal === "string" ? (v as { dia: string; sal: string }) : null;
  } catch {
    return null;
  }
}

/** O sal de `dia`. Se o guardado é de outro dia, troca (só uma vez, mesmo com vários processos) e devolve o novo. */
export async function salDoDia(dia: string): Promise<string> {
  if (cache?.dia === dia) return cache.sal;
  let atual = ler((await query<{ value: unknown }>("SELECT value FROM settings WHERE name = 'visitas.sal'"))[0]?.value);
  if (atual?.dia !== dia) {
    const novo = JSON.stringify({ dia, sal: randomBytes(32).toString("hex") });
    // Se outro processo já gravou o sal de hoje entre a leitura e a escrita, mantém o dele.
    await exec(
      "INSERT INTO settings (name, value) VALUES ('visitas.sal', ?) ON DUPLICATE KEY UPDATE value = IF(JSON_UNQUOTE(JSON_EXTRACT(value, '$.dia')) = ?, value, VALUES(value))",
      [novo, dia],
    );
    atual = ler((await query<{ value: unknown }>("SELECT value FROM settings WHERE name = 'visitas.sal'"))[0]?.value);
  }
  if (!atual) throw new Error("sal de visitas indisponível");
  cache = atual;
  return atual.sal;
}

/** Só para os testes. */
export function esquecerSal() {
  cache = null;
}
