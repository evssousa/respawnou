// Artigos de compilação: matérias feitas a partir de dados, não de outra matéria.
//   ofertas      Promoções · sexta    jogos bem avaliados com desconto forte na Steam (preço em reais)
//   resumo       Artigos   · domingo  as matérias da semana do próprio site, com link para cada uma
//   gratis-mes   Artigos   · dia 1º   jogos grátis do mês anterior (só com o mês inteiro registrado)
//   lancamentos  Artigos   · dia 1º   os lançamentos mais aguardados do mês que começa (IGDB)
//   lancamentos-semana  Artigos · segunda  jogos com data na semana (IGDB), com link para a ficha de cada um
//   lista        Artigos   · quarta   lista de dados: semana par = jogos de um gênero; ímpar = lançamentos que rodam em PC fraco
//   pauta-semana Artigos   · quinta   peça semanal para o dono REVISAR: nasce como rascunho (docs/crescimento.md, C7)
// Agenda no fuso de Brasília; cada uma sai no máximo uma vez por período (settings.compilations).
// Passam pelo mesmo writeFromSources das outras matérias (checagem e até 3 tentativas).
import { db, iso, json, query } from "../db.server.ts";
import { absoluteUrl } from "../site.ts";
import { steamApp } from "./enrich.server.ts";
import { emptyMedia } from "./media.ts";
import { USER_AGENT } from "./rss.server.ts";
import type { PreparedSources, Source } from "./writer.server.ts";

const TZ = "America/Sao_Paulo";

export type CompilationKind = "ofertas" | "resumo" | "gratis-mes" | "lancamentos" | "lancamentos-semana" | "lista" | "pauta-semana";

export interface Compilation {
  kind: CompilationKind;
  /** Período coberto (ex.: "2026-W46", "2026-11"): evita repetir. */
  period: string;
  section: "promocoes" | "artigos";
  tag: string;
  prepared: PreparedSources;
  /** Fonte exibida no post. */
  source: { name: string; url: string };
  /** Peça que o dono revisa antes de publicar: grava como rascunho e não conta no limite diário. */
  draft?: boolean;
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
  const thisMonth = `${now.year}-${String(now.month).padStart(2, "0")}`;
  if (want("lancamentos", thisMonth, now.day <= 3)) return monthReleases(thisMonth, new Date(Date.UTC(now.year, now.month - 1, 1)));
  // Evergreen da semana (docs/crescimento.md): segunda = lançamentos da semana, quarta = lista de dados, quinta = peça para revisão.
  if (want("lancamentos-semana", week, now.weekday === 1)) return weekReleases(week, now.date);
  if (want("lista", week, now.weekday === 3)) return dataList(week, now.date);
  if (want("pauta-semana", week, now.weekday === 4)) return weeklyPick(week, now.date);
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

// ───────────── Lançamentos do mês (IGDB) ─────────────

async function monthReleases(period: string, start: Date): Promise<Compilation | null> {
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const games = await query<{
    name: string;
    slug: string;
    release_date: string;
    platforms: unknown;
    genres: unknown;
    developer: string;
    publisher: string;
    description: string;
    summary_en: string | null;
    image_url: string | null;
    trailer: string | null;
  }>(
    `SELECT name, slug, release_date, platforms, genres, developer, publisher, description, summary_en, image_url, trailer FROM games
     WHERE igdb_id IS NOT NULL AND release_date >= ? AND release_date < ? ORDER BY hypes DESC LIMIT 12`,
    [day(start), day(end)],
  );
  if (games.length < 5) return null;
  const monthName = `${MONTHS[start.getUTCMonth()]} de ${start.getUTCFullYear()}`;
  const labels: Record<string, string> = { pc: "PC", playstation: "PlayStation", xbox: "Xbox", switch: "Nintendo Switch", mobile: "celular" };
  const fmt = (d: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${String(d).slice(0, 10)}T12:00:00Z`));
  const sorted = [...games].sort((a, b) => String(a.release_date).localeCompare(String(b.release_date)));
  const sources: Source[] = sorted.map((g) => ({
    name: "IGDB",
    title: `${g.name}: lançamento em ${fmt(g.release_date)}`,
    url: `/jogos/${g.slug}`,
    date: new Date().toISOString(),
    text: [
      `${g.name} tem lançamento previsto para ${fmt(g.release_date)} de ${start.getUTCFullYear()}.`,
      `Plataformas: ${json<string[]>(g.platforms, []).map((p) => labels[p] ?? p).join(", ")}.`,
      json<string[]>(g.genres, []).length ? `Gêneros: ${json<string[]>(g.genres, []).join(", ")}.` : "",
      g.developer ? `Desenvolvimento: ${g.developer}.` : "",
      g.publisher ? `Distribuição: ${g.publisher}.` : "",
      g.description ? `Sobre o jogo: ${g.description}` : g.summary_en ? `Resumo (em inglês, traduza): ${g.summary_en.slice(0, 600)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  }));
  const media = emptyMedia();
  for (const g of sorted) if (g.image_url) media.images.push({ url: g.image_url, source: "IGDB" });
  sources.unshift({
    name: "Respawnou",
    title: `Lançamentos de ${monthName}`,
    url: absoluteUrl("/lancamentos"),
    date: new Date().toISOString(),
    text: `Seleção do Respawnou com os ${games.length} lançamentos mais aguardados de ${monthName} (pelo interesse dos jogadores no IGDB), nas plataformas PC, PlayStation, Xbox, Nintendo Switch e celular. As datas são as divulgadas até o início do mês e podem mudar. O calendário completo, atualizado sozinho, está na página de lançamentos do Respawnou.`,
  });
  return {
    kind: "lancamentos",
    period,
    section: "artigos",
    tag: "Lista",
    source: { name: "IGDB.com", url: "https://www.igdb.com" },
    prepared: {
      sources,
      media,
      brief: `${COMMON_BRIEF}
PAUTA: os lançamentos mais aguardados de ${monthName}, em ordem de data. Editoria: artigos.
- focusKeyword: "lançamentos de ${monthName}"; title com ela.
- Um h2 por jogo com o nome e a data (ex.: "Nome do jogo — 14 de ${MONTHS[start.getUTCMonth()]}"), 1 parágrafo: o que é, quem faz e em que plataformas sai. Link interno para a ficha do jogo (endereço da fonte).
- Diga no lide que as datas podem mudar e cite o calendário de lançamentos do site (link /lancamentos).`,
    },
  };
}

// ───────────── Evergreen da semana (docs/crescimento.md, C2, C3 e C7) ─────────────

const PLATFORM_LABELS: Record<string, string> = { pc: "PC", playstation: "PlayStation", xbox: "Xbox", switch: "Nintendo Switch", mobile: "celular" };
const fmtDay = (d: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${String(d).slice(0, 10)}T12:00:00Z`));
const ymdOf = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);

interface GameRow {
  name: string;
  slug: string;
  release_date: string | null;
  release_label: string | null;
  platforms: unknown;
  genres: unknown;
  developer: string;
  publisher: string;
  description: string;
  summary_en: string | null;
  image_url: string | null;
  critic_score: string | number | null;
  critic_count: number | null;
  pc_min: string | null;
  pc_rec: string | null;
  price_brl: string | null;
  languages: unknown;
}

const GAME_COLS = "name, slug, release_date, release_label, platforms, genres, developer, publisher, description, summary_en, image_url, critic_score, critic_count, pc_min, pc_rec, price_brl, languages";

/** Uma fonte por jogo: só dados do banco (IGDB e Steam), com link para a ficha. */
function gameSource(g: GameRow, extra = ""): Source {
  const genres = json<string[]>(g.genres, []);
  const plats = json<string[]>(g.platforms, []).map((p) => PLATFORM_LABELS[p] ?? p).join(", ");
  const lang = json<{ interface?: boolean; legendas?: boolean; audio?: boolean } | null>(g.languages, null);
  return {
    name: "IGDB",
    title: g.name,
    url: `/jogos/${g.slug}`,
    date: new Date().toISOString(),
    text: [
      g.release_date ? `${g.name}: lançamento em ${fmtDay(g.release_date)} de ${String(g.release_date).slice(0, 4)}.` : g.release_label ? `${g.name}: lançamento previsto para ${g.release_label}.` : `${g.name}.`,
      plats ? `Plataformas: ${plats}.` : "",
      genres.length ? `Gêneros: ${genres.join(", ")}.` : "",
      g.developer ? `Desenvolvimento: ${g.developer}.` : "",
      g.publisher ? `Distribuição: ${g.publisher}.` : "",
      g.critic_count && Number(g.critic_count) >= 3 && g.critic_score != null ? `Nota agregada da imprensa (IGDB): ${Math.round(Number(g.critic_score)) / 10} de 10, em ${g.critic_count} análises.` : "",
      lang ? (lang.interface || lang.legendas ? `Português do Brasil: ${[lang.interface ? "interface" : "", lang.legendas ? "legendas" : "", lang.audio ? "áudio dublado" : ""].filter(Boolean).join(", ")}.` : "Sem português do Brasil na loja.") : "",
      g.price_brl ? `Preço na Steam Brasil: ${g.price_brl}.` : "",
      g.description ? `Sobre o jogo: ${g.description}` : g.summary_en ? `Resumo (em inglês, traduza): ${g.summary_en.slice(0, 600)}` : "",
      extra,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

const mediaOf = (games: GameRow[]) => {
  const media = emptyMedia();
  for (const g of games) if (g.image_url) media.images.push({ url: g.image_url, source: "IGDB" });
  return media;
};

// C2: lançamentos da semana (segunda a domingo)
async function weekReleases(week: string, monday: Date): Promise<Compilation | null> {
  const from = ymdOf(monday);
  const to = ymdOf(addDays(monday, 6));
  const games = await query<GameRow>(`SELECT ${GAME_COLS} FROM games WHERE igdb_id IS NOT NULL AND release_date BETWEEN ? AND ? ORDER BY release_date, hypes DESC LIMIT 12`, [from, to]);
  if (games.length < 4) return null;
  const end = addDays(monday, 6);
  const range = `${monday.getUTCDate()} a ${end.getUTCDate()} de ${MONTHS[end.getUTCMonth()]}`;
  const sources = games.map((g) => gameSource(g));
  sources.unshift({
    name: "Respawnou",
    title: `Lançamentos da semana (${range})`,
    url: absoluteUrl("/lancamentos"),
    date: new Date().toISOString(),
    text: `Seleção do Respawnou com os ${games.length} jogos com data de lançamento entre ${fmtDay(from)} e ${fmtDay(to)}, em PC, PlayStation, Xbox, Nintendo Switch e celular, segundo o IGDB. As datas são as divulgadas até agora e podem mudar. O calendário completo está na página de lançamentos do Respawnou.`,
  });
  return {
    kind: "lancamentos-semana",
    period: week,
    section: "artigos",
    tag: "Lista",
    source: { name: "IGDB.com", url: "https://www.igdb.com" },
    prepared: {
      sources,
      media: mediaOf(games),
      brief: `${COMMON_BRIEF}
PAUTA: os jogos que chegam nesta semana, em ordem de data. Editoria: artigos.
- focusKeyword: "lançamentos da semana"; title no padrão "Lançamentos de jogos da semana: ${range}".
- Um h2 por dia de lançamento (ou por jogo quando houver só um no dia), com 1 parágrafo por jogo: o que é, quem faz e em que plataformas sai. Link interno para a ficha do jogo (o endereço da fonte), uma vez por jogo.
- Diga no lide que as datas podem mudar e cite o calendário completo (link /lancamentos).`,
    },
  };
}

const GENRES_ROTATION = ["RPG", "Tiro", "Aventura", "Estratégia", "Corrida", "Luta", "Plataforma", "Simulação"];

/** Memória mínima (GB) e placa de vídeo de entrada, a partir do texto da Steam ("Memória: 8 GB; Placa de vídeo: GTX 960"). */
function weakPc(pcMin: string | null) {
  if (!pcMin) return false;
  const ram = pcMin.match(/mem[oó]ria[^;]*?(\d+)\s*GB/i);
  const gpu = pcMin.match(/(?:placa|gr[aá]fic|video|vídeo)[^;]*/i)?.[0] ?? "";
  const lowRam = ram ? Number(ram[1]) <= 8 : false;
  const entryGpu = /GTX\s*(7\d\d|9[0-6]0|10[0-6]0)|GT\s*\d|RX\s*(4|5)\d\d|HD\s*Graphics|UHD|Vega|integrad|Intel/i.test(gpu);
  return lowRam && entryGpu;
}

// C3: lista de dados (quarta): gênero (semana par) ou lançamentos que rodam em PC fraco (semana ímpar)
async function dataList(week: string, d: Date): Promise<Compilation | null> {
  const weekNo = Number(week.split("-W")[1]);
  const today = ymdOf(d);
  if (weekNo % 2 === 1) {
    const rows = await query<GameRow>(
      `SELECT ${GAME_COLS} FROM games WHERE igdb_id IS NOT NULL AND JSON_CONTAINS(platforms, '"pc"') AND pc_min IS NOT NULL AND pc_rec IS NOT NULL
         AND release_date >= DATE_SUB(?, INTERVAL 30 DAY) ORDER BY hypes DESC LIMIT 60`,
      [today],
    );
    const weak = rows.filter((g) => weakPc(g.pc_min)).slice(0, 10);
    if (weak.length >= 5) return listCompilation(week, weak, "jogos para PC fraco", "Jogos que rodam em PC fraco: lançamentos com requisitos baixos", (g) => `Requisitos mínimos na Steam: ${g.pc_min}`, "Seleção do Respawnou entre os lançamentos recentes e próximos com requisitos mínimos de até 8 GB de memória e placa de vídeo de entrada, segundo a página do jogo na Steam. Os requisitos podem mudar até o lançamento.");
  }
  // Gênero em rodízio (determinístico pela semana): tenta o da vez e os seguintes até achar 6 jogos.
  for (let k = 0; k < GENRES_ROTATION.length; k++) {
    const genre = GENRES_ROTATION[(Math.floor(weekNo / 2) + k) % GENRES_ROTATION.length];
    const games = await query<GameRow>(
      `SELECT ${GAME_COLS} FROM games WHERE igdb_id IS NOT NULL AND release_date >= ? AND JSON_CONTAINS(genres, ?) ORDER BY hypes DESC LIMIT 10`,
      [today, JSON.stringify(genre)],
    );
    if (games.length >= 6) {
      const label = genre.toLowerCase();
      return listCompilation(week, games, `jogos de ${label} mais aguardados`, `Jogos de ${label} mais aguardados que ainda vão sair`, () => "", `Seleção do Respawnou com os ${games.length} jogos de ${label} mais aguardados que ainda não saíram, em ordem de interesse dos jogadores no IGDB. As datas podem mudar.`);
    }
  }
  return null;
}

function listCompilation(week: string, games: GameRow[], keyword: string, title: string, extra: (g: GameRow) => string, intro: string): Compilation {
  const sources = games.map((g) => gameSource(g, extra(g)));
  sources.unshift({ name: "Respawnou", title: "Como a lista foi feita", url: absoluteUrl("/lancamentos"), date: new Date().toISOString(), text: intro });
  return {
    kind: "lista",
    period: week,
    section: "artigos",
    tag: "Lista",
    source: { name: "IGDB.com e Steam", url: "https://www.igdb.com" },
    prepared: {
      sources,
      media: mediaOf(games),
      brief: `${COMMON_BRIEF}
PAUTA: lista de dados "${title}". Editoria: artigos.
- focusKeyword: "${keyword}"; title com ela (pode usar "${title}" ou variação direta).
- Mantenha a ORDEM das fontes (é a ordem do critério explicado em "Como a lista foi feita"). Um h2 por jogo (posição e nome), com 1 parágrafo: o que é, data, plataformas e, se a fonte trouxer, requisitos, preço e idiomas. Link interno para a ficha (endereço da fonte), uma vez por jogo.
- Explique o critério da lista no lide e lembre que datas e requisitos podem mudar. Nada de opinião pessoal ou adjetivo promocional.`,
    },
  };
}

// C7: peça da semana em rascunho para o dono revisar (quinta)
async function weeklyPick(week: string, d: Date): Promise<Compilation | null> {
  const weekNo = Number(week.split("-W")[1]);
  const today = ymdOf(d);
  if (weekNo % 2 === 0) {
    const games = await query<GameRow>(
      `SELECT ${GAME_COLS} FROM games WHERE igdb_id IS NOT NULL AND release_date BETWEEN DATE_SUB(?, INTERVAL 45 DAY) AND ? AND critic_count >= 3 AND critic_score IS NOT NULL ORDER BY critic_score DESC LIMIT 8`,
      [today, today],
    );
    if (games.length >= 4) return pickCompilation(week, games, "o que jogar agora", "O que jogar agora: lançamentos recentes mais bem avaliados pela imprensa", "Seleção do Respawnou com os lançamentos dos últimos 45 dias que têm nota agregada da imprensa (IGDB, 3 ou mais análises), da maior para a menor nota. A nota é a média dos veículos, não uma avaliação do Respawnou.");
  } else {
    const games = await query<GameRow>(
      `SELECT ${GAME_COLS} FROM games WHERE igdb_id IS NOT NULL AND release_date >= DATE_SUB(?, INTERVAL 30 DAY) AND JSON_UNQUOTE(JSON_EXTRACT(languages, '$.legendas')) = 'true' ORDER BY hypes DESC LIMIT 10`,
      [today],
    );
    if (games.length >= 5) return pickCompilation(week, games, "jogos com legendas em português", "Jogos com legendas em português do Brasil: o que já está confirmado", "Seleção do Respawnou com lançamentos recentes e próximos que têm legendas em português do Brasil confirmadas na loja (Steam) ou no IGDB, em ordem de interesse dos jogadores. O idioma pode mudar até o lançamento.");
  }
  return null;
}

function pickCompilation(week: string, games: GameRow[], keyword: string, title: string, intro: string): Compilation {
  const c = listCompilation(week, games, keyword, title, () => "", intro);
  return {
    ...c,
    kind: "pauta-semana",
    draft: true,
    source: { name: "IGDB.com e Steam", url: "https://www.igdb.com" },
    prepared: {
      ...c.prepared,
      brief: `${COMMON_BRIEF}
PAUTA: peça semanal "${title}", que será REVISADA por uma pessoa antes de publicar. Editoria: artigos.
- focusKeyword: "${keyword}"; title com ela.
- Lista comentada: um h2 por jogo, 1 a 2 parágrafos com o que a fonte diz (data, plataformas, nota da imprensa, preço, idiomas, requisitos). Link interno para a ficha (endereço da fonte), uma vez por jogo.
- Escreva um parágrafo final "Como escolher" com uma orientação prática baseada SÓ nos dados (ex.: quem tem PC mais fraco, quem quer legendas em português). Sem opinião inventada, sem comparar com jogos que não estão nas fontes.`,
    },
  };
}
