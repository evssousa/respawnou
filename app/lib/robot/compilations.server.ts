// Artigos de compilação: matérias feitas a partir de dados, não de outra matéria.
//   ofertas      Promoções · sexta    jogos bem avaliados com desconto forte na Steam (preço em reais)
//   resumo       Artigos   · domingo  as matérias da semana do próprio site, com link para cada uma
//   gratis-mes   Artigos   · dia 1º   jogos grátis do mês anterior (só com o mês inteiro registrado)
// Agenda no fuso de Brasília; cada uma sai no máximo uma vez por período (settings.compilations).
// Passam pelo mesmo writeFromSources das outras matérias (checagem e até 3 tentativas).
import { db, iso, json, query } from "../db.server.ts";
import { absoluteUrl } from "../site.ts";
import { steamApp } from "./enrich.server.ts";
import { emptyMedia } from "./media.ts";
import { USER_AGENT } from "./rss.server.ts";
import type { PreparedSources, Source } from "./writer.server.ts";

const TZ = "America/Sao_Paulo";

export type CompilationKind = "ofertas" | "resumo" | "gratis-mes";

export interface Compilation {
  kind: CompilationKind;
  /** Período coberto (ex.: "2026-W46", "2026-11"): evita repetir. */
  period: string;
  section: "promocoes" | "artigos";
  tag: string;
  prepared: PreparedSources;
  /** Fonte exibida no post. */
  source: { name: string; url: string };
}

// ───────────── Agenda ─────────────

function brNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const day = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), weekday: day.getUTCDay(), date: day };
}

/** Semana ISO ("2026-W46"). */
function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400_000 + 1) / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

async function done(): Promise<Record<string, string>> {
  const [row] = await query<{ value: unknown }>("SELECT value FROM settings WHERE name = 'compilations'");
  return json<Record<string, string>>(row?.value, {});
}

export async function markCompilation(kind: CompilationKind, period: string) {
  const current = await done();
  current[kind] = period;
  await db().query("INSERT INTO settings (name, value) VALUES ('compilations', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [JSON.stringify(current)]);
}

/** Compilação que está no dia de sair e ainda não saiu neste período (ou a pedida, em teste). */
export async function dueCompilation(force?: CompilationKind): Promise<Compilation | null> {
  const now = brNow();
  const last = await done();
  const week = isoWeek(now.date);
  const prev = new Date(Date.UTC(now.year, now.month - 2, 1));
  const prevMonth = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;

  const want = (kind: CompilationKind, period: string, onDay: boolean) => (force ? force === kind : onDay && last[kind] !== period);
  if (want("ofertas", week, now.weekday === 5)) return steamDeals(week);
  if (want("resumo", week, now.weekday === 0)) return weekRecap(week);
  if (want("gratis-mes", prevMonth, now.day <= 3)) return monthFree(prevMonth, prev);
  return null;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const COMMON_BRIEF = `É um ARTIGO DE COMPILAÇÃO feito pelo Respawnou a partir dos dados abaixo (não é reescrita de outra matéria): publish=true.
- Não invente nada além das fontes; números, preços e datas exatamente como estão nelas.
- Um h2 por item principal (ou por grupo de itens parecidos), com o que o leitor precisa saber; feche com h2 "Mais sobre <focusKeyword>" usando só o que as fontes dizem (inclusive como a lista foi feita).`;

// ───────────── Ofertas da semana na Steam ─────────────

interface CsDeal {
  title: string;
  steamAppID: string | null;
  savings: string;
  steamRatingPercent: string;
  steamRatingCount: string;
  metacriticScore: string;
}

async function steamDeals(week: string): Promise<Compilation | null> {
  // Seleção: CheapShark (API pública de promoções), só Steam, avaliação dos jogadores alta.
  const deals = await getJson<CsDeal[]>("https://www.cheapshark.com/api/1.0/deals?storeID=1&onSale=1&sortBy=Deal%20Rating&pageSize=60&steamRating=85");
  const picked = (deals ?? [])
    .filter((d) => d.steamAppID && Number(d.steamRatingCount) >= 2000 && Number(d.savings) >= 50)
    .sort((a, b) => Number(b.steamRatingCount) * Number(b.steamRatingPercent) - Number(a.steamRatingCount) * Number(a.steamRatingPercent))
    .slice(0, 14);
  const sources: Source[] = [];
  const media = emptyMedia();
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(new Date());
  for (const d of picked) {
    if (sources.length >= 8) break;
    const app = await steamApp(Number(d.steamAppID));
    // Preço tem de estar em promoção também na Steam Brasil (a CheapShark olha a loja americana).
    if (!app?.price || app.price.discount < 50 || !app.shortDescription) continue;
    sources.push({
      name: "Steam",
      title: `${app.name} em promoção na Steam`,
      url: app.url,
      date: new Date().toISOString(),
      text: [
        `${app.name}: de ${app.price.normal} por ${app.price.now} na Steam Brasil (${app.price.discount}% de desconto), preço conferido em ${date}.`,
        `Avaliação dos jogadores na Steam: ${d.steamRatingPercent}% positivas em ${Number(d.steamRatingCount).toLocaleString("pt-BR")} análises.`,
        Number(d.metacriticScore) ? `Nota no Metacritic: ${d.metacriticScore}.` : "",
        app.genres.length ? `Gêneros: ${app.genres.join(", ")}.` : "",
        app.developers.length ? `Desenvolvimento: ${app.developers.join(", ")}.` : "",
        app.releaseDate ? `Lançamento: ${app.releaseDate}.` : "",
        app.languages ? `Idiomas: ${app.languages}.` : "",
        `Descrição na loja: ${app.shortDescription}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    if (app.screenshots[0]) media.images.push({ url: app.screenshots[0], source: "Steam" });
  }
  if (sources.length < 5) return null;
  sources.unshift({
    name: "Respawnou",
    title: "Como a lista foi feita",
    url: "https://store.steampowered.com/specials",
    date: new Date().toISOString(),
    text: `Seleção do Respawnou em ${date}: jogos em promoção na Steam com pelo menos 85% de avaliações positivas dos jogadores, mais de 2 mil análises e pelo menos 50% de desconto no preço da Steam Brasil. A lista de promoções vem da CheapShark, serviço que acompanha preços de lojas digitais; os preços em reais são os da própria Steam. As promoções da Steam têm prazo e podem acabar a qualquer momento; o preço final é o que aparece na loja na hora da compra. São ${sources.length} jogos.`,
  });
  return {
    kind: "ofertas",
    period: week,
    section: "promocoes",
    tag: "Ofertas",
    source: { name: "Steam (preços) e CheapShark (seleção)", url: "https://store.steampowered.com/specials" },
    prepared: {
      sources,
      media,
      brief: `${COMMON_BRIEF}
PAUTA: as melhores promoções da semana na Steam para o jogador brasileiro. Editoria: promocoes. Plataforma: pc.
- focusKeyword: "promoções da Steam"; title com ela e o destaque (ex.: maior desconto ou número de jogos).
- Um h2 por jogo (nome do jogo + preço promocional), com 1 parágrafo: o que é o jogo (da descrição), preço normal → preço atual e a avaliação dos jogadores. Pode linkar a página do jogo na Steam (1 link por jogo, exceção à regra de 1 a 2 links externos).
- Avise no lide que os preços foram conferidos na data informada e que as promoções podem acabar.`,
    },
  };
}

// ───────────── Resumo da semana ─────────────

async function weekRecap(week: string): Promise<Compilation | null> {
  const posts = await query<{ section: string; slug: string; title: string; excerpt: string; body: unknown; image_url: string | null; image_credit: string | null; published_at: string; tag: string | null }>(
    `SELECT section, slug, title, excerpt, body, image_url, image_credit, published_at, tag FROM posts
     WHERE status = 'published' AND published_at <= UTC_TIMESTAMP() AND published_at > UTC_TIMESTAMP() - INTERVAL 7 DAY
       AND NOT (section = 'artigos' AND tag = 'Resumo')
     ORDER BY views DESC, published_at DESC LIMIT 10`,
  );
  if (posts.length < 5) return null;
  const sources: Source[] = posts.map((p) => {
    const body = json<{ type: string; text?: string }[]>(p.body, []);
    const text = body
      .filter((b) => b.type === "p" && b.text && !/^leia também/i.test(b.text))
      .map((b) => b.text!.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"))
      .join(" ")
      .split(/\s+/)
      .slice(0, 220)
      .join(" ");
    return { name: "Respawnou", title: p.title, url: `/${p.section}/${p.slug}`, date: iso(p.published_at) ?? "", text: `${p.excerpt}\n\n${text}` };
  });
  const media = emptyMedia();
  for (const p of posts) {
    if (!p.image_url) continue;
    // Crédito original da imagem ("Imagem: reprodução/IGN" → IGN).
    const source = p.image_credit?.replace(/^Imagem:\s*(divulgação|reprodução)\//i, "").trim() || undefined;
    media.images.push({ url: p.image_url.startsWith("http") ? p.image_url : absoluteUrl(p.image_url), source });
  }
  return {
    kind: "resumo",
    period: week,
    section: "artigos",
    tag: "Resumo",
    source: { name: "Respawnou", url: absoluteUrl("/noticias") },
    prepared: {
      sources,
      media,
      brief: `${COMMON_BRIEF}
PAUTA: resumo da semana nos games, com as matérias publicadas pelo Respawnou nos últimos 7 dias (as fontes). Editoria: artigos.
- focusKeyword: "resumo da semana"; title com ela e os 1 ou 2 assuntos mais fortes.
- Agrupe por tema em h2 informativos (ex.: "Anúncios e lançamentos", "Indústria"), resumindo cada matéria em 2 a 3 frases com o fato principal e o que muda para quem joga.
- Cada matéria resumida ganha 1 link interno para ela (o endereço da fonte), no texto âncora com o assunto. Aqui vale mais de 3 links internos.`,
    },
  };
}

// ───────────── Jogos grátis do mês ─────────────

async function monthFree(period: string, start: Date): Promise<Compilation | null> {
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const sql = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  // Só com o mês inteiro registrado: a primeira oferta gravada tem de ser anterior ao início do mês.
  const [first] = await query<{ first: string | null }>("SELECT MIN(created_at) AS first FROM free_games WHERE source <> 'manual'");
  if (!first?.first || new Date(iso(first.first) ?? "") > start) return null;
  const games = await query<{ name: string; store: string; platform: string; url: string; worth: string | null; description: string | null; starts_at: string | null; ends_at: string; extra: unknown; post_id: number | null; section: string | null; slug: string | null }>(
    `SELECT f.name, f.store, f.platform, f.url, f.worth, f.description, f.starts_at, f.ends_at, f.extra, f.post_id, p.section, p.slug
     FROM free_games f LEFT JOIN posts p ON p.id = f.post_id AND p.status = 'published'
     WHERE f.source <> 'manual' AND COALESCE(f.starts_at, f.created_at) < ? AND f.ends_at >= ?
     ORDER BY COALESCE(f.starts_at, f.created_at)`,
    [sql(end), sql(start)],
  );
  if (games.length < 3) return null;
  const monthName = `${MONTHS[start.getUTCMonth()]} de ${start.getUTCFullYear()}`;
  const fmt = (s: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "numeric", month: "long" }).format(new Date(iso(s) ?? s));
  const sources: Source[] = games.map((g) => ({
    name: g.store,
    title: `${g.name} grátis (${g.store})`,
    url: g.section && g.slug ? `/${g.section}/${g.slug}` : g.url,
    date: iso(g.starts_at ?? g.ends_at) ?? "",
    text: [
      `${g.name} ficou grátis na ${g.store} (${g.platform})${g.starts_at ? ` de ${fmt(g.starts_at)}` : ""} até ${fmt(g.ends_at)}.`,
      g.worth ? `Preço normal informado: ${g.worth}.` : "",
      g.description ? `Descrição: ${g.description.slice(0, 600)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  }));
  const media = emptyMedia();
  for (const g of games) {
    const image = json<{ image?: string }>(g.extra, {}).image;
    if (image) media.images.push({ url: image, source: g.store });
  }
  sources.unshift({
    name: "Respawnou",
    title: `Jogos grátis de ${monthName}`,
    url: absoluteUrl("/promocoes"),
    date: new Date().toISOString(),
    text: `Lista do Respawnou com os jogos que ficaram grátis por tempo limitado em ${monthName}, registrados automaticamente a partir da Epic Games Store e da GamerPower. São ${games.length} jogos. Quem resgatou dentro do prazo fica com o jogo na conta. Os grátis atuais estão na página de promoções do Respawnou.`,
  });
  return {
    kind: "gratis-mes",
    period,
    section: "artigos",
    tag: "Lista",
    source: { name: "Epic Games Store e GamerPower", url: absoluteUrl("/promocoes") },
    prepared: {
      sources,
      media,
      brief: `${COMMON_BRIEF}
PAUTA: jogos que ficaram grátis em ${monthName}. Editoria: artigos.
- focusKeyword: "jogos grátis de ${monthName}"; title com ela.
- Organize por loja ou por semana em h2; para cada jogo, 1 a 2 frases (o que é, quando ficou grátis, preço normal).
- Link para a matéria do Respawnou do jogo quando o endereço da fonte for interno; senão, para a loja.
- Mencione que os grátis atuais estão na página de promoções do site (link /promocoes).`,
    },
  };
}
