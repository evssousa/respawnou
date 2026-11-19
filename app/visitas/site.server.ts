// Títulos das páginas do painel (ESPECÍFICO DO SITE): o endereço vira o nome do conteúdo (matéria, jogo, jogo do Arcade...).
import { createHash } from "node:crypto";
import { ARCADE_GAMES } from "~/lib/arcade";
import { cachedTitulos } from "./cache";
import { VISITAS } from "./config";
import { query } from "./db";
import { PLATFORMS } from "~/lib/site";

type Item = { path: string; kind: string };
const unicos = <T,>(l: T[]) => [...new Set(l)];

/** Títulos por endereço. O que não for achado (matéria apagada, jogo sem ficha) fica de fora: o painel mostra o endereço. */
export async function titulos(itens: Item[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const arcade = new Map(ARCADE_GAMES.map((g) => [`/arcade/${g.slug}`, `Arcade: ${g.name}`]));
  const plataformas = new Map(PLATFORMS.map((p) => [`/plataforma/${p.slug}`, p.label]));
  for (const i of itens) {
    const t = VISITAS.fixos[i.path] ?? arcade.get(i.path) ?? plataformas.get(i.path);
    if (t) out.set(i.path, t);
  }
  const resto = itens.filter((i) => !out.has(i.path));
  if (!resto.length) return out;
  const chave = createHash("sha1").update(resto.map((i) => i.path).sort().join("\n")).digest("hex");
  const achados = await cachedTitulos(`visitas:titulos:${chave}`, async () => {
    const m = new Map<string, string>();
    const seg = (p: string, n: number) => p.split("/")[n] ?? "";
    const materias = resto.filter((i) => i.kind === "materia").map((i) => i.path);
    if (materias.length) {
      const slugs = unicos(materias.map((p) => seg(p, 2))).filter(Boolean);
      const rows = await query<{ s: string; k: string; t: string }>(`SELECT section AS s, slug AS k, title AS t FROM posts WHERE slug IN (${slugs.map(() => "?").join(",")})`, slugs);
      const mapa = new Map(rows.map((r) => [`/${r.s}/${r.k}`, r.t]));
      for (const p of materias) if (mapa.has(p)) m.set(p, mapa.get(p)!);
    }
    const jogos = resto.filter((i) => i.kind === "jogo").map((i) => i.path);
    if (jogos.length) {
      const slugs = unicos(jogos.map((p) => seg(p, 2))).filter(Boolean);
      const rows = await query<{ k: string; t: string }>(`SELECT slug AS k, name AS t FROM games WHERE slug IN (${slugs.map(() => "?").join(",")})`, slugs);
      const mapa = new Map(rows.map((r) => [`/jogos/${r.k}`, r.t]));
      for (const p of jogos) if (mapa.has(p)) m.set(p, mapa.get(p)!);
    }
    return m;
  });
  for (const [k, v] of achados) out.set(k, v);
  return out;
}
