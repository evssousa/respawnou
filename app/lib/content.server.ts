// Camada de dados do site. Só roda no servidor (sufixo .server).
//
// Hoje lê os dados de exemplo em mock-data.ts. Quando o MySQL da Hostinger estiver pronto,
// basta reimplementar estas funções com consultas ao banco: as rotas não precisam mudar.
import { MOCK_FREE_GAMES, MOCK_GAMES, MOCK_POSTS } from "./mock-data";
import { formatDate, formatDay, formatMonthShort, formatWeekday, normalize, timeAgo } from "./format";
import { sectionBySlug, type PlatformSlug, type SectionSlug } from "./site";
import type { FreeGame, Game, Post, PostView, Release } from "./types";

export const postUrl = (p: Pick<Post, "section" | "slug">) => `/${p.section}/${p.slug}`;

function toView(post: Post, now = Date.now()): PostView {
  const { body: _body, ...rest } = post;
  return {
    ...rest,
    url: postUrl(post),
    kicker: post.tag ?? sectionBySlug(post.section)?.kicker ?? "Notícias",
    ago: timeAgo(post.publishedAt, now),
    dateLabel: formatDate(post.publishedAt),
  };
}

const byDateDesc = (a: Post, b: Post) => b.publishedAt.localeCompare(a.publishedAt);

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
  const { section, platform, gameSlug, exclude = [], page = 1, perPage = 12 } = opts;
  const filtered = MOCK_POSTS.filter(
    (p) =>
      (!section || p.section === section) &&
      (!platform || p.platforms.includes(platform)) &&
      (!gameSlug || p.gameSlug === gameSlug) &&
      !exclude.includes(p.slug),
  ).sort(byDateDesc);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  const now = Date.now();
  return {
    items: filtered.slice((current - 1) * perPage, current * perPage).map((p) => toView(p, now)),
    page: current,
    totalPages,
    total: filtered.length,
  };
}

export async function getFeatured(): Promise<PostView> {
  const post = MOCK_POSTS.filter((p) => p.featured).sort(byDateDesc)[0] ?? [...MOCK_POSTS].sort(byDateDesc)[0];
  return toView(post);
}

export async function getMostRead(limit = 5, exclude: string[] = []): Promise<PostView[]> {
  const now = Date.now();
  return [...MOCK_POSTS]
    .filter((p) => !exclude.includes(p.slug))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
    .map((p) => toView(p, now));
}

export async function getPost(section: string, slug: string) {
  const post = MOCK_POSTS.find((p) => p.section === section && p.slug === slug);
  if (!post) return null;
  return { ...toView(post), body: post.body };
}

export async function getAllPosts(): Promise<Post[]> {
  return [...MOCK_POSTS].sort(byDateDesc);
}

export async function searchPosts(query: string): Promise<PostView[]> {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const now = Date.now();
  return MOCK_POSTS.filter((p) => {
    const game = p.gameSlug ? MOCK_GAMES.find((g) => g.slug === p.gameSlug)?.name ?? "" : "";
    const haystack = normalize([p.title, p.excerpt, p.tag ?? "", game, ...p.body.map((b) => ("text" in b ? b.text : b.items.join(" ")))].join(" "));
    return terms.every((t) => haystack.includes(t));
  })
    .sort(byDateDesc)
    .map((p) => toView(p, now));
}

export async function getGame(slug: string): Promise<Game | null> {
  return MOCK_GAMES.find((g) => g.slug === slug) ?? null;
}

export async function getAllGames(): Promise<Game[]> {
  return MOCK_GAMES;
}

export async function searchGames(query: string): Promise<Game[]> {
  const q = normalize(query.trim());
  if (!q) return [];
  return MOCK_GAMES.filter((g) => normalize(`${g.name} ${g.genres.join(" ")} ${g.developer}`).includes(q));
}

function toRelease(game: Game): Release {
  const date = game.releaseDate!;
  return { game, date, day: formatDay(date), monthShort: formatMonthShort(date), weekday: formatWeekday(date) };
}

/** Próximos lançamentos a partir de hoje. `days` limita a janela (ex.: 7 = esta semana). */
export async function getReleases(opts: { days?: number; platform?: PlatformSlug } = {}): Promise<Release[]> {
  const today = new Date().toISOString().slice(0, 10);
  const limit = opts.days ? new Date(Date.now() + opts.days * 86400000).toISOString().slice(0, 10) : "9999-12-31";
  return MOCK_GAMES.filter(
    (g) => g.releaseDate && g.releaseDate >= today && g.releaseDate <= limit && (!opts.platform || g.platforms.includes(opts.platform)),
  )
    .sort((a, b) => a.releaseDate!.localeCompare(b.releaseDate!))
    .map(toRelease);
}

export async function getFreeGames(): Promise<FreeGame[]> {
  return MOCK_FREE_GAMES.map((f) => ({ ...f, untilLabel: formatDate(f.until) }));
}
