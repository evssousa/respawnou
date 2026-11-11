// Robô de postagem do Respawnou. Chamado pelas rotas /api/cron/* (Cron Job da Hostinger).
// Regras de qualidade: docs/adsense.md. Arquitetura: docs/automacao.md.
import { createHash } from "node:crypto";
import type { ResultSetHeader } from "mysql2";
import { db, json, query } from "../db.server.ts";
import { diagnose, generateJson, GeminiError } from "./gemini.server.ts";
import { fetchFeed } from "./rss.server.ts";
import { keywords, similarity, slugify } from "./text.ts";
import { localizeImages, writeArticle, type BuiltArticle, type SourceItem } from "./writer.server.ts";

const TZ = "America/Sao_Paulo";

// ───────────── Configurações (tabela settings) ─────────────

interface Settings {
  enabled: boolean;
  postsPerDay: number;
  sections: string[];
  minWords: number;
  /** Janela do dia (horário de Brasília) em que o robô publica. */
  startHour: number;
  endHour: number;
}

async function settings(): Promise<Settings> {
  const rows = await query<{ name: string; value: unknown }>("SELECT name, value FROM settings");
  const get = <T>(name: string, fallback: T) => json<T>(rows.find((r) => r.name === name)?.value, fallback);
  return {
    enabled: get("robot_enabled", false),
    postsPerDay: get("posts_per_day", 4),
    sections: get("robot_sections", ["noticias"]),
    minWords: get("robot_min_words", 300),
    startHour: get("robot_start_hour", 8),
    endHour: get("robot_end_hour", 22),
  };
}

// ───────────── Registro das execuções (cron_runs) ─────────────

const sqlNow = (d = new Date()) => d.toISOString().slice(0, 19).replace("T", " ");

async function startRun(job: string) {
  // Execução que ficou "running" por mais de 10 min foi interrompida (deploy/reinício do app).
  await db().query(
    "UPDATE cron_runs SET status = 'error', finished_at = UTC_TIMESTAMP(), message = 'Interrompida (o app reiniciou no meio, provavelmente por um deploy).' WHERE status = 'running' AND started_at < UTC_TIMESTAMP() - INTERVAL 10 MINUTE",
  );
  // Trava simples: outra execução do mesmo job há menos de 10 min ainda "rodando".
  const running = await query<{ id: number }>(
    "SELECT id FROM cron_runs WHERE job = ? AND status = 'running' AND started_at > UTC_TIMESTAMP() - INTERVAL 10 MINUTE LIMIT 1",
    [job],
  );
  if (running.length) return null;
  const [res] = await db().query<ResultSetHeader>("INSERT INTO cron_runs (job, status, started_at) VALUES (?, 'running', UTC_TIMESTAMP())", [job]);
  return res.insertId;
}

async function finishRun(id: number, status: "ok" | "error" | "skipped", message: string, stats: object = {}) {
  await db().query("UPDATE cron_runs SET status = ?, finished_at = UTC_TIMESTAMP(), message = ?, stats = ? WHERE id = ?", [
    status,
    message.slice(0, 1000),
    JSON.stringify(stats),
    id,
  ]);
}

export interface JobResult {
  status: "ok" | "error" | "skipped";
  message: string;
  stats?: Record<string, unknown>;
  post?: unknown;
}

async function runJob(job: string, fn: () => Promise<JobResult>): Promise<JobResult> {
  const id = await startRun(job);
  if (!id) return { status: "skipped", message: "Outra execução ainda está em andamento." };
  try {
    const result = await fn();
    // A rota responde antes de o job terminar (a CDN corta em ~1 min); o resultado completo,
    // inclusive o rascunho de um teste (dry), fica em cron_runs.stats para /api/cron/status.
    await finishRun(id, result.status, result.message, { ...result.stats, ...(result.post ? { post: result.post } : {}) });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishRun(id, "error", message);
    return { status: "error", message };
  }
}

/** Últimas execuções do robô (para /api/cron/status). */
export async function recentRuns(limit = 10) {
  const rows = await query<{ id: number; job: string; status: string; started_at: string; finished_at: string | null; message: string | null; stats: unknown }>(
    "SELECT id, job, status, started_at, finished_at, message, stats FROM cron_runs ORDER BY id DESC LIMIT ?",
    [limit],
  );
  return rows.map((r) => ({ ...r, stats: json<Record<string, unknown>>(r.stats, {}) }));
}

/** Teste dos modelos do Gemini; o resultado fica em cron_runs.stats (job "diag"). */
export function diag(): Promise<JobResult> {
  return runJob("diag", async () => {
    const stats = await diagnose();
    const ok = stats.tests.filter((t) => t.ok).map((t) => t.model);
    return { status: "ok", message: ok.length ? `Respondendo: ${ok.join(", ")}` : "Nenhum modelo respondeu", stats };
  });
}

// ───────────── Coleta ─────────────

// Assuntos que não viram matéria automática (opinião, review de terceiros, sorteios, etc.).
const SKIP_PATTERNS: [RegExp, string][] = [
  [/\breview\b|\banalise\b|\bimpressions?\b|\bhands[- ]on\b|\bpreview\b/i, "review/impressões de terceiros (não reescrevemos opinião)"],
  [/\bquiz\b|\bpodcast\b|\bpoll\b|\bgiveaway\b|\bwin an?\b|\bsweepstakes\b/i, "quiz, podcast ou sorteio"],
  [/\b(best|cheapest)\b.*\b(deals?|prices?)\b|\bdeal of the day\b|\bblack friday\b.*\bdeals?\b|\bcyber monday\b/i, "lista de ofertas de loja"],
  // Oferta de varejo (Amazon/Walmart dos EUA, preço em dólar): pouco valor para o leitor brasileiro
  // e cara de afiliado. Promoções do site = jogo grátis, PS Plus, Game Pass, liquidação de loja digital.
  // ("Xbox signs deal with Riot" é notícia: "deal" sozinho não conta.)
  [
    /\bdeals? (on|for|at)\b|\bon sale\b|\b\d+% off\b|\bblack friday\b|\bprime day\b|\b(amazon|walmart|best buy|target)\b.*\b(price|discount|sale|cheap|deal)|\b(lowest|record[- ]low) price\b|\bprice (drop|cut)\b.*\b(amazon|walmart|best buy|target)\b/i,
    "oferta de varejo",
  ],
  [/\bwordle\b|\bconnections\b.*\bhints?\b|\bnyt\b|\bcrossword\b|\bstrands\b/i, "fora do tema (passatempos)"],
  [/\b(movie|film|tv series|tv show|netflix|hbo|box office)\b/i, "cinema/TV"],
  [/\btalking point\b|\bopinion\b|\bfeature:|\bsoapbox\b|\bi (tried|played|feel|think|love|hate|spent|was)\b|\bwhy i\b|\bi'm\b/i, "texto de opinião"],
];

const BOOST: [RegExp, number][] = [
  [/\b(announce[sd]?|reveal(ed|s)?|confirm(ed|s)?|launch(es|ed)?|release date|delay(ed|s)?|cancel(led|s|ed)?)\b/i, 15],
  [/\b(free|ps plus|game pass|epic games store)\b/i, 10],
  [/\b(update|patch|season|dlc|expansion|trailer|showcase|direct|state of play)\b/i, 8],
  [/\b(ps5|xbox|switch 2|switch|steam|nintendo|playstation)\b/i, 5],
];

function scoreItem(title: string, weight: number) {
  let score = weight * 10;
  for (const [re, pts] of BOOST) if (re.test(title)) score += pts;
  return score;
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

export function collect(): Promise<JobResult> {
  return runJob("coletar", async () => {
    const feeds = await query<{ id: number; name: string; url: string; weight: number }>("SELECT id, name, url, weight FROM feeds WHERE active = 1");
    const cutoff = Date.now() - 48 * 3600_000;
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const feed of feeds) {
      try {
        const items = await fetchFeed(feed.url);
        for (const it of items) {
          if (!it.publishedAt || it.publishedAt.getTime() < cutoff || it.publishedAt.getTime() > Date.now() + 3600_000) continue;
          const skip = SKIP_PATTERNS.find(([re]) => re.test(it.title));
          const [res] = await db().query<ResultSetHeader>(
            `INSERT IGNORE INTO feed_items (feed_id, guid_hash, title, url, summary, media, published_at, status, score, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              feed.id,
              hash(it.guid || it.url),
              it.title.slice(0, 400),
              it.url.slice(0, 600),
              it.summary.slice(0, 20000),
              JSON.stringify(it.media),
              sqlNow(it.publishedAt),
              skip ? "skipped" : "new",
              scoreItem(it.title, feed.weight),
              skip ? skip[1] : null,
            ],
          );
          if (res.affectedRows) skip ? skipped++ : added++;
        }
        await db().query("UPDATE feeds SET last_fetched_at = UTC_TIMESTAMP(), last_error = NULL WHERE id = ?", [feed.id]);
      } catch (err) {
        // "fetch failed" sozinho não diz nada: inclui a causa (DNS, TLS, conexão recusada...).
        const cause = err instanceof Error && err.cause instanceof Error ? ` (${(err.cause as Error & { code?: string }).code ?? ""} ${err.cause.message})` : "";
        const msg = `${err instanceof Error ? err.message : String(err)}${cause}`;
        errors.push(`${feed.name}: ${msg}`);
        await db().query("UPDATE feeds SET last_fetched_at = UTC_TIMESTAMP(), last_error = ? WHERE id = ?", [msg.slice(0, 500), feed.id]);
      }
    }

    // Itens velhos que nunca foram usados saem da fila.
    await db().query("UPDATE feed_items SET status = 'skipped', reason = 'expirou (mais de 48 h)' WHERE status = 'new' AND published_at < UTC_TIMESTAMP() - INTERVAL 48 HOUR");

    return {
      status: errors.length === feeds.length && feeds.length ? "error" : "ok",
      message: `${added} novos na fila, ${skipped} descartados${errors.length ? `; falhas: ${errors.join(" | ")}` : ""}`,
      stats: { feeds: feeds.length, added, skipped, errors: errors.length },
    };
  });
}

// ───────────── Publicação ─────────────

/** Dia de hoje no fuso de Brasília, como intervalo UTC para o banco. */
function todayRangeUTC() {
  const now = new Date();
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
  // Brasília é UTC-3 (sem horário de verão desde 2019).
  const start = new Date(`${ymd}T03:00:00Z`);
  return { start: sqlNow(start), hour: Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now)) };
}

async function uniqueSlug(section: string, base: string) {
  const slug = base || "materia";
  const rows = await query<{ slug: string }>("SELECT slug FROM posts WHERE section = ? AND (slug = ? OR slug LIKE ?)", [section, slug, `${slug}-%`]);
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(slug)) return slug;
  for (let i = 2; ; i++) if (!taken.has(`${slug}-${i}`)) return `${slug}-${i}`;
}

/** Matérias do site para link interno: as que dividem palavras com o assunto vêm primeiro. */
async function relatedPosts(titles: string[], excludeId?: number) {
  const rows = await query<{ id: number; section: string; slug: string; title: string }>(
    `SELECT id, section, slug, title FROM posts WHERE status = 'published' AND published_at <= UTC_TIMESTAMP()
     AND published_at > UTC_TIMESTAMP() - INTERVAL 120 DAY ORDER BY published_at DESC LIMIT 200`,
  );
  const kw = new Set(titles.flatMap((t) => [...keywords(t)]));
  return rows
    .filter((r) => r.id !== excludeId)
    .map((r, i) => ({ r, score: [...keywords(r.title)].filter((w) => kw.has(w)).length * 10 - i / 100 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ r }) => ({ title: r.title, url: `/${r.section}/${r.slug}` }));
}

/** Fontes do mesmo assunto (outros veículos) entram juntas: mais contexto, texto mais original. */
function groupFor(item: SourceItem, queue: SourceItem[]) {
  const kw = keywords(item.title);
  return [item, ...queue.filter((q) => q.id !== item.id && q.feed_id !== item.feed_id && similarity(kw, keywords(q.title)) >= 0.5).slice(0, 2)];
}

export interface PublishOptions {
  /** Gera e devolve a matéria sem gravar nada (teste). */
  dry?: boolean;
  /** Ignora horário, limite diário e intervalo (não ignora robot_enabled, exceto em dry). */
  force?: boolean;
  /** Reescreve um post já publicado (mesmo endereço) com as regras atuais. */
  redoPostId?: number;
}

const ITEM_COLS = `fi.id, fi.feed_id, f.name AS feed_name, fi.title, fi.url, fi.summary, fi.media, fi.published_at`;

function geminiFailure(err: unknown): JobResult | null {
  // Limite do plano gratuito ou instabilidade: não queima a pauta; tenta de novo na próxima execução.
  if (err instanceof GeminiError && err.isRateLimit) return { status: "error", message: `Limite do Gemini atingido; nova tentativa na próxima execução. (${err.message})` };
  if (err instanceof GeminiError && err.isTransient) return { status: "error", message: `Gemini indisponível; nova tentativa na próxima execução. (${err.message})` };
  return null;
}

/** Resumo do que foi gerado (para o teste dry e o registro em cron_runs). */
function summary(a: BuiltArticle, slug: string) {
  return {
    url: `/${a.section}/${slug}`,
    title: a.title,
    focusKeyword: a.focusKeyword,
    metaDescription: a.metaDescription,
    excerpt: a.excerpt,
    tags: a.tags,
    platforms: a.platforms,
    cover: { url: a.cover.url, size: `${a.cover.width}x${a.cover.height}` },
    images: a.bodyImages.length,
    video: a.video?.youtubeId ?? null,
    words: a.words,
    model: a.model,
    attempts: a.attempts,
    fixes: a.fixes,
    sources: a.sources.map((s) => s.name),
    body: a.body,
  };
}

export function publish(opts: PublishOptions = {}): Promise<JobResult> {
  const job = opts.dry ? "publicar-teste" : opts.redoPostId ? "refazer" : "publicar";
  return runJob(job, async () => {
    const cfg = await settings();
    if (opts.redoPostId) return redo(opts.redoPostId, cfg, Boolean(opts.dry));
    if (!cfg.enabled && !opts.dry) return { status: "skipped", message: "Robô desligado (settings.robot_enabled)." };

    if (!opts.force && !opts.dry) {
      const { start, hour } = todayRangeUTC();
      if (hour < cfg.startHour || hour >= cfg.endHour) return { status: "skipped", message: `Fora do horário de publicação (${hour}h).` };
      const [{ total }] = await query<{ total: number }>("SELECT COUNT(*) AS total FROM posts WHERE origin = 'auto' AND published_at >= ?", [start]);
      if (Number(total) >= cfg.postsPerDay) return { status: "skipped", message: `Limite diário atingido (${total}/${cfg.postsPerDay}).` };
      // Espalha os posts pelo dia: intervalo mínimo entre publicações automáticas.
      const gapHours = Math.max(1, Math.floor((cfg.endHour - cfg.startHour) / cfg.postsPerDay));
      const recent = await query<{ id: number }>("SELECT id FROM posts WHERE origin = 'auto' AND published_at > UTC_TIMESTAMP() - INTERVAL ? HOUR LIMIT 1", [gapHours]);
      if (recent.length) return { status: "skipped", message: `Aguardando o intervalo de ${gapHours} h entre posts.` };
    }

    const queue = await query<SourceItem>(
      `SELECT ${ITEM_COLS} FROM feed_items fi JOIN feeds f ON f.id = fi.feed_id
       WHERE fi.status = 'new' AND fi.published_at > UTC_TIMESTAMP() - INTERVAL 48 HOUR
       ORDER BY fi.score DESC, fi.published_at DESC LIMIT 60`,
    );
    if (!queue.length) return { status: "skipped", message: "Fila vazia: nenhuma pauta nova." };
    const recentTitles = (
      await query<{ title: string }>("SELECT title FROM posts WHERE status = 'published' AND published_at > UTC_TIMESTAMP() - INTERVAL 5 DAY ORDER BY published_at DESC LIMIT 40")
    ).map((r) => r.title);

    const tried: string[] = [];
    // Até 3 pautas por execução: se uma for descartada, tenta a próxima.
    for (const item of queue.slice(0, 3)) {
      const group = groupFor(item, queue);
      let result;
      try {
        result = await writeArticle(group, {
          sections: cfg.sections,
          minWords: cfg.minWords,
          recentTitles,
          related: await relatedPosts(group.map((g) => g.title)),
        });
      } catch (err) {
        const fail = geminiFailure(err);
        if (fail) return { ...fail, stats: { tried } };
        throw err;
      }
      if (!result.ok) {
        tried.push(`#${item.id}: ${result.reason}`);
        if (!opts.dry) await markItems([item.id], result.status, result.reason);
        continue;
      }
      const a = result.article;
      const slug = await uniqueSlug(a.section, slugify(a.title));
      if (opts.dry) return { status: "ok", message: `Teste: matéria gerada (${a.words} palavras), nada foi gravado.`, post: summary(a, slug), stats: { tried } };

      const local = await localizeImages(a, slug);
      const [res] = await db().query<ResultSetHeader>(
        `INSERT INTO posts (section, slug, status, origin, title, excerpt, meta_description, focus_keyword, tags, platforms, author, read_minutes, art,
           image_url, image_alt, image_credit, body, source_name, source_url, published_at)
         VALUES (?, ?, 'published', 'auto', ?, ?, ?, ?, ?, ?, 'Redação Respawnou', ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          a.section,
          slug,
          a.title,
          a.excerpt,
          a.metaDescription,
          a.focusKeyword,
          JSON.stringify(a.tags),
          JSON.stringify(a.platforms),
          a.readMinutes,
          "abcd"[item.id % 4],
          local.cover.src,
          a.coverAlt,
          local.coverCredit,
          JSON.stringify(local.body),
          item.feed_name,
          item.url,
        ],
      );
      await markItems([item.id], "used", null, res.insertId);
      // O mesmo assunto em outros veículos não vira outro post: marca tudo que se parece
      // com qualquer fonte do grupo (pega também quem só se parece com uma fonte relacionada).
      const groupKw = group.map((g) => keywords(g.title));
      const sameTopic = queue.filter((q) => q.id !== item.id && groupKw.some((k) => similarity(k, keywords(q.title)) >= 0.5));
      await markItems(sameTopic.map((r) => r.id), "skipped", `mesmo assunto do post #${res.insertId}`);
      return {
        status: "ok",
        message: `Publicado: /${a.section}/${slug} (${a.words} palavras, ${a.bodyImages.length + 1} imagens${a.video ? ", vídeo" : ""}, fontes: ${a.sources.map((s) => s.name).join(", ")})`,
        stats: { postId: res.insertId, words: a.words, model: a.model, attempts: a.attempts, fixes: a.fixes, tried },
      };
    }
    return { status: "skipped", message: `Nenhuma pauta aproveitada nesta execução. ${tried.join(" · ")}`, stats: { tried } };
  });
}

/** Reescreve um post (mesmo endereço e data) a partir das pautas que o originaram. */
async function redo(postId: number, cfg: Settings, dry: boolean): Promise<JobResult> {
  const [post] = await query<{ id: number; section: string; slug: string }>("SELECT id, section, slug FROM posts WHERE id = ?", [postId]);
  if (!post) return { status: "error", message: `Post #${postId} não existe.` };
  const items = await query<SourceItem & { status: string }>(
    `SELECT ${ITEM_COLS}, fi.status FROM feed_items fi JOIN feeds f ON f.id = fi.feed_id
     WHERE fi.post_id = ? OR fi.reason = ? ORDER BY fi.status = 'used' DESC, fi.score DESC`,
    [postId, `mesmo assunto do post #${postId}`],
  );
  const main = items.find((i) => i.status === "used");
  if (!main) return { status: "error", message: `Post #${postId} não tem pauta de origem (não foi feito pelo robô).` };
  const group = groupFor(main, items);
  let result;
  try {
    result = await writeArticle(group, {
      sections: [post.section],
      minWords: cfg.minWords,
      recentTitles: [],
      related: await relatedPosts(group.map((g) => g.title), postId),
    });
  } catch (err) {
    const fail = geminiFailure(err);
    if (fail) return fail;
    throw err;
  }
  if (!result.ok) return { status: "error", message: `Não deu para refazer: ${result.reason}` };
  const a = result.article;
  if (dry) return { status: "ok", message: `Teste: post #${postId} refeito (${a.words} palavras), nada foi gravado.`, post: summary(a, post.slug) };
  const local = await localizeImages(a, post.slug);
  await db().query(
    `UPDATE posts SET title = ?, excerpt = ?, meta_description = ?, focus_keyword = ?, tags = ?, platforms = ?, read_minutes = ?,
       image_url = ?, image_alt = ?, image_credit = ?, body = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?`,
    [
      a.title,
      a.excerpt,
      a.metaDescription,
      a.focusKeyword,
      JSON.stringify(a.tags),
      JSON.stringify(a.platforms),
      a.readMinutes,
      local.cover.src,
      a.coverAlt,
      local.coverCredit,
      JSON.stringify(local.body),
      postId,
    ],
  );
  return {
    status: "ok",
    message: `Refeito: /${post.section}/${post.slug} (${a.words} palavras, ${a.bodyImages.length + 1} imagens${a.video ? ", vídeo" : ""})`,
    stats: { postId, words: a.words, model: a.model, attempts: a.attempts, fixes: a.fixes },
  };
}

async function markItems(ids: number[], status: "used" | "skipped" | "failed", reason: string | null, postId?: number) {
  if (!ids.length) return;
  await db().query(`UPDATE feed_items SET status = ?, reason = ?, post_id = ? WHERE id IN (${ids.map(() => "?").join(",")})`, [
    status,
    reason?.slice(0, 500) ?? null,
    postId ?? null,
    ...ids,
  ]);
}
