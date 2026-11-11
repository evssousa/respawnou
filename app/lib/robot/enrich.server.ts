// Mídia extra quando as fontes trazem pouca: capturas de tela oficiais da loja Steam (API pública,
// sem chave) e trailer no YouTube (API de dados, opcional: só com YOUTUBE_API_KEY).
// Chamado depois do Gemini, quando já se sabe a palavra-chave (nome do jogo).
import { USER_AGENT } from "./rss.server.ts";
import { stripTags } from "./text.ts";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[™®©]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** O nome achado é do mesmo jogo? (começa pela palavra-chave e não é DLC/trilha/demo) */
export function sameGame(found: string, keyword: string) {
  const f = norm(found);
  const k = norm(keyword);
  if (k.length < 4) return false;
  if (/\b(soundtrack|ost|dlc|demo|avaliacao|pack|season pass|upgrade|bundle|artbook|costume|set|accessory|skin)\b/.test(f)) return false;
  return f === k || f.startsWith(`${k} `) || (k.startsWith(`${f} `) && f.length >= 6);
}

export interface SteamGame {
  appId: number;
  name: string;
  url: string;
  screenshots: string[];
  /** Ficha da loja (em português quando a Steam tem a tradução), já em texto puro. */
  shortDescription: string;
  about: string;
  genres: string[];
  developers: string[];
  publishers: string[];
  releaseDate: string | null;
  /** Ex.: "interface e legendas em português do Brasil; áudio em inglês" (null se a loja não informa). */
  languages: string | null;
  minRequirements: string | null;
  /** Preço na Steam Brasil agora (null se gratuito ou indisponível). */
  price: { normal: string; now: string; discount: number } | null;
}

interface SteamAppData {
  price_overview?: { initial_formatted?: string; final_formatted?: string; discount_percent?: number; final?: number };
  type: string;
  name: string;
  short_description?: string;
  about_the_game?: string;
  supported_languages?: string;
  pc_requirements?: { minimum?: string } | [];
  developers?: string[];
  publishers?: string[];
  genres?: { description: string }[];
  release_date?: { date?: string };
  screenshots?: { path_full: string }[];
}

/** "Português do Brasil<strong>*</strong>, Inglês<strong>*</strong>..." → resumo legível. */
function steamLanguages(html?: string) {
  if (!html) return null;
  const items = html
    .split(/<br>/i)[0]
    .split(",")
    .map((s) => ({ name: stripTags(s.replace(/<strong>\*<\/strong>/g, "")), audio: /<strong>\*<\/strong>/.test(s) }));
  const ptbr = items.find((i) => /portugu[eê]s.*brasil/i.test(i.name));
  if (!ptbr) return "sem português do Brasil na lista de idiomas da loja";
  return ptbr.audio ? "interface, legendas e áudio em português do Brasil" : "interface e legendas em português do Brasil (áudio em outros idiomas)";
}

/** Jogo na Steam pelo nome (null se não achar um que seja claramente o mesmo). */
export async function steamGame(keyword: string): Promise<SteamGame | null> {
  const search = await getJson<{ items?: { id: number; name: string; type: string }[] }>(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(keyword)}&l=brazilian&cc=BR`,
  );
  const hit = search?.items?.find((i) => i.type === "app" && sameGame(i.name, keyword));
  return hit ? steamApp(hit.id) : null;
}

/** Ficha de um jogo da Steam pelo ID (em português do Brasil, preço em reais). */
export async function steamApp(appId: number): Promise<SteamGame | null> {
  const details = await getJson<Record<string, { success: boolean; data?: SteamAppData }>>(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&l=brazilian&cc=BR`,
  );
  const data = details?.[appId]?.data;
  if (!data || data.type !== "game") return null;
  const req = Array.isArray(data.pc_requirements) ? undefined : data.pc_requirements?.minimum;
  return {
    appId,
    name: data.name,
    url: `https://store.steampowered.com/app/${appId}/`,
    screenshots: (data.screenshots ?? []).map((s) => s.path_full.split("?")[0]),
    shortDescription: stripTags(data.short_description ?? ""),
    about: stripTags(data.about_the_game ?? "").slice(0, 4000),
    genres: (data.genres ?? []).map((g) => g.description),
    developers: data.developers ?? [],
    publishers: data.publishers ?? [],
    releaseDate: data.release_date?.date ?? null,
    languages: steamLanguages(data.supported_languages),
    price: data.price_overview?.final_formatted
      ? {
          normal: data.price_overview.initial_formatted || data.price_overview.final_formatted,
          now: data.price_overview.final_formatted,
          discount: data.price_overview.discount_percent ?? 0,
        }
      : null,
    minRequirements: req ? stripTags(req.replace(/<li>/g, "; ")).replace(/^Mínimos:\s*;?\s*/i, "").slice(0, 800) : null,
  };
}

/**
 * Trailer no YouTube (precisa de YOUTUBE_API_KEY; cada busca gasta 100 da cota grátis de 10.000/dia).
 * Aceita só vídeo incorporável cujo título tem o nome do jogo e cara de material oficial.
 */
export async function youtubeTrailer(keyword: string): Promise<{ youtubeId: string; title: string } | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({
    part: "snippet",
    q: `${keyword} trailer`,
    type: "video",
    videoEmbeddable: "true",
    maxResults: "8",
    order: "relevance",
    publishedAfter: new Date(Date.now() - 2 * 365 * 86400_000).toISOString(),
    key,
  });
  const data = await getJson<{ items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[] }>(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
  );
  const k = norm(keyword);
  const ok = (data?.items ?? []).find((v) => {
    const t = norm(v.snippet.title);
    return t.includes(k) && /\b(trailer|gameplay|teaser|reveal|launch|announcement|anuncio|lancamento)\b/.test(t) && !/\b(reaction|react|review|analise|explained|theory|leak)\b/.test(t);
  });
  return ok ? { youtubeId: ok.id.videoId, title: decodeHtml(ok.snippet.title) } : null;
}

const decodeHtml = (s: string) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

/** Diagnóstico (/api/cron/diag): a chave do YouTube existe e funciona? Gasta 100 da cota. */
export async function youtubeCheck() {
  if (!process.env.YOUTUBE_API_KEY) return { configured: false };
  const params = new URLSearchParams({ part: "snippet", q: "Helldivers 2 trailer", type: "video", maxResults: "1", key: process.env.YOUTUBE_API_KEY });
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(10_000) });
    const body = (await res.json()) as { items?: { snippet: { title: string } }[]; error?: { message: string } };
    return { configured: true, ok: res.ok, status: res.status, sample: body.items?.[0]?.snippet.title, error: body.error?.message?.slice(0, 200) };
  } catch (err) {
    return { configured: true, ok: false, error: String(err) };
  }
}
