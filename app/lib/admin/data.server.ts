// Consultas e alterações do painel /admin (direto no MySQL).
import type { ResultSetHeader } from "mysql2";
import { db, iso, json, query } from "../db.server.ts";
import { slugify } from "../robot/text.ts";
import { SECTIONS } from "../site.ts";
import type { Block } from "../types.ts";

const TZ_OFFSET_H = 3; // Brasília = UTC-3

/** Início de hoje (Brasília) em UTC, formato do banco. */
function todayStartUTC() {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return `${ymd} 0${TZ_OFFSET_H}:00:00`;
}

// ───────────── Painel ─────────────

export async function dashboard() {
  const today = todayStartUTC();
  const [[counts], [queue], runs, feeds] = await Promise.all([
    query<{ total: number; today: number; week: number; drafts: number }>(
      `SELECT SUM(status = 'published') AS total,
              SUM(status = 'published' AND published_at >= ?) AS today,
              SUM(status = 'published' AND published_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY) AS week,
              SUM(status = 'draft') AS drafts
       FROM posts`,
      [today],
    ),
    query<{ fresh: number; failed24: number }>(
      `SELECT SUM(status = 'new' AND published_at > UTC_TIMESTAMP() - INTERVAL 48 HOUR) AS fresh,
              SUM(status = 'failed' AND created_at > NOW() - INTERVAL 24 HOUR) AS failed24
       FROM feed_items`,
    ),
    query<{ id: number; job: string; status: string; started_at: string; message: string | null }>(
      "SELECT id, job, status, started_at, message FROM cron_runs ORDER BY id DESC LIMIT 8",
    ),
    query<{ name: string; last_error: string | null }>("SELECT name, last_error FROM feeds WHERE active = 1 AND last_error IS NOT NULL"),
  ]);
  return {
    posts: { total: Number(counts.total ?? 0), today: Number(counts.today ?? 0), week: Number(counts.week ?? 0), drafts: Number(counts.drafts ?? 0) },
    queue: { fresh: Number(queue.fresh ?? 0), failed24: Number(queue.failed24 ?? 0) },
    runs: runs.map((r) => ({ ...r, started_at: iso(r.started_at)! })),
    feedErrors: feeds,
  };
}

// ───────────── Matérias ─────────────

export interface AdminPostRow {
  id: number;
  section: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  origin: "auto" | "manual";
  featured: number;
  views: number;
  image_url: string | null;
  published_at: string | null;
}

export async function listPosts(f: { q?: string; section?: string; status?: string; page: number }) {
  const where: string[] = ["1 = 1"];
  const params: unknown[] = [];
  if (f.q) {
    where.push("title LIKE ?");
    params.push(`%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  }
  if (f.section) {
    where.push("section = ?");
    params.push(f.section);
  }
  if (f.status) {
    where.push("status = ?");
    params.push(f.status);
  }
  const per = 30;
  const [rows, [{ total }]] = await Promise.all([
    query<AdminPostRow>(
      `SELECT id, section, slug, title, status, origin, featured, views, image_url, published_at FROM posts
       WHERE ${where.join(" AND ")} ORDER BY COALESCE(published_at, created_at) DESC LIMIT ? OFFSET ?`,
      [...params, per, (f.page - 1) * per],
    ),
    query<{ total: number }>(`SELECT COUNT(*) AS total FROM posts WHERE ${where.join(" AND ")}`, params),
  ]);
  return { rows: rows.map((r) => ({ ...r, published_at: iso(r.published_at) ?? null })), total: Number(total), pages: Math.max(1, Math.ceil(Number(total) / per)) };
}

export interface AdminPost extends AdminPostRow {
  excerpt: string;
  meta_description: string | null;
  focus_keyword: string | null;
  tags: string[];
  platforms: string[];
  image_alt: string | null;
  image_credit: string | null;
  body: Block[];
  source_name: string | null;
  source_url: string | null;
  updated_at: string | null;
  fromRobot: boolean;
}

export async function getPost(id: number): Promise<AdminPost | null> {
  const [r] = await query<Record<string, unknown>>(
    `SELECT p.*, (SELECT COUNT(*) FROM feed_items fi WHERE fi.post_id = p.id) AS items FROM posts p WHERE p.id = ?`,
    [id],
  );
  if (!r) return null;
  return {
    ...(r as unknown as AdminPostRow),
    excerpt: String(r.excerpt),
    meta_description: (r.meta_description as string) ?? null,
    focus_keyword: (r.focus_keyword as string) ?? null,
    tags: json<string[]>(r.tags, []),
    platforms: json<string[]>(r.platforms, []),
    image_alt: (r.image_alt as string) ?? null,
    image_credit: (r.image_credit as string) ?? null,
    body: json<Block[]>(r.body, []),
    source_name: (r.source_name as string) ?? null,
    source_url: (r.source_url as string) ?? null,
    published_at: iso(r.published_at as string) ?? null,
    updated_at: iso(r.updated_at as string) ?? null,
    fromRobot: Number(r.items) > 0,
  };
}

export interface PostEdit {
  title: string;
  excerpt: string;
  metaDescription: string;
  focusKeyword: string;
  tags: string[];
  platforms: string[];
  imageUrl: string;
  imageAlt: string;
  imageCredit: string;
  body: Block[];
}

export async function updatePost(id: number, e: PostEdit) {
  await db().query(
    `UPDATE posts SET title = ?, excerpt = ?, meta_description = ?, focus_keyword = ?, tags = ?, platforms = ?,
       image_url = ?, image_alt = ?, image_credit = ?, body = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?`,
    [
      e.title,
      e.excerpt,
      e.metaDescription || null,
      e.focusKeyword || null,
      JSON.stringify(e.tags),
      JSON.stringify(e.platforms),
      e.imageUrl || null,
      e.imageAlt || null,
      e.imageCredit || null,
      JSON.stringify(e.body),
      id,
    ],
  );
}

/** Endereço livre na editoria ("titulo", "titulo-2"...). */
async function freeSlug(section: string, title: string, exceptId?: number) {
  const base = slugify(title) || "materia";
  const rows = await query<{ slug: string }>("SELECT slug FROM posts WHERE section = ? AND (slug = ? OR slug LIKE ?) AND id <> ?", [section, base, `${base}-%`, exceptId ?? 0]);
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

export const isSection = (s: string) => SECTIONS.some((x) => x.slug === s);

/** Matéria nova escrita no painel: nasce como rascunho e abre no editor. */
export async function createPost(section: string, title: string) {
  const slug = await freeSlug(section, title);
  const [res] = await db().query<ResultSetHeader>(
    `INSERT INTO posts (section, slug, status, origin, title, excerpt, tags, platforms, author, read_minutes, art, body)
     VALUES (?, ?, 'draft', 'manual', ?, '', '[]', '[]', 'Redação Respawnou', 3, 'a', '[]')`,
    [section, slug, title],
  );
  return res.insertId;
}

/**
 * Antes da primeira publicação, editoria e endereço acompanham o título (ninguém linkou ainda).
 * Depois, o endereço fica fixo.
 */
export async function updateDraftAddress(id: number, section: string, title: string) {
  const [p] = await query<{ published_at: string | null; section: string; slug: string }>("SELECT published_at, section, slug FROM posts WHERE id = ?", [id]);
  if (!p || p.published_at) return;
  const target = isSection(section) ? section : p.section;
  const slug = await freeSlug(target, title, id);
  if (target !== p.section || slug !== p.slug) await db().query("UPDATE posts SET section = ?, slug = ? WHERE id = ?", [target, slug, id]);
}

export async function setPostStatus(id: number, status: "draft" | "published" | "archived") {
  // Publicar um rascunho pela primeira vez: a data de publicação passa a ser agora.
  await db().query("UPDATE posts SET status = ?, published_at = IF(? = 'published' AND published_at IS NULL, UTC_TIMESTAMP(), published_at) WHERE id = ?", [
    status,
    status,
    id,
  ]);
}

export async function toggleFeatured(id: number) {
  await db().query("UPDATE posts SET featured = 1 - featured WHERE id = ?", [id]);
}

// ───────────── Fila de pautas ─────────────

export async function listQueue(f: { status: string; page: number }) {
  const per = 50;
  const rows = await query<{ id: number; feed: string; title: string; url: string; status: string; reason: string | null; score: number; published_at: string; post_id: number | null }>(
    `SELECT fi.id, f.name AS feed, fi.title, fi.url, fi.status, fi.reason, fi.score, fi.published_at, fi.post_id
     FROM feed_items fi JOIN feeds f ON f.id = fi.feed_id WHERE fi.status = ?
     ORDER BY ${f.status === "new" ? "fi.score DESC, fi.published_at DESC" : "fi.id DESC"} LIMIT ? OFFSET ?`,
    [f.status, per, (f.page - 1) * per],
  );
  const counts = await query<{ status: string; total: number }>(
    "SELECT status, COUNT(*) AS total FROM feed_items WHERE created_at > NOW() - INTERVAL 7 DAY OR status = 'new' GROUP BY status",
  );
  return {
    rows: rows.map((r) => ({ ...r, published_at: iso(r.published_at)! })),
    counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.total)])) as Record<string, number>,
  };
}

export async function setItemStatus(id: number, status: "new" | "skipped") {
  await db().query("UPDATE feed_items SET status = ?, reason = ? WHERE id = ? AND status <> 'used'", [status, status === "skipped" ? "descartada no painel" : null, id]);
}

// ───────────── Fontes ─────────────

export async function listFeeds() {
  const rows = await query<{ id: number; name: string; url: string; weight: number; active: number; last_fetched_at: string | null; last_error: string | null; items7d: number; used7d: number }>(
    `SELECT f.id, f.name, f.url, f.weight, f.active, f.last_fetched_at, f.last_error,
       (SELECT COUNT(*) FROM feed_items fi WHERE fi.feed_id = f.id AND fi.created_at > NOW() - INTERVAL 7 DAY) AS items7d,
       (SELECT COUNT(*) FROM feed_items fi WHERE fi.feed_id = f.id AND fi.status = 'used' AND fi.created_at > NOW() - INTERVAL 7 DAY) AS used7d
     FROM feeds f ORDER BY f.active DESC, f.weight DESC, f.name`,
  );
  return rows.map((r) => ({ ...r, last_fetched_at: iso(r.last_fetched_at) ?? null, items7d: Number(r.items7d), used7d: Number(r.used7d) }));
}

export async function updateFeed(id: number, active: boolean, weight: number) {
  await db().query("UPDATE feeds SET active = ?, weight = ? WHERE id = ?", [active ? 1 : 0, Math.max(1, Math.min(10, weight)), id]);
}

export async function addFeed(name: string, url: string, weight: number) {
  const [res] = await db().query<ResultSetHeader>("INSERT IGNORE INTO feeds (name, url, language, weight) VALUES (?, ?, 'en', ?)", [
    name,
    url,
    Math.max(1, Math.min(10, weight)),
  ]);
  return res.affectedRows > 0;
}

// ───────────── Configurações ─────────────

export const SETTING_KEYS = ["robot_enabled", "posts_per_day", "robot_sections", "robot_min_words", "robot_start_hour", "robot_end_hour"] as const;

export async function getSettings() {
  const rows = await query<{ name: string; value: unknown }>("SELECT name, value FROM settings");
  const get = <T>(name: string, fallback: T) => json<T>(rows.find((r) => r.name === name)?.value, fallback);
  return {
    robot_enabled: get("robot_enabled", false),
    posts_per_day: get("posts_per_day", 4),
    robot_sections: get<string[]>("robot_sections", ["noticias"]),
    robot_min_words: get("robot_min_words", 350),
    robot_start_hour: get("robot_start_hour", 8),
    robot_end_hour: get("robot_end_hour", 22),
  };
}

export async function saveSettings(values: Record<(typeof SETTING_KEYS)[number], unknown>) {
  for (const key of SETTING_KEYS) {
    await db().query("INSERT INTO settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [key, JSON.stringify(values[key])]);
  }
}
