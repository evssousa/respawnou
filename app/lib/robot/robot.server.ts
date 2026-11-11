// Robô de postagem do Respawnou. Chamado pelas rotas /api/cron/* (Cron Job da Hostinger).
// Regras de qualidade: docs/adsense.md. Arquitetura: docs/automacao.md.
import { createHash } from "node:crypto";
import type { ResultSetHeader } from "mysql2";
import { db, json, query } from "../db.server.ts";
import { generateJson, GeminiError } from "./gemini.server.ts";
import { fetchArticle, fetchFeed } from "./rss.server.ts";
import { countWords, keywords, numbersIn, similarity, slugify } from "./text.ts";

const PLATFORMS = ["pc", "playstation", "xbox", "switch", "mobile"] as const;
const SECTIONS = ["noticias", "artigos", "reviews", "guias", "promocoes"] as const;
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
    await finishRun(id, result.status, result.message, result.stats);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishRun(id, "error", message);
    return { status: "error", message };
  }
}

// ───────────── Coleta ─────────────

// Assuntos que não viram matéria automática (opinião, review de terceiros, sorteios, etc.).
const SKIP_PATTERNS: [RegExp, string][] = [
  [/\breview\b|\banalise\b|\bimpressions?\b|\bhands[- ]on\b|\bpreview\b/i, "review/impressões de terceiros (não reescrevemos opinião)"],
  [/\bquiz\b|\bpodcast\b|\bpoll\b|\bgiveaway\b|\bwin an?\b|\bsweepstakes\b/i, "quiz, podcast ou sorteio"],
  [/\b(best|cheapest)\b.*\b(deals?|prices?)\b|\bdeal of the day\b|\bblack friday\b.*\bdeals?\b|\bcyber monday\b/i, "lista de ofertas de loja"],
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
            `INSERT IGNORE INTO feed_items (feed_id, guid_hash, title, url, summary, published_at, status, score, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              feed.id,
              hash(it.guid || it.url),
              it.title.slice(0, 400),
              it.url.slice(0, 600),
              it.summary.slice(0, 20000),
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
        const msg = err instanceof Error ? err.message : String(err);
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

interface QueueItem {
  id: number;
  feed_id: number;
  feed_name: string;
  title: string;
  url: string;
  summary: string | null;
  published_at: string;
  score: number;
}

interface Draft {
  publish: boolean;
  reason: string;
  section: string;
  title: string;
  excerpt: string;
  platforms: string[];
  body: { type: "p" | "h2" | "ul" | "quote"; text?: string; items?: string[] }[];
}

const SCHEMA = {
  type: "OBJECT",
  properties: {
    publish: { type: "BOOLEAN", description: "false se a pauta não serve (ver regras)" },
    reason: { type: "STRING", description: "por que publicar ou não, em uma frase" },
    section: { type: "STRING", enum: [...SECTIONS] },
    title: { type: "STRING", description: "título em pt-BR, até 100 caracteres, informativo, sem caixa alta e sem clickbait" },
    excerpt: { type: "STRING", description: "linha fina em pt-BR, 1 a 2 frases, até 220 caracteres" },
    platforms: { type: "ARRAY", items: { type: "STRING", enum: [...PLATFORMS] } },
    body: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: ["p", "h2", "ul", "quote"] },
          text: { type: "STRING" },
          items: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["type"],
      },
    },
  },
  required: ["publish", "reason", "section", "title", "excerpt", "platforms", "body"],
};

const SYSTEM = `Você é redator do Respawnou, portal brasileiro de notícias de games. Escreve em português do Brasil, com tom direto, claro e sem enrolação.

Regras obrigatórias:
1. Use SOMENTE fatos presentes nas fontes fornecidas. Nunca invente datas, preços, números, nomes, declarações ou detalhes.
2. Não traduza parágrafo por parágrafo: escreva um texto novo, com estrutura própria, a partir dos fatos.
3. Organize a matéria assim: um parágrafo de abertura com o fato principal; depois 2 ou 3 intertítulos (h2) com contexto, detalhes e o que isso significa para quem joga. Use lista (ul) só quando houver itens de verdade (recursos, datas, plataformas).
4. Mínimo de 350 palavras no corpo. Se as fontes não tiverem substância para isso sem enrolar, responda publish=false.
5. Preços, dublagem/legendas em português e horários de Brasília só podem aparecer se estiverem nas fontes. Não converta moedas nem fusos.
6. Citações diretas: no máximo uma, curta, entre aspas, atribuída a quem disse (tipo "quote" sem aspas no texto).
7. Não mencione os sites de origem no corpo do texto (o crédito é adicionado automaticamente no fim).
8. Títulos em português, com só a primeira letra maiúscula (e nomes próprios), sem caixa alta, sem emojis e sem clickbait.
9. Responda publish=false quando: não for sobre games; for opinião, review ou impressões de outro veículo; for rumor sem fonte com histórico de acerto; for lista de ofertas de loja; for conteúdo patrocinado; ou o assunto já estiver na lista de matérias recentes do Respawnou.
10. Escolha a editoria entre as permitidas. Plataformas: só as citadas nas fontes (pc, playstation, xbox, switch, mobile).`;

function sourcesBlock(sources: { name: string; title: string; url: string; date: string; text: string }[]) {
  return sources
    .map((s, i) => `### FONTE ${i + 1}: ${s.name}\nTítulo: ${s.title}\nPublicado em: ${s.date}\nURL: ${s.url}\n\n${s.text}`)
    .join("\n\n---\n\n");
}

const blockText = (b: Draft["body"][number]) => (b.type === "ul" ? (b.items ?? []).join(" ") : (b.text ?? ""));

/** Confere a matéria gerada. Devolve o motivo da reprovação, ou null se estiver ok. */
export function validateDraft(d: Draft, sourceText: string, allowedSections: string[], minWords: number): string | null {
  if (!d.title || d.title.length > 140) return "título vazio ou longo demais";
  if (!d.excerpt || d.excerpt.length > 400) return "linha fina vazia ou longa demais";
  if (!allowedSections.includes(d.section)) return `editoria não permitida para o robô: ${d.section}`;
  if (!Array.isArray(d.body) || d.body.length < 3) return "corpo com poucos blocos";
  if (d.body.some((b) => !["p", "h2", "ul", "quote"].includes(b.type) || !blockText(b).trim())) return "bloco vazio ou de tipo inválido";
  const words = countWords(d.body.map(blockText).join(" "));
  if (words < minWords) return `texto curto (${words} palavras; mínimo ${minWords})`;
  if (d.title === d.title.toUpperCase()) return "título em caixa alta";

  // Todo número da matéria precisa existir nas fontes (anos atual e seguinte são tolerados).
  const allowed = numbersIn(sourceText);
  const year = new Date().getUTCFullYear();
  [year - 1, year, year + 1].forEach((y) => allowed.add(String(y)));
  const text = [d.title, d.excerpt, ...d.body.map(blockText)].join(" ");
  const invented = [...numbersIn(text)].filter((n) => !allowed.has(n));
  if (invented.length) return `números que não estão nas fontes: ${invented.slice(0, 5).join(", ")}`;
  return null;
}

async function uniqueSlug(section: string, base: string) {
  const slug = base || "materia";
  const rows = await query<{ slug: string }>("SELECT slug FROM posts WHERE section = ? AND (slug = ? OR slug LIKE ?)", [section, slug, `${slug}-%`]);
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(slug)) return slug;
  for (let i = 2; ; i++) if (!taken.has(`${slug}-${i}`)) return `${slug}-${i}`;
}

/** Dia de hoje no fuso de Brasília, como intervalo UTC para o banco. */
function todayRangeUTC() {
  const now = new Date();
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
  // Brasília é UTC-3 (sem horário de verão desde 2019).
  const start = new Date(`${ymd}T03:00:00Z`);
  return { start: sqlNow(start), hour: Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now)) };
}

export interface PublishOptions {
  /** Gera e devolve a matéria sem gravar nada (teste). */
  dry?: boolean;
  /** Ignora horário, limite diário e intervalo (não ignora robot_enabled, exceto em dry). */
  force?: boolean;
}

export function publish(opts: PublishOptions = {}): Promise<JobResult> {
  return runJob(opts.dry ? "publicar-teste" : "publicar", async () => {
    const cfg = await settings();
    if (!cfg.enabled && !opts.dry) return { status: "skipped", message: "Robô desligado (settings.robot_enabled)." };

    if (!opts.force && !opts.dry) {
      const { start, hour } = todayRangeUTC();
      if (hour < cfg.startHour || hour >= cfg.endHour) return { status: "skipped", message: `Fora do horário de publicação (${hour}h).` };
      const [{ total }] = await query<{ total: number }>("SELECT COUNT(*) AS total FROM posts WHERE origin = 'auto' AND published_at >= ?", [start]);
      if (Number(total) >= cfg.postsPerDay) return { status: "skipped", message: `Limite diário atingido (${total}/${cfg.postsPerDay}).` };
      // Espalha os posts pelo dia: intervalo mínimo entre publicações automáticas.
      const gapHours = Math.max(1, Math.floor((cfg.endHour - cfg.startHour) / cfg.postsPerDay));
      const recent = await query<{ id: number }>(
        "SELECT id FROM posts WHERE origin = 'auto' AND published_at > UTC_TIMESTAMP() - INTERVAL ? HOUR LIMIT 1",
        [gapHours],
      );
      if (recent.length) return { status: "skipped", message: `Aguardando o intervalo de ${gapHours} h entre posts.` };
    }

    const queue = await query<QueueItem>(
      `SELECT fi.id, fi.feed_id, f.name AS feed_name, fi.title, fi.url, fi.summary, fi.published_at, fi.score
       FROM feed_items fi JOIN feeds f ON f.id = fi.feed_id
       WHERE fi.status = 'new' AND fi.published_at > UTC_TIMESTAMP() - INTERVAL 48 HOUR
       ORDER BY fi.score DESC, fi.published_at DESC LIMIT 60`,
    );
    if (!queue.length) return { status: "skipped", message: "Fila vazia: nenhuma pauta nova." };

    const recentPosts = await query<{ title: string }>(
      "SELECT title FROM posts WHERE status = 'published' AND published_at > UTC_TIMESTAMP() - INTERVAL 5 DAY ORDER BY published_at DESC LIMIT 40",
    );

    const tried: string[] = [];
    // Até 3 pautas por execução: se uma for descartada, tenta a próxima.
    for (const item of queue.slice(0, 3)) {
      // Fontes do mesmo assunto (outros veículos) entram juntas: mais contexto, texto mais original.
      const kw = keywords(item.title);
      const related = queue.filter((q) => q.id !== item.id && q.feed_id !== item.feed_id && similarity(kw, keywords(q.title)) >= 0.5).slice(0, 2);
      const group = [item, ...related];

      const sources = [];
      for (const g of group) {
        const page = await fetchArticle(g.url);
        const text = countWords(page) >= countWords(g.summary ?? "") ? page : (g.summary ?? "");
        if (countWords(text) >= 40) sources.push({ name: g.feed_name, title: g.title, url: g.url, date: g.published_at, text });
      }
      const sourceWords = sources.reduce((n, s) => n + countWords(s.text), 0);
      if (sourceWords < 200) {
        tried.push(`#${item.id}: pouco conteúdo nas fontes (${sourceWords} palavras)`);
        if (!opts.dry) await markItems([item.id], "skipped", `pouco conteúdo nas fontes (${sourceWords} palavras)`);
        continue;
      }

      const prompt = `Editorias permitidas: ${cfg.sections.join(", ")}.

Matérias publicadas recentemente pelo Respawnou (não repita o assunto):
${recentPosts.map((p) => `- ${p.title}`).join("\n") || "- (nenhuma)"}

Escreva uma matéria a partir das fontes abaixo. A FONTE 1 é a principal; as outras são de outros veículos sobre o mesmo assunto.

${sourcesBlock(sources)}`;

      let draft: Draft;
      let model: string;
      try {
        ({ data: draft, model } = await generateJson<Draft>({ system: SYSTEM, prompt, schema: SCHEMA }));
      } catch (err) {
        // Limite do plano gratuito: não queima a pauta; tenta de novo na próxima execução.
        if (err instanceof GeminiError && err.isRateLimit) return { status: "error", message: "Limite do Gemini atingido; nova tentativa na próxima execução." };
        if (err instanceof GeminiError && err.isTransient) return { status: "error", message: `Gemini indisponível (${err.status}); nova tentativa na próxima execução.` };
        throw err;
      }

      if (!draft.publish) {
        tried.push(`#${item.id}: recusada pelo redator (${draft.reason})`);
        if (!opts.dry) await markItems([item.id], "skipped", `recusada: ${draft.reason}`);
        continue;
      }
      const problem = validateDraft(draft, sources.map((s) => `${s.title} ${s.text}`).join(" "), cfg.sections, cfg.minWords);
      if (problem) {
        tried.push(`#${item.id}: reprovada na validação (${problem})`);
        if (!opts.dry) await markItems([item.id], "failed", problem);
        continue;
      }

      const words = countWords(draft.body.map(blockText).join(" "));
      const post = {
        section: draft.section,
        slug: await uniqueSlug(draft.section, slugify(draft.title)),
        title: draft.title.trim(),
        excerpt: draft.excerpt.trim(),
        platforms: draft.platforms.filter((p) => (PLATFORMS as readonly string[]).includes(p)),
        body: draft.body.map((b) => (b.type === "ul" ? { type: "ul", items: b.items ?? [] } : { type: b.type, text: (b.text ?? "").trim() })),
        readMinutes: Math.max(2, Math.round(words / 200)),
        art: "abcd"[item.id % 4],
        source: { name: item.feed_name, url: item.url },
        words,
        model,
        sources: sources.map((s) => s.name),
      };

      if (opts.dry) return { status: "ok", message: `Teste: matéria gerada (${words} palavras), nada foi gravado.`, post, stats: { tried } };

      const [res] = await db().query<ResultSetHeader>(
        `INSERT INTO posts (section, slug, status, origin, title, excerpt, platforms, author, read_minutes, art, body, source_name, source_url, published_at)
         VALUES (?, ?, 'published', 'auto', ?, ?, ?, 'Redação Respawnou', ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [post.section, post.slug, post.title, post.excerpt, JSON.stringify(post.platforms), post.readMinutes, post.art, JSON.stringify(post.body), post.source.name, post.source.url],
      );
      await markItems([item.id], "used", null, res.insertId);
      // O mesmo assunto em outros veículos não vira outro post: marca tudo que se parece
      // com qualquer fonte do grupo (pega também quem só se parece com uma fonte relacionada).
      const groupKw = group.map((g) => keywords(g.title));
      const sameTopic = queue.filter((q) => q.id !== item.id && groupKw.some((k) => similarity(k, keywords(q.title)) >= 0.5));
      await markItems(
        sameTopic.map((r) => r.id),
        "skipped",
        `mesmo assunto do post #${res.insertId}`,
      );
      return {
        status: "ok",
        message: `Publicado: /${post.section}/${post.slug} (${words} palavras, fontes: ${post.sources.join(", ")})`,
        stats: { postId: res.insertId, words, model, tried },
      };
    }

    return { status: "skipped", message: `Nenhuma pauta aproveitada nesta execução. ${tried.join(" · ")}`, stats: { tried } };
  });
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
