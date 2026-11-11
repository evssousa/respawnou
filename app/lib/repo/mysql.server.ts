// Fonte de dados MySQL (produção). Estrutura das tabelas em db/migrations/.
import { iso, json, query } from "../db.server";
import { SECTIONS, type PlatformSlug, type SectionSlug } from "../site";
import type { ArtVariant, Block, Game, Post, Review } from "../types";
import type { PostFilter, Repo } from "./types";

// ───────────── Linhas do banco → tipos do site ─────────────

interface PostRow {
  section: SectionSlug;
  slug: string;
  title: string;
  excerpt: string;
  tag: string | null;
  platforms: unknown;
  game_slug: string | null;
  author: string;
  read_minutes: number;
  art: string;
  image_url: string | null;
  image_alt: string | null;
  image_credit: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  tags?: unknown;
  body?: unknown;
  review: unknown;
  featured: number;
  views: number;
  source_name: string | null;
  source_url: string | null;
  published_at: string;
  updated_at: string | null;
}

interface GameRow {
  slug: string;
  name: string;
  platforms: unknown;
  release_date: string | null;
  developer: string;
  publisher: string;
  genres: unknown;
  description: string;
  art: string;
}

const art = (v: string): ArtVariant => (["a", "b", "c", "d"].includes(v) ? (v as ArtVariant) : "a");

function toPost(r: PostRow): Post {
  return {
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    section: r.section,
    tag: r.tag ?? undefined,
    platforms: json<PlatformSlug[]>(r.platforms, []),
    gameSlug: r.game_slug ?? undefined,
    publishedAt: iso(r.published_at)!,
    updatedAt: iso(r.updated_at),
    author: r.author,
    readMinutes: r.read_minutes,
    art: art(r.art),
    image: r.image_url ? { src: r.image_url, alt: r.image_alt ?? r.title, credit: r.image_credit ?? undefined } : undefined,
    metaDescription: r.meta_description ?? undefined,
    focusKeyword: r.focus_keyword ?? undefined,
    tags: json<string[] | undefined>(r.tags, undefined),
    body: json<Block[]>(r.body, []),
    review: json<Review | undefined>(r.review, undefined),
    featured: Boolean(r.featured),
    views: r.views,
    source: r.source_name && r.source_url ? { name: r.source_name, url: r.source_url } : undefined,
  };
}

function toGame(r: GameRow): Game {
  return {
    slug: r.slug,
    name: r.name,
    platforms: json<PlatformSlug[]>(r.platforms, []),
    releaseDate: r.release_date ?? undefined,
    developer: r.developer,
    publisher: r.publisher,
    genres: json<string[]>(r.genres, []),
    description: r.description,
    art: art(r.art),
  };
}

// Listagens não precisam do corpo do texto: evita trafegar o JSON inteiro.
const POST_COLS = `p.section, p.slug, p.title, p.excerpt, p.tag, p.platforms, g.slug AS game_slug, p.author, p.read_minutes,
  p.art, p.image_url, p.image_alt, p.image_credit, p.review, p.featured, p.views, p.source_name, p.source_url, p.published_at, p.updated_at`;
const FROM_POSTS = `FROM posts p LEFT JOIN games g ON g.id = p.game_id`;
const PUBLISHED = `p.status = 'published' AND p.published_at <= UTC_TIMESTAMP()`;

function where(f: PostFilter) {
  const sql = [PUBLISHED];
  const params: unknown[] = [];
  if (f.section) {
    sql.push("p.section = ?");
    params.push(f.section);
  }
  if (f.platform) {
    sql.push("JSON_CONTAINS(p.platforms, ?)");
    params.push(JSON.stringify(f.platform));
  }
  if (f.gameSlug) {
    sql.push("g.slug = ?");
    params.push(f.gameSlug);
  }
  if (f.exclude?.length) {
    sql.push(`p.slug NOT IN (${f.exclude.map(() => "?").join(",")})`);
    params.push(...f.exclude);
  }
  return { sql: sql.join(" AND "), params };
}

const like = (t: string) => `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const GAME_COLS = `slug, name, platforms, release_date, developer, publisher, genres, description, art`;

export const mysqlRepo: Repo = {
  async findPosts(filter, offset, limit) {
    const w = where(filter);
    const [rows, count] = await Promise.all([
      query<PostRow>(`SELECT ${POST_COLS} ${FROM_POSTS} WHERE ${w.sql} ORDER BY p.published_at DESC LIMIT ? OFFSET ?`, [...w.params, limit, offset]),
      query<{ total: number }>(`SELECT COUNT(*) AS total ${FROM_POSTS} WHERE ${w.sql}`, w.params),
    ]);
    return { items: rows.map(toPost), total: Number(count[0]?.total ?? 0) };
  },

  async findFeatured() {
    const rows = await query<PostRow>(`SELECT ${POST_COLS} ${FROM_POSTS} WHERE ${PUBLISHED} ORDER BY p.featured DESC, p.published_at DESC LIMIT 1`);
    return rows[0] ? toPost(rows[0]) : null;
  },

  async findMostRead(limit, exclude) {
    const w = where({ exclude });
    // "Mais lidas" da última semana, para a lista não ficar parada nos mesmos posts antigos.
    const rows = await query<PostRow>(
      `SELECT ${POST_COLS} ${FROM_POSTS} WHERE ${w.sql} AND p.published_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY ORDER BY p.views DESC LIMIT ?`,
      [...w.params, limit],
    );
    return rows.map(toPost);
  },

  async findPost(section, slug) {
    const rows = await query<PostRow>(`SELECT ${POST_COLS}, p.body, p.meta_description, p.focus_keyword, p.tags ${FROM_POSTS} WHERE ${PUBLISHED} AND p.section = ? AND p.slug = ? LIMIT 1`, [section, slug]);
    return rows[0] ? toPost(rows[0]) : null;
  },

  async allPosts(limit = 50000) {
    const rows = await query<PostRow>(`SELECT ${POST_COLS} ${FROM_POSTS} WHERE ${PUBLISHED} ORDER BY p.published_at DESC LIMIT ?`, [limit]);
    return rows.map(toPost);
  },

  async searchPosts(terms, limit) {
    // A collation utf8mb4_unicode_ci já ignora acentos e maiúsculas no LIKE.
    const conds = terms.map(() => "(p.title LIKE ? OR p.excerpt LIKE ? OR g.name LIKE ? OR CAST(p.body AS CHAR) LIKE ?)");
    const params = terms.flatMap((t) => [like(t), like(t), like(t), like(t)]);
    const rows = await query<PostRow>(
      `SELECT ${POST_COLS} ${FROM_POSTS} WHERE ${PUBLISHED} AND ${conds.join(" AND ")} ORDER BY p.published_at DESC LIMIT ?`,
      [...params, limit],
    );
    return rows.map(toPost);
  },

  async countPostsSince(isoDate) {
    const rows = await query<{ total: number }>(`SELECT COUNT(*) AS total FROM posts p WHERE ${PUBLISHED} AND p.published_at >= ?`, [
      isoDate.slice(0, 19).replace("T", " "),
    ]);
    return Number(rows[0]?.total ?? 0);
  },

  async sectionStats() {
    const rows = await query<{ section: SectionSlug; total: number; latest: string | null }>(
      `SELECT p.section, COUNT(*) AS total, MAX(p.published_at) AS latest FROM posts p WHERE ${PUBLISHED} GROUP BY p.section`,
    );
    return SECTIONS.map((s) => {
      const r = rows.find((x) => x.section === s.slug);
      return { section: s.slug, total: Number(r?.total ?? 0), latest: iso(r?.latest) ?? null };
    });
  },

  async findGame(slug) {
    const rows = await query<GameRow>(`SELECT ${GAME_COLS} FROM games WHERE slug = ? LIMIT 1`, [slug]);
    return rows[0] ? toGame(rows[0]) : null;
  },

  async allGames() {
    return (await query<GameRow>(`SELECT ${GAME_COLS} FROM games ORDER BY name`)).map(toGame);
  },

  async searchGames(q, limit) {
    const rows = await query<GameRow>(
      `SELECT ${GAME_COLS} FROM games WHERE name LIKE ? OR developer LIKE ? OR CAST(genres AS CHAR) LIKE ? ORDER BY name LIMIT ?`,
      [like(q), like(q), like(q), limit],
    );
    return rows.map(toGame);
  },

  async findReleases(from, to, platform) {
    const params: unknown[] = [from, to];
    let extra = "";
    if (platform) {
      extra = " AND JSON_CONTAINS(platforms, ?)";
      params.push(JSON.stringify(platform));
    }
    const rows = await query<GameRow>(`SELECT ${GAME_COLS} FROM games WHERE release_date BETWEEN ? AND ?${extra} ORDER BY release_date, name`, params);
    return rows.map(toGame);
  },

  async freeGames(nowIso) {
    const rows = await query<{ name: string; store: string; platform: string; ends_at: string; url: string }>(
      `SELECT name, store, platform, ends_at, url FROM free_games WHERE ends_at >= ? AND (starts_at IS NULL OR starts_at <= ?) ORDER BY ends_at`,
      [nowIso.slice(0, 19).replace("T", " "), nowIso.slice(0, 19).replace("T", " ")],
    );
    return rows.map((r) => ({ name: r.name, store: r.store, platform: r.platform, until: iso(r.ends_at)!, url: r.url }));
  },
};
