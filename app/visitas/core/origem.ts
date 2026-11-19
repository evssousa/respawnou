// De onde veio a visita: referrer + UTM → origem (direto, busca, social, outro site, campanha ou interno). Puro.
export type Origem = "direto" | "busca" | "social" | "site" | "campanha" | "interno";
export type OrigemInfo = { origem: Origem; /** Dimensão do domínio ou da campanha ("ref_busca", "ref_social", "ref_site", "campanha"). */ dim: string | null; valor: string | null };

const BUSCA = ["google.", "bing.", "duckduckgo.", "yahoo.", "ecosia.", "yandex.", "search.brave.", "news.google.", "com.google.android.googlequicksearchbox"];
const SOCIAL = [
  "instagram.com", "l.instagram.com", "facebook.com", "m.facebook.com", "lm.facebook.com", "fb.com", "t.co", "x.com", "twitter.com",
  "threads.net", "bsky.app", "tiktok.com", "youtube.com", "youtu.be", "reddit.com", "discord.com", "linkedin.com", "pinterest.com",
  "t.me", "whatsapp.com", "wa.me",
];

const semWww = (h: string) => h.replace(/^www\./, "");

/** "google" casa com google.com, www.google.com.br e news.google.com, mas não com google.com.exemplo.net. */
function buscaPorNome(host: string, nome: string): boolean {
  const n = nome.replace(/\./g, "\\.");
  return new RegExp(`^(?:[a-z0-9-]+\\.)*${n}\\.(?:com|net|org|[a-z]{2})(?:\\.[a-z]{2})?$`).test(host);
}
const igual = (host: string, dominio: string) => host === dominio || host.endsWith(`.${dominio}`);

function hostDe(referrer: string): string | null {
  try {
    const u = new URL(referrer);
    if (u.protocol === "android-app:") return u.hostname.toLowerCase();
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return semWww(u.hostname.toLowerCase());
  } catch {
    return null;
  }
}

/** `utm` vem como "source|medium|campaign" (partes vazias permitidas). */
export function origemDe(referrer: string | null | undefined, utm: string | null | undefined, hosts: string[]): OrigemInfo {
  if (utm && utm.split("|").some((p) => p.trim())) {
    const [source = "", medium = "", campaign = ""] = utm.split("|").map((p) => p.trim().toLowerCase());
    const valor = [source, medium, campaign].filter(Boolean).join(" / ").slice(0, 120);
    return { origem: "campanha", dim: "campanha", valor };
  }
  const host = referrer ? hostDe(referrer) : null;
  if (!host) return { origem: "direto", dim: null, valor: null };
  if (hosts.some((h) => igual(host, semWww(h.toLowerCase())))) return { origem: "interno", dim: null, valor: null };
  // busca: "google." casa com google.com e google.com.br; os demais, pelo começo do domínio
  if (BUSCA.some((b) => (b.endsWith(".") ? buscaPorNome(host, b.slice(0, -1)) : host === b))) return { origem: "busca", dim: "ref_busca", valor: host };
  if (SOCIAL.some((s) => igual(host, s))) return { origem: "social", dim: "ref_social", valor: host };
  return { origem: "site", dim: "ref_site", valor: host };
}
