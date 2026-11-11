// Mídia extra quando as fontes trazem pouca: capturas de tela oficiais da loja Steam (API pública,
// sem chave) e trailer no YouTube (API de dados, opcional: só com YOUTUBE_API_KEY).
// Chamado depois do Gemini, quando já se sabe a palavra-chave (nome do jogo).
import { USER_AGENT } from "./rss.server.ts";

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
}

/** Jogo na Steam pelo nome (null se não achar um que seja claramente o mesmo). */
export async function steamGame(keyword: string): Promise<SteamGame | null> {
  const search = await getJson<{ items?: { id: number; name: string; type: string }[] }>(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(keyword)}&l=portuguese&cc=BR`,
  );
  const hit = search?.items?.find((i) => i.type === "app" && sameGame(i.name, keyword));
  if (!hit) return null;
  const details = await getJson<Record<string, { success: boolean; data?: { type: string; name: string; screenshots?: { path_full: string }[] } }>>(
    `https://store.steampowered.com/api/appdetails?appids=${hit.id}&l=portuguese&cc=BR`,
  );
  const data = details?.[hit.id]?.data;
  if (!data || data.type !== "game") return null;
  return {
    appId: hit.id,
    name: data.name,
    url: `https://store.steampowered.com/app/${hit.id}/`,
    screenshots: (data.screenshots ?? []).map((s) => s.path_full.split("?")[0]),
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
