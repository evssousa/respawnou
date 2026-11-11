// Leitura de feeds RSS 2.0 e Atom.
import { XMLParser } from "fast-xml-parser";
import { emptyMedia, mediaFromHtml, mediaFromRssItem, type SourceMedia } from "./media.ts";
import { decodeEntities, extractArticleText, stripTags } from "./text.ts";

export const USER_AGENT = "Mozilla/5.0 (compatible; RespawnouBot/1.0; +https://respawnou.com.br/sobre)";

export interface FeedItem {
  guid: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: Date | null;
  media: SourceMedia;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", textNodeName: "#text" });

const asArray = <T>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Texto de um nó que pode vir como string, número ou { "#text": ... }. */
function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as object)) return String((v as { "#text": unknown })["#text"] ?? "");
  return "";
}

function atomLink(v: unknown): string {
  const links = asArray(v as Record<string, string> | Record<string, string>[]);
  const alt = links.find((l) => !l["@rel"] || l["@rel"] === "alternate") ?? links[0];
  return typeof alt === "string" ? alt : (alt?.["@href"] ?? "");
}

function date(v: unknown) {
  const d = new Date(text(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function fetchText(url: string, timeoutMs = 15000) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/rss+xml,application/xml;q=0.9,*/*;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function fetchFeed(url: string): Promise<FeedItem[]> {
  const xml = await fetchText(url);
  const data = parser.parse(xml);
  const items: FeedItem[] = [];

  for (const it of asArray(data?.rss?.channel?.item)) {
    const link = text(it.link) || text(it.guid);
    const html = text(it["content:encoded"]) || text(it.description);
    const allHtml = `${text(it["content:encoded"])} ${text(it.description)}`;
    items.push({
      guid: text(it.guid) || link,
      title: stripTags(decodeEntities(text(it.title))),
      url: link.trim(),
      summary: stripTags(html),
      publishedAt: date(it.pubDate ?? it["dc:date"]),
      // Imagem pode vir no description mesmo quando há content:encoded (ex.: Gematsu).
      media: mediaFromRssItem(it, allHtml),
    });
  }
  for (const it of asArray(data?.feed?.entry)) {
    const link = atomLink(it.link);
    const html = text(it.content) || text(it.summary);
    items.push({
      guid: text(it.id) || link,
      title: stripTags(decodeEntities(text(it.title))),
      url: link.trim(),
      summary: stripTags(html),
      publishedAt: date(it.published ?? it.updated),
      media: mediaFromRssItem(it, html),
    });
  }
  return items.filter((i) => i.title && /^https?:\/\//.test(i.url));
}

/** Baixa a página da matéria: texto principal e mídia (vazios se o site bloquear ou falhar). */
export async function fetchArticle(url: string): Promise<{ text: string; media: SourceMedia }> {
  try {
    const html = await fetchText(url, 20000);
    return { text: extractArticleText(html), media: mediaFromHtml(html, { onlyArticle: true }) };
  } catch {
    return { text: "", media: emptyMedia() };
  }
}
