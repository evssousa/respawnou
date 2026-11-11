// Camada de dados do site. Só roda no servidor (sufixo .server).
//
// Os dados vêm de uma "fonte" (repo): MySQL quando DB_NAME/DB_USER estão definidos,
// senão os dados de exemplo em mock-data.ts. Aqui ficam só as regras de exibição
// (paginação, rótulos de data calculados no servidor), iguais para as duas fontes.
import { hasDatabase } from "./db.server";
import { daysUntil, formatDate, formatDay, formatMonthShort, formatTime, formatWeekday, normalize, timeAgo } from "./format";
import { mockRepo } from "./repo/mock.server";
import { mysqlRepo } from "./repo/mysql.server";
import type { Repo } from "./repo/types";
import type { Availability } from "./availability";
import { PLATFORMS, SECTIONS, sectionBySlug, type PlatformSlug, type SectionSlug } from "./site";
import type { FreeGame, Game, Post, PostView, Release } from "./types";

const repo = (): Repo => (hasDatabase() ? mysqlRepo : mockRepo);

export const postUrl = (p: Pick<Post, "section" | "slug">) => `/${p.section}/${p.slug}`;

function toView(post: Post, now = Date.now()): PostView {
  const { body: _body, ...rest } = post;
  return {
    ...rest,
    url: postUrl(post),
    kicker: post.tag ?? sectionBySlug(post.section)?.kicker ?? "Notícias",
    ago: timeAgo(post.publishedAt, now),
    dateLabel: formatDate(post.publishedAt),
    timeLabel: formatTime(post.publishedAt),
  };
}

export interface ListOptions {
  section?: SectionSlug;
  platform?: PlatformSlug;
  gameSlug?: string;
  exclude?: string[];
  page?: number;
  perPage?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

export async function listPosts(opts: ListOptions = {}): Promise<Paginated<PostView>> {
  const { page = 1, perPage = 12, ...filter } = opts;
  const requested = Math.max(1, Math.floor(page) || 1);
  let { items, total } = await repo().findPosts(filter, (requested - 1) * perPage, perPage);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  // Página além do fim: mostra a última, como antes.
  const current = Math.min(requested, totalPages);
  if (current !== requested) ({ items, total } = await repo().findPosts(filter, (current - 1) * perPage, perPage));
  const now = Date.now();
  return { items: items.map((p) => toView(p, now)), page: current, totalPages, total };
}

export async function getFeatured(): Promise<PostView | null> {
  const post = await repo().findFeatured();
  return post ? toView(post) : null;
}

export async function getMostRead(limit = 5, exclude: string[] = []): Promise<PostView[]> {
  const now = Date.now();
  return (await repo().findMostRead(limit, exclude)).map((p) => toView(p, now));
}

export async function getPost(section: string, slug: string) {
  const post = await repo().findPost(section, slug);
  if (!post) return null;
  return { ...toView(post), body: post.body };
}

export async function getAllPosts(limit?: number): Promise<Post[]> {
  return repo().allPosts(limit);
}

export async function searchPosts(query: string): Promise<PostView[]> {
  const terms = normalize(query).split(/\s+/).filter(Boolean).slice(0, 8);
  if (!terms.length) return [];
  const now = Date.now();
  return (await repo().searchPosts(terms, 50)).map((p) => toView(p, now));
}

export async function getGame(slug: string): Promise<Game | null> {
  return repo().findGame(slug);
}

export async function getAllGames(): Promise<Game[]> {
  return repo().allGames();
}

export async function searchGames(query: string): Promise<Game[]> {
  const q = query.trim();
  if (!q) return [];
  return repo().searchGames(q, 20);
}

function toRelease(game: Game): Release {
  const date = game.releaseDate!;
  return { game, date, day: formatDay(date), monthShort: formatMonthShort(date), weekday: formatWeekday(date), daysLeft: daysUntil(date) };
}

/** Dia de hoje (AAAA-MM-DD) no fuso de Brasília. */
const todayBR = (offsetDays = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + offsetDays * 86400000));

/** Próximos lançamentos a partir de hoje. `days` limita a janela (ex.: 7 = esta semana). */
export async function getReleases(opts: { days?: number; platform?: PlatformSlug } = {}): Promise<Release[]> {
  const games = await repo().findReleases(todayBR(), opts.days ? todayBR(opts.days) : "9999-12-31", opts.platform);
  return games.map(toRelease);
}

export async function getFreeGames(): Promise<FreeGame[]> {
  const free = await repo().freeGames(new Date().toISOString());
  return free.map((f) => ({ ...f, untilLabel: formatDate(f.until), daysLeft: daysUntil(f.until) }));
}

export interface SectionStat {
  slug: SectionSlug;
  label: string;
  total: number;
  latestAgo: string | null;
}

/** Quantidade de posts por editoria (módulos da home). */
export async function getSectionStats(): Promise<SectionStat[]> {
  const now = Date.now();
  const stats = await repo().sectionStats();
  return SECTIONS.map((s) => {
    const st = stats.find((x) => x.section === s.slug);
    return { slug: s.slug, label: s.label, total: st?.total ?? 0, latestAgo: st?.latest ? timeAgo(st.latest, now) : null };
  });
}

let availabilityCache: { at: number; value: Availability } | undefined;

/** O que tem conteúdo (ver availability.ts). Cache de 5 min: uma editoria nova aparece no menu em até 5 min. */
export async function getAvailability(): Promise<Availability> {
  if (availabilityCache && Date.now() - availabilityCache.at < 5 * 60_000) return availabilityCache.value;
  const [stats, platforms, releases] = await Promise.all([
    repo().sectionStats(),
    Promise.all(PLATFORMS.map(async (p) => ((await repo().findPosts({ platform: p.slug }, 0, 1)).total > 0 ? p.slug : null))),
    getReleases(),
  ]);
  const sections = SECTIONS.filter((s) => s.slug === "noticias" || stats.some((x) => x.section === s.slug && x.total > 0)).map((s) => s.slug);
  const value: Availability = { sections, platforms: platforms.filter((p) => p !== null), releases: releases.length > 0 };
  availabilityCache = { at: Date.now(), value };
  return value;
}

/** Números da barra de status do topo. */
export async function getStatus() {
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const [postsToday, releases, free] = await Promise.all([repo().countPostsSince(dayAgo), getReleases({ days: 7 }), getFreeGames()]);
  return { postsToday, releasesWeek: releases.length, freeNow: free.length };
}
