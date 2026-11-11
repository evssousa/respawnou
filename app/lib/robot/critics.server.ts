// Consenso da crítica (editoria Reviews). O Respawnou não publica review própria: reúne as análises
// com nota dos veículos que já lemos, calcula a média e resume o que foi elogiado e criticado.
// Regras públicas: /como-avaliamos (app/routes/review-policy.tsx).
//
// Coleta: análises dos feeds (título com "review") → a nota vem do JSON-LD da própria página
// (schema.org Review.reviewRating), nunca de adivinhação. Só jogos (filmes, séries e hardware saem).
import { createHash } from "node:crypto";
import { db, query } from "../db.server.ts";
import { emptyMedia, mergeMedia, type SourceMedia } from "./media.ts";
import { fetchArticle, fetchText } from "./rss.server.ts";
import type { Review } from "../types.ts";
import type { PreparedSources, Source } from "./writer.server.ts";

/** Mínimo de veículos com nota para publicar o consenso (também citado em /como-avaliamos). */
export const MIN_CRITICS = 4;
/** Janela em que análises do mesmo jogo contam juntas. */
const WINDOW_DAYS = 30;

// ───────────── Reconhecer a análise ─────────────

/** O título é de uma análise? ("X review", "Review: X"), sem as notícias sobre reviews. */
export function looksLikeReview(title: string) {
  if (!/\breview\b/i.test(title)) return false;
  return !/\breview(s)? (bomb|bombing|score|scores|backlog|queue|embargo|roundup|round-up|crew|in progress)\b|\breviews? (are|is) in\b|\bwhat will review\b|\bsteam reviews?\b|\buser reviews?\b/i.test(
    title,
  );
}

/** "Forza Horizon 6 review - The driving..." → "Forza Horizon 6"; "Review: Metaphor (Switch 2) - ..." → "Metaphor (Switch 2)". */
export function gameNameFromTitle(title: string) {
  const t = title.trim();
  const prefix = /^(?:(?:mini|quick|hardware)\s+)?review\s*:\s*/i;
  const name = prefix.test(t) ? t.replace(prefix, "").split(/\s[-–—|]\s/)[0] : t.split(/\s+review\b/i)[0];
  return name.replace(/^["'“‘]|["'”’]$/g, "").trim();
}

const ROMAN: Record<string, string> = { ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };

/** Chave que agrupa o mesmo jogo entre veículos: sem acento, parênteses, ™ e com números romanos em arábicos. */
export function gameKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[™®©]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => ROMAN[w] ?? w)
    .join(" ");
}

export interface ParsedRating {
  rating: number;
  best: number;
  itemType: string | null;
  itemName: string | null;
  platforms: string[];
  author: string | null;
}

/** Primeira Review com reviewRating no JSON-LD da página. */
export function parseRating(html: string): ParsedRating | null {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const stack: unknown[] = [data];
    while (stack.length) {
      const x = stack.pop();
      if (!x || typeof x !== "object") continue;
      if (Array.isArray(x)) {
        stack.push(...x);
        continue;
      }
      const o = x as Record<string, unknown>;
      const rr = o.reviewRating as Record<string, unknown> | undefined;
      if (rr && rr.ratingValue != null) {
        const rating = Number(rr.ratingValue);
        const best = Number(rr.bestRating ?? 5); // schema.org: bestRating padrão é 5
        if (!Number.isFinite(rating) || !Number.isFinite(best) || best <= 0 || rating < 0 || rating > best) return null;
        const item = (o.itemReviewed ?? {}) as Record<string, unknown>;
        const type = Array.isArray(item["@type"]) ? String(item["@type"][0]) : item["@type"] ? String(item["@type"]) : null;
        const gp = item.gamePlatform;
        const author = Array.isArray(o.author) ? (o.author[0] as Record<string, unknown>)?.name : (o.author as Record<string, unknown>)?.name;
        return {
          rating,
          best,
          itemType: type,
          itemName: typeof item.name === "string" ? item.name : null,
          platforms: Array.isArray(gp) ? gp.map(String) : typeof gp === "string" && gp ? [gp] : [],
          author: typeof author === "string" ? author : null,
        };
      }
      for (const v of Object.values(o)) if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

/** É análise de jogo? Usa o tipo do item avaliado; sem ele, o endereço (/games/ sim, hardware não). */
export function isGameReview(r: ParsedRating, url: string) {
  // VideoGame (Game Informer, VG247, Eurogamer) ou Game (IGN).
  if (r.itemType) return r.itemType === "VideoGame" || r.itemType === "Game";
  const path = new URL(url).pathname.toLowerCase();
  return /\/games?\//.test(path) && !/hardware|\/tech\/|\/tv\/|\/movies?\/|\/entertainment\//.test(path);
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const sqlDate = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

/** Lê a análise e grava a nota. Devolve o motivo quando não aproveita (para o registro da fila). */
export async function recordReview(r: { feedId: number; feedName: string; title: string; url: string; publishedAt: Date }): Promise<{ ok: boolean; reason: string }> {
  let html: string;
  try {
    html = await fetchText(r.url, 20000);
  } catch (err) {
    return { ok: false, reason: `análise: página indisponível (${err instanceof Error ? err.message : err})` };
  }
  const parsed = parseRating(html);
  if (!parsed) return { ok: false, reason: "análise sem nota na página" };
  if (!isGameReview(parsed, r.url)) return { ok: false, reason: `análise de ${parsed.itemType ?? "algo que não é jogo"}` };
  const name = gameNameFromTitle(r.title) || parsed.itemName || "";
  const key = gameKey(name);
  if (key.length < 2) return { ok: false, reason: "análise sem nome de jogo reconhecível" };
  const outlet = r.feedName.split(" · ")[0];
  const score10 = Math.round((parsed.rating / parsed.best) * 1000) / 100;
  await db().query(
    `INSERT IGNORE INTO critic_reviews (feed_id, outlet, url, url_hash, title, game_name, game_key, item_name, platforms, rating, best, score10, author, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.feedId,
      outlet,
      r.url.slice(0, 600),
      hash(r.url),
      r.title.slice(0, 400),
      name.slice(0, 200),
      key.slice(0, 200),
      parsed.itemName?.slice(0, 200) ?? null,
      JSON.stringify(parsed.platforms),
      parsed.rating,
      parsed.best,
      score10,
      parsed.author?.slice(0, 160) ?? null,
      sqlDate(r.publishedAt),
    ],
  );
  return { ok: true, reason: `análise com nota (${parsed.rating}/${parsed.best}) → consenso da crítica de ${name}` };
}

// ───────────── Agrupar e calcular ─────────────

export interface CriticRow {
  outlet: string;
  url: string;
  title: string;
  game_name: string;
  rating: number;
  best: number;
  score10: number;
  platforms: unknown;
  published_at: string;
}

/** Análises do jogo, uma por veículo (a mais recente). */
export async function reviewsFor(key: string): Promise<CriticRow[]> {
  const rows = await query<CriticRow>(
    `SELECT outlet, url, title, game_name, rating, best, score10, platforms, published_at FROM critic_reviews
     WHERE game_key = ? AND published_at > UTC_TIMESTAMP() - INTERVAL ${WINDOW_DAYS} DAY ORDER BY published_at DESC`,
    [key],
  );
  const byOutlet = new Map<string, CriticRow>();
  for (const r of rows) if (!byOutlet.has(r.outlet)) byOutlet.set(r.outlet, { ...r, rating: Number(r.rating), best: Number(r.best), score10: Number(r.score10) });
  return [...byOutlet.values()];
}

const fmtScore = (n: number) => Math.round(n * 10) / 10;

/** Média e lista de veículos (a parte numérica do consenso é sempre calculada aqui, nunca pela IA). */
export function consensusNumbers(rows: CriticRow[]) {
  const avg = rows.reduce((s, r) => s + r.score10, 0) / rows.length;
  return {
    score: fmtScore(avg),
    critics: rows.map((r) => ({ outlet: r.outlet, score: fmtScore(r.score10), url: r.url })).sort((a, b) => b.score - a.score || a.outlet.localeCompare(b.outlet)),
  };
}

/** Nome mais usado entre os veículos (empate: o mais curto). */
function displayName(rows: CriticRow[]) {
  const count = new Map<string, number>();
  for (const r of rows) count.set(r.game_name, (count.get(r.game_name) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];
}

export interface ConsensusCandidate {
  key: string;
  name: string;
  rows: CriticRow[];
}

/**
 * Jogo com análises suficientes e sem consenso publicado. Tentativa que falhou só volta a ser
 * tentada quando chegam pelo menos 2 análises novas.
 */
export async function consensusCandidate(forceKey?: string): Promise<ConsensusCandidate | null> {
  // Teste (dry): um jogo específico, mesmo abaixo do mínimo (precisa de 2 análises).
  if (forceKey) {
    const rows = await reviewsFor(gameKey(forceKey));
    return rows.length >= 2 ? { key: gameKey(forceKey), name: displayName(rows), rows } : null;
  }
  const groups = await query<{ game_key: string; n: number; status: string | null; critics: number | null }>(
    `SELECT r.game_key, COUNT(DISTINCT r.outlet) AS n, c.status, c.critics FROM critic_reviews r
     LEFT JOIN critic_consensus c ON c.game_key = r.game_key
     WHERE r.published_at > UTC_TIMESTAMP() - INTERVAL ${WINDOW_DAYS} DAY
     GROUP BY r.game_key, c.status, c.critics
     HAVING n >= ? ORDER BY n DESC, MIN(r.published_at)`,
    [MIN_CRITICS],
  );
  for (const g of groups) {
    const n = Number(g.n);
    if (g.status === "used") continue;
    if (g.status && n < Number(g.critics ?? 0) + 2) continue;
    const rows = await reviewsFor(g.game_key);
    if (rows.length >= MIN_CRITICS) return { key: g.game_key, name: displayName(rows), rows };
  }
  return null;
}

export async function markConsensus(c: ConsensusCandidate, status: "used" | "skipped" | "failed", note: string | null, postId?: number) {
  await db().query(
    `INSERT INTO critic_consensus (game_key, game_name, post_id, status, note, critics) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE game_name = VALUES(game_name), post_id = VALUES(post_id), status = VALUES(status), note = VALUES(note), critics = VALUES(critics)`,
    [c.key, c.name.slice(0, 200), postId ?? null, status, note?.slice(0, 500) ?? null, c.rows.length],
  );
}

/**
 * Análises que chegaram depois da publicação: recalcula a média e a lista de veículos do post
 * (o texto fica como está; ele não cita a média nem o número de análises).
 */
export async function refreshPublishedConsensus() {
  const pubs = await query<{ game_key: string; post_id: number; critics: number; review: unknown }>(
    `SELECT c.game_key, c.post_id, c.critics, p.review FROM critic_consensus c JOIN posts p ON p.id = c.post_id
     WHERE c.status = 'used' AND p.published_at > UTC_TIMESTAMP() - INTERVAL ${WINDOW_DAYS} DAY`,
  );
  let updated = 0;
  for (const p of pubs) {
    const rows = await reviewsFor(p.game_key);
    if (rows.length <= Number(p.critics)) continue;
    const current = (typeof p.review === "string" ? JSON.parse(p.review) : p.review) as Review | null;
    if (!current) continue;
    const nums = consensusNumbers(rows);
    await db().query("UPDATE posts SET review = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [JSON.stringify({ ...current, ...nums }), p.post_id]);
    await db().query("UPDATE critic_consensus SET critics = ? WHERE game_key = ?", [rows.length, p.game_key]);
    updated++;
  }
  return updated;
}

// ───────────── Fontes da matéria ─────────────

export const CONSENSUS_SCHEMA = {
  properties: {
    verdict: { type: "STRING", description: "o consenso da crítica em UMA frase de 40 a 140 caracteres, sem citar a nota média" },
    pros: { type: "ARRAY", items: { type: "STRING" }, description: "3 a 5 pontos mais elogiados, cada um com até 90 caracteres, apoiados por pelo menos uma análise" },
    cons: { type: "ARRAY", items: { type: "STRING" }, description: "2 a 5 pontos mais criticados, cada um com até 90 caracteres, apoiados por pelo menos uma análise" },
  },
  required: ["verdict", "pros", "cons"],
};

export function checkConsensusExtra(raw: Record<string, unknown>) {
  const issues: string[] = [];
  const verdict = String(raw.verdict ?? "");
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String).filter((s) => s.trim()) : []);
  const pros = list(raw.pros);
  const cons = list(raw.cons);
  if (verdict.length < 40 || verdict.length > 140) issues.push(`verdict deve ter de 40 a 140 caracteres (tem ${verdict.length})`);
  if (/\d+[,.]\d|\bnota m[eé]dia\b|\bm[eé]dia\b/i.test(verdict)) issues.push("verdict não pode citar nota ou média (o número aparece no quadro)");
  if (pros.length < 3 || pros.length > 5) issues.push(`pros: de 3 a 5 itens (tem ${pros.length})`);
  if (cons.length < 2 || cons.length > 5) issues.push(`cons: de 2 a 5 itens (tem ${cons.length})`);
  if ([...pros, ...cons].some((s) => s.length > 90)) issues.push("cada item de pros/cons deve ter no máximo 90 caracteres");
  return issues;
}

/** Monta as fontes: o texto de cada análise (com a nota do veículo) e a mídia das páginas. */
export async function consensusSources(c: ConsensusCandidate): Promise<PreparedSources & { usable: number }> {
  const sources: Source[] = [];
  const medias: SourceMedia[] = [];
  // Até 6 análises, das mais recentes; cada uma entra com no máximo 900 palavras.
  for (const r of c.rows.slice(0, 6)) {
    const page = await fetchArticle(r.url);
    const text = page.text.split(/\s+/).slice(0, 900).join(" ");
    if (text.split(/\s+/).length < 150) continue;
    sources.push({
      name: r.outlet,
      title: r.title,
      url: r.url,
      date: new Date(r.published_at).toISOString(),
      text: `Nota dada por ${r.outlet}: ${r.rating} de ${r.best}.\n\n${text}`,
    });
    const media = page.media;
    media.images = media.images.map((i) => ({ ...i, source: r.outlet }));
    media.videos = []; // trailer vem do YouTube oficial, não de vídeo de review
    medias.push(media);
  }
  const brief = `PAUTA APROVADA PELA EDITORIA (publish=true): CONSENSO DA CRÍTICA sobre ${c.name}. Editoria: reviews.
O Respawnou NÃO jogou o jogo e NÃO dá opinião própria. As fontes são análises de outros veículos, cada uma com a nota que o veículo deu.
REGRAS DESTA PAUTA:
- Atribua toda opinião ao veículo ("para a IGN", "segundo o Eurogamer", "a Game Informer elogiou"). Nunca escreva "nós jogamos", "nossa análise", "na nossa opinião".
- NÃO cite a nota média nem quantas análises foram reunidas: esses números aparecem num quadro calculado pelo site. Pode citar a nota de um veículo específico.
- title: nome do jogo + que é a opinião da crítica (ex.: "${c.name}: o que a crítica achou"); focusKeyword = nome do jogo.
- Lide: o que é o jogo (gênero, estúdio, plataformas, se as fontes disserem) e o tom geral da recepção.
- h2 sobre o que a crítica mais elogiou e h2 sobre o que mais criticou, com detalhes concretos e atribuídos; quando os veículos discordam, diga quem pensa o quê.
- Se as análises tratarem de versões/plataformas diferentes ou de desempenho, explique.
- verdict, pros e cons: o resumo do quadro, só com pontos que aparecem nas análises.
- Links externos: as análises originais.`;
  return { sources, media: mergeMedia(emptyMedia(), ...medias), brief, extraSchema: CONSENSUS_SCHEMA, extraCheck: checkConsensusExtra, usable: sources.length };
}
