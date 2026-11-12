// Jogos e lançamentos (IGDB, da Twitch). Preenche a tabela games: calendário de lançamentos,
// contagem regressiva da home, fichas /jogos/:slug e o artigo "Lançamentos do mês".
//
// Acesso: IGDB_CLIENT_ID e IGDB_CLIENT_SECRET (app em dev.twitch.tv). Token client_credentials,
// guardado em memória até perto de vencer. Limite da API: 4 requisições por segundo (usamos 1–2).
// Termos: grátis também para uso comercial; projetos com anúncios entram no programa de parceria,
// que pede crédito visível ao IGDB.com (o site mostra "Dados: IGDB.com"). Ver docs/adsense.md.
import { db, query } from "../db.server.ts";
import type { PlatformSlug } from "../site.ts";
import { generateJson } from "./gemini.server.ts";
import { slugify } from "./text.ts";

// ───────────── Acesso ─────────────

let token: { value: string; until: number } | undefined;

export const igdbConfigured = () => Boolean(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET);

async function accessToken() {
  if (token && Date.now() < token.until) return token.value;
  const params = new URLSearchParams({
    client_id: process.env.IGDB_CLIENT_ID ?? "",
    client_secret: process.env.IGDB_CLIENT_SECRET ?? "",
    grant_type: "client_credentials",
  });
  const res = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, { method: "POST", signal: AbortSignal.timeout(15_000) });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; message?: string };
  if (!res.ok || !body.access_token) throw new Error(`Twitch recusou o acesso ao IGDB (HTTP ${res.status}: ${body.message ?? "sem detalhes"})`);
  token = { value: body.access_token, until: Date.now() + Math.max(60, (body.expires_in ?? 3600) - 3600) * 1000 };
  return token.value;
}

export async function igdb<T>(endpoint: string, body: string): Promise<T> {
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: { "Client-ID": process.env.IGDB_CLIENT_ID ?? "", Authorization: `Bearer ${await accessToken()}`, Accept: "application/json" },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`IGDB ${endpoint} HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

/** Diagnóstico: o acesso funciona? (para /api/cron/diag) */
export async function igdbCheck() {
  if (!igdbConfigured()) return { configured: false };
  try {
    const rows = await igdb<{ name: string }[]>("games", "fields name; where hypes > 0; sort hypes desc; limit 1;");
    return { configured: true, ok: true, sample: rows[0]?.name ?? null };
  } catch (err) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message.slice(0, 300) : String(err) };
  }
}

// ───────────── Tradução dos dados ─────────────

/** Plataformas do IGDB que o site cobre. */
const PLATFORM_MAP: Record<number, PlatformSlug> = {
  6: "pc", // PC (Windows)
  48: "playstation", // PS4
  167: "playstation", // PS5
  49: "xbox", // Xbox One
  169: "xbox", // Xbox Series X|S
  130: "switch", // Switch
  508: "switch", // Switch 2
  34: "mobile", // Android
  39: "mobile", // iOS
};

const GENRES_PT: Record<string, string> = {
  Shooter: "Tiro",
  "Role-playing (RPG)": "RPG",
  Adventure: "Aventura",
  Platform: "Plataforma",
  Strategy: "Estratégia",
  "Real Time Strategy (RTS)": "Estratégia em tempo real",
  "Turn-based strategy (TBS)": "Estratégia por turnos",
  Tactical: "Tático",
  Simulator: "Simulação",
  Sport: "Esporte",
  Racing: "Corrida",
  Fighting: "Luta",
  Puzzle: "Quebra-cabeça",
  Indie: "Indie",
  Arcade: "Arcade",
  "Hack and slash/Beat 'em up": "Hack and slash",
  Music: "Música",
  "Visual Novel": "Visual novel",
  "Card & Board Game": "Cartas e tabuleiro",
  MOBA: "MOBA",
  "Point-and-click": "Point-and-click",
  "Quiz/Trivia": "Quiz",
  Pinball: "Pinball",
};

/** Tipos de jogo aceitos: principal, expansão, expansão independente, remake, remaster, edição expandida. */
const GAME_TYPES = new Set([0, 2, 4, 8, 9, 10]);

interface IgdbGame {
  id: number;
  name: string;
  slug: string;
  url?: string;
  summary?: string;
  hypes?: number;
  first_release_date?: number;
  game_type?: number;
  category?: number;
  platforms?: number[];
  genres?: { name: string }[];
  cover?: { image_id: string };
  artworks?: { image_id: string }[];
  screenshots?: { image_id: string }[];
  videos?: { video_id: string; name?: string }[];
  involved_companies?: { developer?: boolean; publisher?: boolean; company?: { name: string } }[];
  release_dates?: { date?: number; platform?: number; human?: string; date_format?: number; category?: number }[];
}

const img = (size: string, id: string) => `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg`;
const ymd = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);

/** Data exata (dia) nas plataformas do site; senão o rótulo impreciso ("Q4 2027" → "4º tri. de 2027"). */
function releaseOf(g: IgdbGame) {
  const ours = (g.release_dates ?? []).filter((r) => r.platform != null && PLATFORM_MAP[r.platform] && r.date);
  const exact = ours.filter((r) => (r.date_format ?? r.category) === 0 || /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(r.human ?? ""));
  if (exact.length) return { date: ymd(Math.min(...exact.map((r) => r.date!))), label: null };
  const any = ours.sort((a, b) => a.date! - b.date!)[0];
  const human = any?.human ?? "";
  const q = human.match(/^Q([1-4]) (\d{4})$/);
  const m = human.match(/^([A-Z][a-z]{2}) (\d{4})$/);
  const months: Record<string, string> = { Jan: "jan.", Feb: "fev.", Mar: "mar.", Apr: "abr.", May: "maio", Jun: "jun.", Jul: "jul.", Aug: "ago.", Sep: "set.", Oct: "out.", Nov: "nov.", Dec: "dez." };
  const label = q ? `${q[1]}º tri. de ${q[2]}` : m ? `${months[m[1]] ?? m[1]} de ${m[2]}` : /^\d{4}$/.test(human) ? human : human === "TBD" ? "sem data" : null;
  return { date: null, label };
}

function trailerOf(g: IgdbGame) {
  const vids = g.videos ?? [];
  return (vids.find((v) => /launch|release/i.test(v.name ?? "")) ?? vids.find((v) => /trailer/i.test(v.name ?? "")) ?? vids[0])?.video_id ?? null;
}

// ───────────── Sincronizar ─────────────

const FIELDS = `fields *, genres.name, cover.image_id, artworks.image_id, screenshots.image_id, videos.video_id, videos.name,
  involved_companies.developer, involved_companies.publisher, involved_companies.company.name, release_dates.*;`;

/** Quantos jogos o calendário acompanha: os mais aguardados (hypes) da janela. */
const TOP_GAMES = 150;

/**
 * Os TOP_GAMES jogos mais aguardados com lançamento entre 30 dias atrás e 1 ano à frente, nas
 * plataformas do site. Atualiza os que já existem (pela id do IGDB), cria os novos e tira do banco os
 * que saíram da lista e não têm matéria ligada (o calendário fica só com jogos relevantes).
 */
export async function syncGames() {
  const now = Math.floor(Date.now() / 1000);
  const where = `where first_release_date >= ${now - 30 * 86400} & first_release_date < ${now + 365 * 86400} & hypes >= 2 & platforms = (${Object.keys(PLATFORM_MAP).join(",")});`;
  // Pede um pouco mais que TOP_GAMES: alguns saem no filtro de tipo/plataforma/imagem.
  const list = await igdb<IgdbGame[]>("games", `${FIELDS} ${where} sort hypes desc; limit ${TOP_GAMES + 30};`);
  const kept: number[] = [];

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const g of list) {
    const type = g.game_type ?? g.category ?? 0;
    const platforms = [...new Set([...(g.platforms ?? []), ...(g.release_dates ?? []).map((r) => r.platform ?? -1)].map((p) => PLATFORM_MAP[p]).filter(Boolean))];
    const hero = g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id;
    if (!GAME_TYPES.has(type) || !platforms.length || (!hero && !g.cover) || kept.length >= TOP_GAMES) {
      skipped++;
      continue;
    }
    kept.push(g.id);
    const rel = releaseOf(g);
    const devs = (g.involved_companies ?? []).filter((c) => c.developer && c.company).map((c) => c.company!.name);
    const pubs = (g.involved_companies ?? []).filter((c) => c.publisher && c.company).map((c) => c.company!.name);
    const values = {
      name: g.name.slice(0, 200),
      platforms: JSON.stringify(platforms),
      release_date: rel.date,
      release_label: rel.label,
      developer: devs.slice(0, 2).join(", ").slice(0, 160),
      publisher: pubs.slice(0, 2).join(", ").slice(0, 160),
      genres: JSON.stringify((g.genres ?? []).map((x) => GENRES_PT[x.name] ?? x.name).slice(0, 4)),
      image_url: hero ? img("t_1080p", hero) : img("t_cover_big_2x", g.cover!.image_id),
      image_credit: "Imagem: IGDB",
      cover_url: g.cover ? img("t_cover_big_2x", g.cover.image_id) : null,
      screenshots: JSON.stringify((g.screenshots ?? []).slice(0, 4).map((s) => img("t_screenshot_big", s.image_id))),
      trailer: trailerOf(g),
      summary_en: (g.summary ?? "").slice(0, 4000),
      igdb_url: g.url ?? null,
      hypes: g.hypes ?? 0,
    };
    // Endereço pelo nome ("grand-theft-auto-vi"); o slug do IGDB às vezes perde o número.
    const wanted = slugify(g.name, 150) || slugify(g.slug, 150) || `jogo-${g.id}`;
    const [existing] = await query<{ id: number; slug: string; posts: number }>(
      "SELECT g.id, g.slug, (SELECT COUNT(*) FROM posts p WHERE p.game_id = g.id) AS posts FROM games g WHERE g.igdb_id = ?",
      [g.id],
    );
    if (existing) {
      const cols = Object.keys(values);
      const sets = cols.map((c) => `${c} = ?`);
      const params: unknown[] = [...Object.values(values)];
      // Corrige o endereço enquanto a ficha não tem matéria (ninguém linkou ainda).
      if (existing.slug !== wanted && !Number(existing.posts)) {
        const [taken] = await query<{ id: number }>("SELECT id FROM games WHERE slug = ? AND id <> ?", [wanted, existing.id]);
        if (!taken) {
          sets.push("slug = ?");
          params.push(wanted);
        }
      }
      await db().query(`UPDATE games SET ${sets.join(", ")}, synced_at = UTC_TIMESTAMP() WHERE id = ?`, [...params, existing.id]);
      updated++;
    } else {
      let slug = wanted;
      const [taken] = await query<{ id: number }>("SELECT id FROM games WHERE slug = ?", [slug]);
      if (taken) slug = `${slug}-${g.id}`;
      const cols = ["slug", "igdb_id", "description", "art", ...Object.keys(values)];
      await db().query(`INSERT INTO games (${cols.join(", ")}, synced_at) VALUES (${cols.map(() => "?").join(", ")}, UTC_TIMESTAMP())`, [
        slug,
        g.id,
        "",
        "abcd"[g.id % 4],
        ...Object.values(values),
      ]);
      created++;
    }
  }
  // Saiu da lista dos mais aguardados e não tem matéria: sai do calendário.
  let removed = 0;
  if (kept.length >= 50) {
    const [res] = await db().query<import("mysql2").ResultSetHeader>(
      `DELETE FROM games WHERE igdb_id IS NOT NULL AND igdb_id NOT IN (${kept.map(() => "?").join(",")})
       AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.game_id = games.id)`,
      kept,
    );
    removed = res.affectedRows;
  }
  return { fetched: list.length, created, updated, skipped, removed };
}

// ───────────── Descrição em português ─────────────

/**
 * Resumo do IGDB (em inglês) → 1 a 3 frases em português, só com o que o texto diz. Um pedido ao
 * Gemini por vez, com até 12 jogos (os mais aguardados primeiro).
 */
export async function translateDescriptions(limit = 12) {
  const rows = await query<{ id: number; name: string; summary_en: string }>(
    "SELECT id, name, summary_en FROM games WHERE description = '' AND summary_en IS NOT NULL AND summary_en <> '' ORDER BY hypes DESC LIMIT ?",
    [limit],
  );
  if (!rows.length) return 0;
  const { data } = await generateJson<{ items: { id: number; descricao: string }[] }>({
    system:
      "Você escreve fichas de jogos em português do Brasil para o site Respawnou. Para cada jogo, escreva de 1 a 3 frases (até 320 caracteres) dizendo o que é o jogo, usando SÓ as informações do resumo em inglês. Sem adjetivos promocionais, sem opinião, sem inventar plataformas, datas ou nomes. Nomes próprios ficam como estão.",
    prompt: rows.map((r) => `ID ${r.id} — ${r.name}\n${r.summary_en.slice(0, 1200)}`).join("\n\n---\n\n"),
    schema: {
      type: "OBJECT",
      properties: { items: { type: "ARRAY", items: { type: "OBJECT", properties: { id: { type: "INTEGER" }, descricao: { type: "STRING" } }, required: ["id", "descricao"] } } },
      required: ["items"],
    },
  });
  let saved = 0;
  for (const it of data.items ?? []) {
    const text = String(it.descricao ?? "").trim();
    if (!rows.some((r) => r.id === it.id) || text.length < 40 || text.length > 500) continue;
    await db().query("UPDATE games SET description = ? WHERE id = ? AND description = ''", [text, it.id]);
    saved++;
  }
  return saved;
}

/** Liga a matéria ao jogo da ficha quando a palavra-chave é o nome do jogo (mesma chave do consenso). */
export async function gameIdFor(name: string, keyOf: (s: string) => string) {
  const key = keyOf(name);
  if (key.length < 3) return null;
  const rows = await query<{ id: number; name: string }>("SELECT id, name FROM games WHERE name LIKE ? LIMIT 20", [`%${name.split(/[:\-–]/)[0].trim().slice(0, 60)}%`]);
  return rows.find((r) => keyOf(r.name) === key)?.id ?? null;
}
