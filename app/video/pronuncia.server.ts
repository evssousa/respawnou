// Dicionário de pronúncia do dono (settings.video_pronuncia). Só no servidor. A base da marca fica em app/marca.ts.
import { exec, query } from "./db";
import { type ItemPronuncia, juntarDicionario, limparItens } from "./pronuncia";

export async function lerPronuncia(): Promise<ItemPronuncia[]> {
  const [r] = await query<{ value: unknown }>("SELECT value FROM settings WHERE name = 'video_pronuncia'");
  let v: unknown = r?.value;
  try {
    if (typeof v === "string") v = JSON.parse(v);
  } catch {
    return [];
  }
  return limparItens((v as { itens?: unknown } | null)?.itens);
}

export async function salvarPronuncia(itens: unknown): Promise<ItemPronuncia[]> {
  const limpos = limparItens(itens);
  await exec("INSERT INTO settings (name, value) VALUES ('video_pronuncia', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [JSON.stringify({ itens: limpos })]);
  return limpos;
}

/** Base + do dono, na ordem usada pelo gerador. */
export async function dicionarioCompleto(): Promise<ItemPronuncia[]> {
  return juntarDicionario(await lerPronuncia());
}
