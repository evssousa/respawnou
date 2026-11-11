// Jogos grátis por tempo limitado (editoria Promoções).
//
// Fontes (públicas, sem chave):
//   - Epic Games Store: endpoint da própria loja com o grátis da semana e o próximo, datas exatas
//     e preço em reais. Vira lista no site E matéria (é o grátis que o público procura).
//   - GamerPower (gamerpower.com/api): agregador de brindes. Usado só para lojas grandes
//     (Steam, GOG, Prime Gaming, Ubisoft, EA, mobile) e só na lista, com crédito "Dados: GamerPower".
// Nada de varejo nem afiliado: só jogo que fica de graça na conta.
import { db, json, query } from "../db.server.ts";
import { steamGame, type SteamGame } from "./enrich.server.ts";
import { probeImage, storeImage } from "./media.server.ts";
import { emptyMedia } from "./media.ts";
import { USER_AGENT } from "./rss.server.ts";
import { slugify, stripTags } from "./text.ts";
import type { PreparedSources, Source } from "./writer.server.ts";

const TZ = "America/Sao_Paulo";

export interface Offer {
  source: "epic" | "gamerpower";
  externalId: string;
  name: string;
  store: string;
  platform: string;
  url: string;
  startsAt: Date | null;
  endsAt: Date;
  image: string | null;
  worth: string | null;
  description: string;
  /** image = endereço original (a matéria baixa de novo em tamanho grande). */
  extra: { seller?: string; upcoming?: boolean; image?: string };
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

// ───────────── Epic Games Store ─────────────

interface EpicPromo {
  startDate: string;
  endDate: string;
  discountSetting?: { discountType?: string; discountPercentage?: number };
}
interface EpicElement {
  id: string;
  title: string;
  description?: string;
  offerType?: string;
  productSlug?: string | null;
  urlSlug?: string;
  seller?: { name?: string };
  keyImages?: { type: string; url: string }[];
  catalogNs?: { mappings?: { pageSlug: string }[] };
  offerMappings?: { pageSlug: string }[];
  price?: { totalPrice?: { originalPrice?: number; fmtPrice?: { originalPrice?: string } } };
  promotions?: { promotionalOffers?: { promotionalOffers: EpicPromo[] }[]; upcomingPromotionalOffers?: { promotionalOffers: EpicPromo[] }[] } | null;
}

export async function fetchEpic(): Promise<Offer[]> {
  const data = await getJson<{ data?: { Catalog?: { searchStore?: { elements?: EpicElement[] } } } }>(
    "https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=pt-BR&country=BR&allowCountries=BR",
  );
  const out: Offer[] = [];
  for (const el of data?.data?.Catalog?.searchStore?.elements ?? []) {
    // Jogo gratuito para sempre (free-to-play) com "promoção" de item não interessa; nem "jogo misterioso".
    if (!el.price?.totalPrice?.originalPrice || /mystery game|jogo misterioso/i.test(el.title)) continue;
    if (el.offerType && !["BASE_GAME", "BUNDLE", "OTHERS"].includes(el.offerType)) continue;
    const slug = el.offerMappings?.[0]?.pageSlug ?? el.catalogNs?.mappings?.[0]?.pageSlug ?? el.productSlug?.replace(/\/home$/, "");
    if (!slug) continue;
    const img = ["OfferImageWide", "DieselStoreFrontWide", "featuredMedia", "Thumbnail"].map((t) => el.keyImages?.find((k) => k.type === t)?.url).find(Boolean);
    const promos = [
      ...(el.promotions?.promotionalOffers ?? []).flatMap((p) => p.promotionalOffers.map((o) => ({ o, upcoming: false }))),
      ...(el.promotions?.upcomingPromotionalOffers ?? []).flatMap((p) => p.promotionalOffers.map((o) => ({ o, upcoming: true }))),
    ];
    for (const { o, upcoming } of promos) {
      if (o.discountSetting?.discountPercentage !== 0) continue; // 0% do preço = grátis
      out.push({
        source: "epic",
        externalId: `${el.id}:${o.startDate}`,
        name: el.title.trim(),
        store: "Epic Games Store",
        platform: "PC",
        url: `https://store.epicgames.com/pt-BR/p/${slug}`,
        startsAt: new Date(o.startDate),
        endsAt: new Date(o.endDate),
        image: img ?? null,
        worth: el.price?.totalPrice?.fmtPrice?.originalPrice ?? null,
        description: stripTags(el.description ?? ""),
        extra: { seller: el.seller?.name, upcoming, image: img },
      });
    }
  }
  return out;
}

// ───────────── GamerPower ─────────────

interface GpGiveaway {
  id: number;
  title: string;
  worth: string;
  image: string;
  description: string;
  open_giveaway_url: string;
  published_date: string;
  type: string;
  platforms: string;
  end_date: string;
  status: string;
}

/** Loja reconhecida a partir do campo "platforms" (null = fora do que o site divulga). */
function gpStore(platforms: string): { store: string; platform: string } | null {
  const p = platforms.toLowerCase();
  if (p.includes("epic")) return null; // a Epic vem direto da loja
  if (p.includes("steam")) return { store: "Steam", platform: "PC" };
  if (p.includes("gog")) return { store: "GOG", platform: "PC" };
  if (p.includes("prime") || p.includes("amazon")) return { store: "Prime Gaming", platform: "PC" };
  if (p.includes("ubisoft")) return { store: "Ubisoft Connect", platform: "PC" };
  if (p.includes("origin") || /\bea\b/.test(p)) return { store: "EA app", platform: "PC" };
  if (p.includes("playstation") || p.includes("ps4") || p.includes("ps5")) return { store: "PlayStation Store", platform: "PlayStation" };
  if (p.includes("xbox")) return { store: "Microsoft Store", platform: "Xbox" };
  if (p.includes("switch") || p.includes("nintendo")) return { store: "Nintendo eShop", platform: "Switch" };
  if (p.includes("android") || p.includes("ios")) return { store: p.includes("android") && p.includes("ios") ? "Google Play e App Store" : p.includes("ios") ? "App Store" : "Google Play", platform: "Mobile" };
  return null; // IndieGala, itch.io, Stove, VR, DRM-free...
}

const gpName = (title: string) =>
  title
    .replace(/\s*\((?:steam|gog|epic games|prime gaming|ubisoft|origin|ea app|mobile|android|ios|playstation|xbox|switch)[^)]*\)/gi, "")
    .replace(/\s*(?:key\s+)?giveaway\s*$/i, "")
    .trim();

export async function fetchGamerPower(): Promise<Offer[]> {
  const list = await getJson<GpGiveaway[]>("https://www.gamerpower.com/api/giveaways?type=game");
  const out: Offer[] = [];
  for (const g of Array.isArray(list) ? list : []) {
    if (g.type !== "Game" || g.status !== "Active" || !g.end_date || g.end_date === "N/A") continue;
    const where = gpStore(g.platforms);
    if (!where) continue;
    const ends = new Date(`${g.end_date.replace(" ", "T")}Z`);
    if (Number.isNaN(ends.getTime()) || ends.getTime() < Date.now()) continue;
    out.push({
      source: "gamerpower",
      externalId: String(g.id),
      name: gpName(g.title),
      store: where.store,
      platform: where.platform,
      url: g.open_giveaway_url,
      startsAt: null,
      endsAt: ends,
      image: g.image || null,
      worth: g.worth && g.worth !== "N/A" ? g.worth : null,
      description: stripTags(g.description ?? ""),
      extra: {},
    });
  }
  return out;
}

// ───────────── Gravar ─────────────

const sqlDate = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

/** Atualiza free_games com as ofertas atuais. Imagens são baixadas uma vez e servidas pelo site. */
export async function saveOffers(offers: Offer[], seenSources: Offer["source"][]) {
  let added = 0;
  for (const o of offers) {
    const [existing] = await query<{ id: number; image_url: string | null }>("SELECT id, image_url FROM free_games WHERE source = ? AND external_id = ?", [
      o.source,
      o.externalId,
    ]);
    let image = existing?.image_url ?? null;
    if (!image && o.image) {
      const probed = await probeImage({ url: o.image, source: o.store });
      if (probed && probed.width >= 300) image = (await storeImage(probed, `gratis-${slugify(o.name, 50)}`)).src;
    }
    const values = [o.name, o.store, o.platform, o.url, image, o.worth, o.description.slice(0, 5000), JSON.stringify(o.extra), o.startsAt ? sqlDate(o.startsAt) : null, sqlDate(o.endsAt)];
    if (existing) {
      await db().query(
        "UPDATE free_games SET name = ?, store = ?, platform = ?, url = ?, image_url = ?, worth = ?, description = ?, extra = ?, starts_at = ?, ends_at = ? WHERE id = ?",
        [...values, existing.id],
      );
    } else {
      await db().query(
        "INSERT INTO free_games (name, store, platform, url, image_url, worth, description, extra, starts_at, ends_at, source, external_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [...values, o.source, o.externalId],
      );
      added++;
    }
  }
  // Brinde que sumiu da origem antes do prazo (acabaram as chaves): encerra agora.
  for (const source of seenSources) {
    const ids = offers.filter((o) => o.source === source).map((o) => o.externalId);
    await db().query(
      `UPDATE free_games SET ends_at = UTC_TIMESTAMP() WHERE source = ? AND ends_at > UTC_TIMESTAMP() AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP())
       ${ids.length ? `AND external_id NOT IN (${ids.map(() => "?").join(",")})` : ""}`,
      [source, ...ids],
    );
  }
  return added;
}

// ───────────── Matéria do grátis da Epic ─────────────

export interface PromoCandidate {
  id: number;
  name: string;
  store: string;
  url: string;
  worth: string | null;
  description: string | null;
  image_url: string | null;
  starts_at: string;
  ends_at: string;
  extra: unknown;
}

/** Grátis da Epic que já começou, ainda tem 6 h ou mais pela frente e não virou matéria. */
export async function promoCandidate(): Promise<PromoCandidate | null> {
  const [row] = await query<PromoCandidate>(
    `SELECT id, name, store, url, worth, description, image_url, starts_at, ends_at, extra FROM free_games
     WHERE source = 'epic' AND post_id IS NULL AND post_status IS NULL
       AND starts_at <= UTC_TIMESTAMP()
       AND ends_at > UTC_TIMESTAMP() + INTERVAL 6 HOUR
     ORDER BY starts_at, id LIMIT 1`,
  );
  return row ?? null;
}

export async function markPromo(id: number, status: "used" | "skipped" | "failed", note: string | null, postId?: number) {
  await db().query("UPDATE free_games SET post_status = ?, post_note = ?, post_id = ? WHERE id = ?", [status, note?.slice(0, 500) ?? null, postId ?? null, id]);
}

const brt = (iso: string | Date) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "numeric", month: "long" }).format(d);
  const hour = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(":00", "h").replace(":", "h");
  return `${day}, às ${hour}`;
};

const asDate = (s: string) => new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);

/** Monta as fontes da matéria: dados da Epic + ficha da Steam (quando o jogo também está lá). */
export async function promoSources(c: PromoCandidate): Promise<PreparedSources & { steam: SteamGame | null }> {
  const extra = json<{ seller?: string; image?: string }>(c.extra, {});
  const upcoming = await query<{ name: string; starts_at: string; ends_at: string }>(
    "SELECT name, starts_at, ends_at FROM free_games WHERE source = 'epic' AND starts_at > UTC_TIMESTAMP() ORDER BY starts_at LIMIT 3",
  );
  const epicText = [
    `A Epic Games Store está oferecendo ${c.name} de graça por tempo limitado, para PC.`,
    `A oferta começou em ${brt(asDate(c.starts_at))} e vai até ${brt(asDate(c.ends_at))} (horário de Brasília).`,
    "Quem resgatar o jogo durante a promoção fica com ele na biblioteca da conta para sempre, mesmo depois que a oferta acabar.",
    c.worth ? `Preço normal do jogo na Epic Games Store do Brasil: ${c.worth}.` : "",
    extra.seller ? `Empresa responsável informada pela loja: ${extra.seller}.` : "",
    "Como resgatar: entrar na Epic Games Store pelo site ou pelo aplicativo para PC, fazer login (a conta é gratuita), abrir a página do jogo, clicar em \"Obter\" e confirmar o pedido. O valor cobrado é R$ 0,00.",
    c.description ? `Descrição do jogo na loja: ${c.description}` : "",
    upcoming.length
      ? `Próximos jogos grátis já anunciados pela Epic: ${upcoming.map((u) => `${u.name} (de ${brt(asDate(u.starts_at))} até ${brt(asDate(u.ends_at))})`).join("; ")}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const sources: Source[] = [{ name: "Epic Games Store", title: `${c.name} está grátis na Epic Games Store`, url: c.url, date: asDate(c.starts_at).toISOString(), text: epicText }];
  const steam = await steamGame(c.name);
  if (steam) {
    const steamText = [
      steam.shortDescription,
      steam.about,
      steam.genres.length ? `Gêneros: ${steam.genres.join(", ")}.` : "",
      steam.developers.length ? `Desenvolvimento: ${steam.developers.join(", ")}.` : "",
      steam.publishers.length ? `Distribuição: ${steam.publishers.join(", ")}.` : "",
      steam.releaseDate ? `Lançamento original: ${steam.releaseDate}.` : "",
      steam.languages ? `Idiomas (segundo a Steam): ${steam.languages}.` : "",
      steam.minRequirements ? `Requisitos mínimos para PC (segundo a Steam): ${steam.minRequirements}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    sources.push({ name: "Steam", title: `${steam.name} na Steam`, url: steam.url, date: new Date().toISOString(), text: steamText });
  }

  const media = emptyMedia();
  // Capa: arte oficial da Epic (2560 px). Corpo: capturas da Steam.
  if (extra.image) media.images.push({ url: extra.image, source: "Epic Games Store" });
  for (const url of steam?.screenshots.slice(0, 6) ?? []) media.images.push({ url, source: "Steam" });
  media.links.push(c.url, ...(steam ? [steam.url] : []));

  const brief = `PAUTA APROVADA PELA EDITORIA (publish=true): jogo grátis por tempo limitado na Epic Games Store. Editoria: promocoes. Plataforma: pc.
ESTRUTURA PARA ESTA PAUTA:
- title com o nome do jogo e a palavra "grátis" (ex.: "${c.name} está grátis na Epic Games Store"); focusKeyword = nome do jogo.
- Lide: o jogo, a loja, até quando (dia e hora de Brasília das fontes) e o preço normal, se informado.
- h2 sobre como resgatar, com "ul" de passos (use só os passos das fontes).
- h2 sobre o jogo: gênero, proposta, quem fez, quando saiu — só o que está nas fontes.
- "Para o jogador brasileiro" só com dado concreto das fontes (preço em reais, idiomas em português, requisitos).
- Se as fontes listarem os próximos jogos grátis, inclua uma seção curta com eles.
- O link externo principal é a página do jogo na Epic Games Store.`;
  return { sources, media, brief, steam };
}
