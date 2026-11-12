// Robô de postagem do Respawnou. Chamado pelas rotas /api/cron/* (Cron Job da Hostinger).
// Regras de qualidade: docs/adsense.md. Arquitetura: docs/automacao.md.
import { createHash } from "node:crypto";
import type { ResultSetHeader } from "mysql2";
import { db, json, query } from "../db.server.ts";
import { diagnose, generateJson, GeminiError } from "./gemini.server.ts";
import { youtubeCheck } from "./enrich.server.ts";
import { fetchFeed } from "./rss.server.ts";
import type { Review } from "../types.ts";
import { keywords, similarity, slugify } from "./text.ts";
import { dueCompilation, markCompilation, type CompilationKind } from "./compilations.server.ts";
import { guideCandidate, markGuide } from "./guides.server.ts";
import {
  consensusCandidate,
  consensusNumbers,
  consensusSources,
  gameKey,
  looksLikeReview,
  markConsensus,
  recordReview,
  refreshPublishedConsensus,
} from "./critics.server.ts";
import { gameIdFor, igdbCheck, igdbConfigured, syncGames, translateDescriptions } from "./igdb.server.ts";
import { fetchEpic, fetchGamerPower, markPromo, promoCandidate, promoSources, saveOffers, type Offer } from "./offers.server.ts";
import { localizeImages, writeArticle, writeFromSources, type BuiltArticle, type SourceItem } from "./writer.server.ts";

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

/** Diagnóstico das fontes: pautas por situação, pontuação e motivos de descarte (7 dias). */
export async function feedStats() {
  const byStatus = await query<{ feed: string; weight: number; status: string; n: number; avg_score: number }>(
    `SELECT f.name AS feed, f.weight, fi.status, COUNT(*) AS n, ROUND(AVG(fi.score)) AS avg_score FROM feed_items fi JOIN feeds f ON f.id = fi.feed_id
     WHERE fi.created_at > UTC_TIMESTAMP() - INTERVAL 7 DAY GROUP BY f.name, f.weight, fi.status ORDER BY f.weight DESC, f.name`,
  );
  const reasons = await query<{ feed: string; reason: string; n: number }>(
    `SELECT f.name AS feed, LEFT(COALESCE(fi.reason, ''), 60) AS reason, COUNT(*) AS n FROM feed_items fi JOIN feeds f ON f.id = fi.feed_id
     WHERE fi.created_at > UTC_TIMESTAMP() - INTERVAL 7 DAY AND fi.status IN ('skipped','failed') GROUP BY f.name, LEFT(COALESCE(fi.reason, ''), 60) ORDER BY n DESC LIMIT 60`,
  );
  const posts = await query<{ source_name: string; n: number }>(
    "SELECT source_name, COUNT(*) AS n FROM posts WHERE origin = 'auto' AND published_at > UTC_TIMESTAMP() - INTERVAL 7 DAY GROUP BY source_name ORDER BY n DESC",
  );
  return { byStatus, reasons, posts };
}

/** Teste dos modelos do Gemini; o resultado fica em cron_runs.stats (job "diag"). */
export function diag(): Promise<JobResult> {
  return runJob("diag", async () => {
    const stats = { ...(await diagnose()), youtube: await youtubeCheck(), igdb: await igdbCheck() };
    const ok = stats.tests.filter((t) => t.ok).map((t) => t.model);
    const yt = !stats.youtube.configured ? "YouTube: sem chave" : stats.youtube.ok ? "YouTube: ok" : `YouTube: erro ${stats.youtube.error ?? ""}`;
    const ig = !stats.igdb.configured ? "IGDB: sem chave" : stats.igdb.ok ? "IGDB: ok" : `IGDB: erro ${stats.igdb.error ?? ""}`;
    return { status: "ok", message: `${ok.length ? `Gemini respondendo: ${ok.join(", ")}` : "Nenhum modelo do Gemini respondeu"} · ${yt} · ${ig}`, stats };
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
    // Análises de outros veículos não viram notícia: a nota alimenta o consenso da crítica.
    const toRead: { itemId: number; feedId: number; feedName: string; title: string; url: string; publishedAt: Date }[] = [];

    for (const feed of feeds) {
      try {
        const items = await fetchFeed(feed.url);
        for (const it of items) {
          const review = looksLikeReview(it.title);
          // Análise vale por mais tempo: as notas do mesmo jogo saem ao longo de dias.
          const oldest = review ? Date.now() - 21 * 86400_000 : cutoff;
          if (!it.publishedAt || it.publishedAt.getTime() < oldest || it.publishedAt.getTime() > Date.now() + 3600_000) continue;
          const skip: [RegExp, string] | undefined = review ? [/./, "análise de outro veículo (vai para o consenso da crítica)"] : SKIP_PATTERNS.find(([re]) => re.test(it.title));
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
          if (res.affectedRows && review) toRead.push({ itemId: res.insertId, feedId: feed.id, feedName: feed.name, title: it.title, url: it.url, publishedAt: it.publishedAt });
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

    // Notas das análises novas (até 40 por coleta; o resto fica para a próxima vez que aparecer no feed).
    let reviews = 0;
    for (const r of toRead.slice(0, 40)) {
      const res = await recordReview(r).catch((err) => ({ ok: false, reason: `análise: erro ${err instanceof Error ? err.message : err}` }));
      if (res.ok) reviews++;
      await db().query("UPDATE feed_items SET reason = ? WHERE id = ?", [res.reason.slice(0, 500), r.itemId]);
    }
    const refreshed = await refreshPublishedConsensus();

    // Jogos grátis (Epic + GamerPower): no máximo a cada 3 h, registrado como job "ofertas".
    const offers = await maybeCollectOffers();
    // Jogos e lançamentos (IGDB): no máximo a cada 6 h, registrado como job "jogos".
    const games = await maybeCollectGames();

    // Itens velhos que nunca foram usados saem da fila.
    await db().query("UPDATE feed_items SET status = 'skipped', reason = 'expirou (mais de 48 h)' WHERE status = 'new' AND published_at < UTC_TIMESTAMP() - INTERVAL 48 HOUR");

    return {
      status: errors.length === feeds.length && feeds.length ? "error" : "ok",
      message: `${added} novos na fila, ${skipped} descartados${reviews ? `, ${reviews} nota(s) de análise para o consenso` : ""}${refreshed ? `, ${refreshed} consenso(s) atualizado(s)` : ""}${errors.length ? `; falhas: ${errors.join(" | ")}` : ""}${offers ? ` · ofertas: ${offers.message}` : ""}${games ? ` · jogos: ${games.message}` : ""}`,
      stats: { feeds: feeds.length, added, skipped, reviews, refreshed, errors: errors.length },
    };
  });
}

// ───────────── Ofertas (jogos grátis) ─────────────

/** Busca os jogos grátis na Epic e na GamerPower e atualiza free_games. */
export function collectOffers(): Promise<JobResult> {
  return runJob("ofertas", async () => {
    const settle = async (source: Offer["source"], fn: () => Promise<Offer[]>) => {
      try {
        return { source, offers: await fn(), ok: true };
      } catch {
        return { source, offers: [] as Offer[], ok: false };
      }
    };
    const results = await Promise.all([settle("epic", fetchEpic), settle("gamerpower", fetchGamerPower)]);
    // Só encerra ofertas "sumidas" de uma origem que respondeu (falha de rede não apaga nada).
    const answered = results.filter((r) => r.ok && r.offers.length).map((r) => r.source);
    const offers = results.flatMap((r) => r.offers);
    const added = await saveOffers(offers, answered);
    const epic = results[0].offers;
    const now = Date.now();
    const freeNow = epic.filter((o) => o.startsAt && o.startsAt.getTime() <= now).map((o) => o.name);
    const failed = results.filter((r) => !r.ok || !r.offers.length).map((r) => r.source);
    return {
      status: failed.length === results.length ? "error" : "ok",
      message: `${offers.length} oferta(s), ${added} nova(s). Epic grátis agora: ${freeNow.join(", ") || "nenhum"}${failed.length ? `; sem resposta: ${failed.join(", ")}` : ""}`,
      stats: { total: offers.length, added, epic: epic.map((o) => ({ name: o.name, from: o.startsAt, to: o.endsAt })), failed },
    };
  });
}

/** Lançamentos do IGDB → tabela games; depois traduz as descrições que faltam (1 pedido ao Gemini). */
export function collectGames(): Promise<JobResult> {
  return runJob("jogos", async () => {
    if (!igdbConfigured()) return { status: "skipped", message: "IGDB sem chave (IGDB_CLIENT_ID / IGDB_CLIENT_SECRET)." };
    const sync = await syncGames();
    let translated = 0;
    let translateError = "";
    try {
      translated = await translateDescriptions();
    } catch (err) {
      // Gemini fora do ar não perde a sincronização; as descrições ficam para a próxima vez.
      translateError = err instanceof Error ? err.message.slice(0, 200) : String(err);
    }
    return {
      status: "ok",
      message: `${sync.fetched} do IGDB: ${sync.created} novos, ${sync.updated} atualizados, ${sync.skipped} ignorados, ${sync.removed} removidos; ${translated} descrição(ões) em português${translateError ? ` (tradução falhou: ${translateError})` : ""}`,
      stats: { ...sync, translated },
    };
  });
}

async function maybeCollectGames() {
  if (!igdbConfigured()) return null;
  const recent = await query<{ id: number }>(
    "SELECT id FROM cron_runs WHERE job = 'jogos' AND status IN ('ok','running') AND started_at > UTC_TIMESTAMP() - INTERVAL 6 HOUR LIMIT 1",
  );
  return recent.length ? null : collectGames();
}

async function maybeCollectOffers() {
  const recent = await query<{ id: number }>(
    "SELECT id FROM cron_runs WHERE job = 'ofertas' AND status IN ('ok','running') AND started_at > UTC_TIMESTAMP() - INTERVAL 3 HOUR LIMIT 1",
  );
  return recent.length ? null : collectOffers();
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
  /** Só com dry: testa o consenso da crítica de um jogo (nome), mesmo abaixo do mínimo de análises. */
  consensusGame?: string;
  /** Só com dry: gera uma compilação (ofertas | resumo | gratis-mes) fora do dia dela. */
  compilation?: CompilationKind;
  /** Só com dry: testa o guia de requisitos de PC (ignora o limite diário). */
  guide?: boolean;
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
    cover: { url: a.cover.url, size: `${a.cover.width}x${a.cover.height}`, sharpness: a.cover.sharpness },
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

    const recentTitles = (
      await query<{ title: string }>("SELECT title FROM posts WHERE status = 'published' AND published_at > UTC_TIMESTAMP() - INTERVAL 5 DAY ORDER BY published_at DESC LIMIT 40")
    ).map((r) => r.title);
    const tried: string[] = [];

    // 1º: jogo grátis da Epic que ainda não virou matéria (é pauta com hora para acabar).
    const testing = Boolean(opts.dry && (opts.consensusGame || opts.compilation || opts.guide));
    const promo = testing ? null : await promoCandidate();
    if (promo) {
      let result;
      try {
        const prepared = await promoSources(promo);
        result = await writeFromSources(prepared, {
          sections: ["promocoes"],
          minWords: cfg.minWords,
          recentTitles,
          related: await relatedPosts([promo.name]),
        });
      } catch (err) {
        const fail = geminiFailure(err);
        if (fail) return { ...fail, stats: { tried } };
        throw err;
      }
      if (result.ok) {
        const a = { ...result.article, section: "promocoes", platforms: ["pc"] };
        const slug = await uniqueSlug(a.section, slugify(a.title));
        if (opts.dry) return { status: "ok", message: `Teste: matéria de promoção gerada (${a.words} palavras), nada foi gravado.`, post: summary(a, slug), stats: { tried } };
        const postId = await insertPost(a, slug, { name: promo.store, url: promo.url, art: "abcd"[promo.id % 4] });
        await markPromo(promo.id, "used", null, postId);
        return {
          status: "ok",
          message: `Publicado: /${a.section}/${slug} (grátis: ${promo.name}; ${a.words} palavras, ${a.bodyImages.length + 1} imagens${a.video ? ", vídeo" : ""})`,
          stats: { postId, words: a.words, model: a.model, attempts: a.attempts, fixes: a.fixes, tried },
        };
      }
      tried.push(`grátis "${promo.name}": ${result.reason}`);
      if (!opts.dry) await markPromo(promo.id, result.status, result.reason);
    }

    // 2º: consenso da crítica de um jogo que juntou análises suficientes.
    const cons = opts.dry && (opts.compilation || opts.guide) ? null : await consensusCandidate(opts.dry ? opts.consensusGame : undefined);
    if (cons) {
      const prepared = await consensusSources(cons);
      let result;
      if (prepared.usable < 3) {
        result = { ok: false as const, status: "skipped" as const, reason: `só ${prepared.usable} análise(s) com texto legível` };
      } else {
        try {
          result = await writeFromSources(prepared, { sections: ["reviews"], minWords: cfg.minWords, recentTitles, related: await relatedPosts([cons.name]) });
        } catch (err) {
          const fail = geminiFailure(err);
          if (fail) return { ...fail, stats: { tried } };
          throw err;
        }
      }
      if (result.ok) {
        const a = { ...result.article, section: "reviews" };
        const nums = consensusNumbers(cons.rows);
        const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
        const review: Review = { score: nums.score, verdict: String(a.extra.verdict ?? ""), pros: list(a.extra.pros), cons: list(a.extra.cons), critics: nums.critics };
        const slug = await uniqueSlug(a.section, slugify(a.title));
        if (opts.dry)
          return { status: "ok", message: `Teste: consenso da crítica gerado (${cons.name}, ${cons.rows.length} análises, ${a.words} palavras), nada foi gravado.`, post: { ...summary(a, slug), review }, stats: { tried } };
        const outlets = cons.rows.map((r) => r.outlet);
        const sourceName = outlets.length > 3 ? `${outlets.slice(0, 3).join(", ")} e outros` : outlets.join(", ");
        const postId = await insertPost(a, slug, { name: sourceName, url: cons.rows[0].url, art: "abcd"[cons.rows.length % 4] }, { review });
        await markConsensus(cons, "used", null, postId);
        return {
          status: "ok",
          message: `Publicado: /${a.section}/${slug} (consenso: ${cons.name}, média ${nums.score} de ${cons.rows.length} análises; ${a.words} palavras)`,
          stats: { postId, words: a.words, model: a.model, attempts: a.attempts, fixes: a.fixes, tried },
        };
      }
      tried.push(`consenso "${cons.name}": ${result.reason}`);
      if (!opts.dry) await markConsensus(cons, result.status, result.reason);
    }

    // 3º: artigo de compilação no dia dele (ofertas na sexta, resumo no domingo, grátis do mês no dia 1º).
    const comp = opts.consensusGame || (opts.dry && opts.guide) ? null : await dueCompilation(opts.dry ? opts.compilation : undefined);
    if (comp) {
      let result;
      try {
        result = await writeFromSources(comp.prepared, {
          sections: [comp.section],
          minWords: cfg.minWords,
          recentTitles,
          related: comp.kind === "resumo" ? [] : await relatedPosts([comp.tag, comp.kind === "ofertas" ? "promoção Steam desconto" : "jogos grátis"]),
        });
      } catch (err) {
        const fail = geminiFailure(err);
        if (fail) return { ...fail, stats: { tried } };
        throw err;
      }
      if (result.ok) {
        const a = { ...result.article, section: comp.section, platforms: comp.kind === "ofertas" ? ["pc"] : result.article.platforms };
        const slug = await uniqueSlug(a.section, slugify(a.title));
        if (opts.dry) return { status: "ok", message: `Teste: compilação "${comp.kind}" gerada (${a.words} palavras), nada foi gravado.`, post: summary(a, slug), stats: { tried } };
        const postId = await insertPost(a, slug, { ...comp.source, art: "abcd"[a.words % 4] }, { tag: comp.tag });
        await markCompilation(comp.kind, comp.period);
        return {
          status: "ok",
          message: `Publicado: /${a.section}/${slug} (compilação ${comp.kind}, ${comp.period}; ${a.words} palavras)`,
          stats: { postId, words: a.words, model: a.model, attempts: a.attempts, fixes: a.fixes, tried },
        };
      }
      tried.push(`compilação ${comp.kind}: ${result.reason}`);
      // Não insiste a cada hora: o período fica marcado e a próxima sai no período seguinte.
      if (!opts.dry) await markCompilation(comp.kind, comp.period);
    }

    // 4º: guia de requisitos de PC de um jogo grande que está saindo (no máximo 1 por dia).
    const guide = (opts.dry && (opts.consensusGame || opts.compilation)) ? null : await guideCandidate(Boolean(opts.dry && opts.guide));
    if (guide) {
      let result;
      try {
        result = await writeFromSources(guide.prepared, { sections: ["guias"], minWords: cfg.minWords, recentTitles, related: await relatedPosts([guide.name]) });
      } catch (err) {
        const fail = geminiFailure(err);
        if (fail) return { ...fail, stats: { tried } };
        throw err;
      }
      if (result.ok) {
        const a = { ...result.article, section: "guias", platforms: ["pc"] };
        const slug = await uniqueSlug(a.section, slugify(a.title));
        if (opts.dry) return { status: "ok", message: `Teste: guia de requisitos gerado (${guide.name}, ${a.words} palavras), nada foi gravado.`, post: summary(a, slug), stats: { tried } };
        const postId = await insertPost(a, slug, { name: "Steam", url: guide.storeUrl, art: "abcd"[guide.gameId % 4] }, { tag: "Requisitos", gameId: guide.gameId });
        await markGuide(guide.gameId, `publicado #${postId}`);
        return {
          status: "ok",
          message: `Publicado: /${a.section}/${slug} (guia de requisitos: ${guide.name}; ${a.words} palavras)`,
          stats: { postId, words: a.words, model: a.model, attempts: a.attempts, fixes: a.fixes, tried },
        };
      }
      tried.push(`guia "${guide.name}": ${result.reason}`);
      if (!opts.dry) await markGuide(guide.gameId, result.reason);
    }
    if (opts.dry && opts.guide) return { status: "skipped", message: `Teste: nenhum guia gerado. ${tried.join(" · ") || "Nenhum jogo de PC saindo agora com requisitos mínimo e recomendado na Steam."}`, stats: { tried } };

    const queue = await query<SourceItem>(
      `SELECT ${ITEM_COLS} FROM feed_items fi JOIN feeds f ON f.id = fi.feed_id
       WHERE fi.status = 'new' AND fi.published_at > UTC_TIMESTAMP() - INTERVAL 48 HOUR
       ORDER BY fi.score DESC, fi.published_at DESC LIMIT 60`,
    );
    if (!queue.length) return { status: "skipped", message: `Fila vazia: nenhuma pauta nova.${tried.length ? ` ${tried.join(" · ")}` : ""}`, stats: { tried } };
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

      const postId = await insertPost(a, slug, { name: item.feed_name, url: item.url, art: "abcd"[item.id % 4] });
      const res = { insertId: postId };
      await markItems([item.id], "used", null, postId);
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

/** Grava a matéria (imagens já baixadas para /media) e devolve o id. */
async function insertPost(a: BuiltArticle, slug: string, source: { name: string; url: string; art: string }, extra: { review?: Review; tag?: string; gameId?: number } = {}) {
  const { review, tag } = extra;
  const local = await localizeImages(a, slug);
  // Ficha do jogo (/jogos/:slug): liga quando a palavra-chave é o nome de um jogo do IGDB.
  const gameId = extra.gameId ?? (await gameIdFor(a.focusKeyword, gameKey).catch(() => null));
  const [res] = await db().query<ResultSetHeader>(
    `INSERT INTO posts (section, slug, status, origin, title, excerpt, meta_description, focus_keyword, tags, platforms, author, read_minutes, art,
       image_url, image_alt, image_credit, body, source_name, source_url, review, tag, game_id, published_at)
     VALUES (?, ?, 'published', 'auto', ?, ?, ?, ?, ?, ?, 'Redação Respawnou', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
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
      source.art,
      local.cover.src,
      a.coverAlt,
      local.coverCredit,
      JSON.stringify(local.body),
      source.name,
      source.url,
      review ? JSON.stringify(review) : null,
      tag ?? null,
      gameId,
    ],
  );
  return res.insertId;
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
