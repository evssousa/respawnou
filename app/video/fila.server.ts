// Fila dos vídeos (tabela video_jobs): escolha do dia, roteiro, aprovação, entrega ao worker, resultado e limpeza.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { mediaDir } from "../../server-paths.mjs";
import { horaBR } from "~/social/core/agenda";
import { lerOverrides } from "~/social/core/overrides";
import { SOCIAL } from "~/social/config";
import { escolherModelo, lerEntrada, urlDaMateria } from "~/social/site.server";
import type { Foco } from "~/social/tipos";
import { VIDEO, lerConfig, vozDaSecao } from "./config";
import { exec, hasDatabase, query } from "./db";
import { dispararWorkflow } from "./github.server";
import { legendasDoVideo } from "./legendas";
import { gerarRoteiro, imagensDisponiveis, palavrasDoRoteiro, validarRoteiro, type Imagem, type Roteiro } from "./roteiro.server";

export type StatusVideo = "aguardando" | "aprovado" | "gerando" | "pronto" | "falhou" | "descartado";

export interface JobVideo {
  id: number;
  post_id: number;
  status: StatusVideo;
  origin: "auto" | "manual";
  script: Roteiro | null;
  images: Imagem[];
  focus: Record<string, Foco>;
  voice_id: string | null;
  voice_model: string | null;
  chars: number | null;
  duration_s: number | null;
  video: string | null;
  cover: string | null;
  captions: ReturnType<typeof legendasDoVideo> | null;
  error: string | null;
  attempts: number;
  created_at: string;
  approved_at: string | null;
  rendered_at: string | null;
  title?: string;
  section?: string;
  post_image?: string | null;
}

const json = <T,>(v: unknown, fb: T): T => {
  if (v == null) return fb;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fb;
    }
  }
  return v as T;
};

function linha(r: Record<string, unknown>): JobVideo {
  return {
    ...(r as unknown as JobVideo),
    script: json<Roteiro | null>(r.script, null),
    images: json<Imagem[]>(r.images, []),
    focus: json<Record<string, Foco>>(r.focus, {}),
    captions: json(r.captions, null),
    duration_s: r.duration_s == null ? null : Number(r.duration_s),
  };
}

/** Texto que vai para a ElevenLabs: gancho, falas das cenas e o fechamento fixo. */
export const textoFalado = (r: Roteiro) => [r.gancho, ...r.cenas.map((c) => c.fala), VIDEO.fechamento].map((t) => t.trim().replace(/[.!?…]+$/, "")).join(". ") + ".";
export const caracteresDoRoteiro = (r: Roteiro) => textoFalado(r).length;

/** Cria o job (a matéria precisa estar publicada e ter imagens). O roteiro é pedido na hora; se falhar, o job fica `falhou` com o motivo. */
export async function criarJob(postId: number, origem: "auto" | "manual"): Promise<{ id: number } | { erro: string }> {
  if (!hasDatabase()) return { erro: "sem banco" };
  const [ja] = await query<{ id: number; status: StatusVideo }>("SELECT id, status FROM video_jobs WHERE post_id = ?", [postId]);
  if (ja && ja.status !== "descartado") return { erro: "esta matéria já tem um vídeo (veja em /admin/videos)" };
  const e = await lerEntrada(postId);
  if (!e || !e.publicada) return { erro: "matéria não publicada" };
  const [fila] = await query<{ overrides: unknown }>("SELECT overrides FROM social_posts WHERE post_id = ? AND network = 'instagram' AND kind = 'feed'", [postId]);
  const imagens = imagensDisponiveis(e, lerOverrides(fila?.overrides));
  if (imagens.length < (origem === "manual" ? 1 : VIDEO.minImagens)) return { erro: `poucas imagens utilizáveis (${imagens.length})` };
  const cfg = await lerConfig();
  if (ja) await exec("DELETE FROM video_jobs WHERE id = ?", [ja.id]); // descartado antes: recomeça
  const r = await exec("INSERT INTO video_jobs (post_id, origin, images, voice_id, voice_model) VALUES (?, ?, ?, ?, ?)", [postId, origem, JSON.stringify(imagens), vozDaSecao(cfg, e.section) || null, cfg.model]);
  await gerarRoteiroDoJob(r.insertId);
  return { id: r.insertId };
}

/** (Re)gera o roteiro de um job que ainda não foi aprovado/gerado. */
export async function gerarRoteiroDoJob(id: number): Promise<string> {
  const [j] = await query<Record<string, unknown>>("SELECT * FROM video_jobs WHERE id = ?", [id]);
  if (!j) return "Job não encontrado.";
  const job = linha(j);
  if (job.status === "gerando" || job.status === "pronto") return "Este vídeo já foi gerado ou está sendo gerado.";
  const e = await lerEntrada(job.post_id);
  if (!e) return "Matéria não existe mais.";
  try {
    const roteiro = await gerarRoteiro(e, job.images);
    await exec("UPDATE video_jobs SET script = ?, status = 'aguardando', error = NULL WHERE id = ?", [JSON.stringify(roteiro), id]);
    return "ok";
  } catch (err) {
    const msg = String((err as Error)?.message ?? err).slice(0, 400);
    await exec("UPDATE video_jobs SET status = 'falhou', error = ? WHERE id = ?", [msg, id]);
    return msg;
  }
}

/** O dono ajustou o roteiro (e o foco por imagem): valida antes de gravar. */
export async function salvarRoteiro(id: number, roteiro: unknown, focus: Record<string, Foco> = {}): Promise<string> {
  const [j] = await query<Record<string, unknown>>("SELECT * FROM video_jobs WHERE id = ?", [id]);
  if (!j) return "Job não encontrado.";
  const job = linha(j);
  if (job.status === "gerando" || job.status === "pronto") return "Este vídeo já foi gerado ou está sendo gerado.";
  const v = validarRoteiro(roteiro, job.images.length);
  if (!v.ok) return `Roteiro inválido: ${v.erro}.`;
  await exec("UPDATE video_jobs SET script = ?, focus = ?, status = IF(status = 'falhou', 'aguardando', status), error = NULL WHERE id = ?", [JSON.stringify(v.roteiro), JSON.stringify(focus), id]);
  return "ok";
}

/** Aprova e dispara o worker. Devolve um aviso se o disparo falhou (o vídeo sai na rodada automática). */
export async function aprovar(id: number): Promise<{ ok: boolean; aviso?: string }> {
  const r = await exec("UPDATE video_jobs SET status = 'aprovado', approved_at = UTC_TIMESTAMP(), error = NULL, attempts = 0, locked_at = NULL WHERE id = ? AND status IN ('aguardando','falhou','pronto') AND script IS NOT NULL", [id]);
  if (!r.affected) return { ok: false, aviso: "Este vídeo não pode ser aprovado agora (sem roteiro ou já em geração)." };
  const d = await dispararWorkflow();
  return { ok: true, aviso: d.aviso };
}

export const descartar = (id: number) => exec("UPDATE video_jobs SET status = 'descartado' WHERE id = ? AND status NOT IN ('gerando')", [id]);

// ───────────── API do worker ─────────────

export interface PacoteWorker {
  id: number;
  titulo: string;
  secao: string;
  roteiro: Roteiro;
  imagens: { src: string; url: string; foco: Foco }[];
  voz: string;
  modelo: string;
  velocidade: number;
  falado: string;
  chaveSecao: string;
  fechamento: string;
  cta: string;
  baseUrl: string;
}

/** Entrega ao worker o job aprovado mais antigo e o marca como `gerando`. */
export async function proximo(): Promise<PacoteWorker | null> {
  await recuperarPresos();
  const [j] = await query<Record<string, unknown>>("SELECT * FROM video_jobs WHERE status = 'aprovado' ORDER BY approved_at LIMIT 1");
  if (!j) return null;
  const r = await exec("UPDATE video_jobs SET status = 'gerando', locked_at = UTC_TIMESTAMP(), attempts = attempts + 1 WHERE id = ? AND status = 'aprovado'", [j.id]);
  if (!r.affected) return null;
  const job = linha(j);
  const e = await lerEntrada(job.post_id);
  if (!job.script || !e) {
    await exec("UPDATE video_jobs SET status = 'falhou', error = 'sem roteiro ou matéria' WHERE id = ?", [job.id]);
    return null;
  }
  const cfg = await lerConfig();
  const voz = job.voice_id || vozDaSecao(cfg, e.section);
  // "arte:1" = o slide 1 do post do feed (já gerado, se existir); sem ele, o worker usa a primeira imagem comum.
  const [feed] = await query<{ images: unknown }>("SELECT images FROM social_posts WHERE post_id = ? AND network = 'instagram' AND kind = 'feed'", [job.post_id]);
  const arte1 = json<string[]>(feed?.images, [])[0] ?? null;
  const abs = (s: string) => (s === "arte:1" ? (arte1 ? `${SOCIAL.baseUrl}${arte1}` : s) : s.startsWith("http") || s.startsWith("arte:") ? s : `${SOCIAL.baseUrl}${s}`);
  return {
    id: job.id,
    titulo: e.titulo,
    secao: SOCIAL.rotuloSecao[e.section] ?? e.section.toUpperCase(),
    chaveSecao: e.section,
    roteiro: job.script,
    imagens: job.images.map((x, i) => ({ src: x.src, url: abs(x.src), foco: job.focus[String(i)] ?? "auto" })),
    voz,
    modelo: job.voice_model || cfg.model,
    velocidade: cfg.speed,
    falado: textoFalado(job.script),
    fechamento: VIDEO.fechamento,
    cta: VIDEO.ctaCartao,
    baseUrl: SOCIAL.baseUrl,
  };
}

/** Grava o vídeo e a capa enviados pelo worker e marca `pronto` (com as legendas por rede). */
export async function concluir(id: number, arq: { video: Buffer; capa: Buffer; chars: number; duracao: number }): Promise<void> {
  const [j] = await query<Record<string, unknown>>("SELECT * FROM video_jobs WHERE id = ?", [id]);
  if (!j) throw new Error("job não existe");
  const job = linha(j);
  const e = await lerEntrada(job.post_id);
  const d = new Date();
  const dir = `video/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const hash = createHash("sha1").update(arq.video).digest("hex").slice(0, 8);
  await mkdir(join(mediaDir(), dir), { recursive: true });
  await writeFile(join(mediaDir(), dir, `v${id}-${hash}.mp4`), arq.video);
  await writeFile(join(mediaDir(), dir, `v${id}-${hash}.jpg`), arq.capa);
  const legendas = e && job.script ? legendasDoVideo(e, escolherModelo(e), job.script, urlDaMateria(e)) : null;
  await exec(
    "UPDATE video_jobs SET status = 'pronto', video = ?, cover = ?, chars = ?, duration_s = ?, captions = ?, error = NULL, locked_at = NULL, rendered_at = UTC_TIMESTAMP() WHERE id = ?",
    [`/media/${dir}/v${id}-${hash}.mp4`, `/media/${dir}/v${id}-${hash}.jpg`, Math.round(arq.chars), Math.round(arq.duracao * 10) / 10, legendas ? JSON.stringify(legendas) : null, id],
  );
}

export const falhar = (id: number, msg: string) => exec("UPDATE video_jobs SET status = 'falhou', error = ?, locked_at = NULL WHERE id = ?", [msg.slice(0, 900), id]);

/** `gerando` preso há mais de 20 min (o worker caiu): volta para `aprovado`; depois de 2 tentativas, `falhou`. */
export async function recuperarPresos(): Promise<void> {
  await exec("UPDATE video_jobs SET status = 'falhou', error = 'o gerador não respondeu (2 tentativas)', locked_at = NULL WHERE status = 'gerando' AND locked_at < UTC_TIMESTAMP() - INTERVAL 20 MINUTE AND attempts >= 2");
  await exec("UPDATE video_jobs SET status = 'aprovado', locked_at = NULL WHERE status = 'gerando' AND locked_at < UTC_TIMESTAMP() - INTERVAL 20 MINUTE");
}

// ───────────── Escolha automática do dia ─────────────

/** Uma vez por dia, depois da hora configurada: cria o job da melhor matéria das últimas 36 h. Falha aqui nunca derruba a coleta. */
export async function escolherDoDia(): Promise<string> {
  if (!hasDatabase()) return "sem banco";
  const cfg = await lerConfig();
  if (!cfg.enabled || cfg.perDay < 1) return "desligado";
  const { hora, dia } = horaBR(new Date());
  if (hora < cfg.hour) return "ainda não é a hora";
  const inicio = new Date(`${dia}T03:00:00Z`).toISOString().slice(0, 19).replace("T", " ");
  const [hoje] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM video_jobs WHERE origin = 'auto' AND created_at >= ?", [inicio]);
  if (Number(hoje?.n ?? 0) >= cfg.perDay) return "já criado hoje";
  const candidatos = await query<{ id: number; v: number | null }>(
    `SELECT p.id, (SELECT SUM(vp.views) FROM visit_pages vp WHERE vp.day >= UTC_DATE() - INTERVAL 1 DAY AND vp.path = CONCAT('/', p.section, '/', p.slug)) AS v
       FROM posts p WHERE p.status = 'published' AND p.published_at <= UTC_TIMESTAMP() AND p.published_at > UTC_TIMESTAMP() - INTERVAL ${VIDEO.janelaHoras} HOUR
         AND NOT EXISTS (SELECT 1 FROM video_jobs j WHERE j.post_id = p.id) ORDER BY p.published_at DESC LIMIT 40`,
  ).catch(() => [] as { id: number; v: number | null }[]);
  let melhor: { id: number; rank: number; v: number; rumor: boolean } | null = null;
  for (const c of candidatos) {
    const e = await lerEntrada(c.id);
    if (!e) continue;
    const modelo = escolherModelo(e);
    const rank = VIDEO.ordemTipos.indexOf(modelo as (typeof VIDEO.ordemTipos)[number]);
    if (rank < 0) continue;
    const [fila] = await query<{ overrides: unknown }>("SELECT overrides FROM social_posts WHERE post_id = ? AND network = 'instagram' AND kind = 'feed'", [c.id]);
    if (imagensDisponiveis(e, lerOverrides(fila?.overrides)).length < VIDEO.minImagens) continue;
    const rumor = /rumor|vazamento/i.test(`${e.titulo} ${e.tags.join(" ")}`);
    const cand = { id: c.id, rank, v: Number(c.v ?? 0), rumor };
    if (!melhor || (melhor.rumor && !cand.rumor) || (melhor.rumor === cand.rumor && (cand.rank < melhor.rank || (cand.rank === melhor.rank && cand.v > melhor.v)))) melhor = cand;
  }
  if (!melhor) return "nenhuma matéria boa para vídeo";
  const r = await criarJob(melhor.id, "auto");
  if ("erro" in r) return `não criou: ${r.erro}`;
  if (cfg.autoApprove) await aprovar(r.id);
  return `job ${r.id} criado`;
}

// ───────────── Painel e limpeza ─────────────

export async function listarJobs(limite = 10): Promise<JobVideo[]> {
  const rows = await query<Record<string, unknown>>(
    "SELECT j.*, p.title, p.section, p.image_url AS post_image FROM video_jobs j JOIN posts p ON p.id = j.post_id WHERE j.status <> 'descartado' ORDER BY j.created_at DESC, j.id DESC LIMIT ?",
    [limite],
  );
  return rows.map(linha);
}

export async function resumoMes(): Promise<{ prontos: number; creditos: number; aguardando: number }> {
  const [m] = await query<{ n: number; c: number | null }>("SELECT COUNT(*) AS n, SUM(chars) AS c FROM video_jobs WHERE status = 'pronto' AND rendered_at >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01')");
  const [a] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM video_jobs WHERE status = 'aguardando'");
  return { prontos: Number(m?.n ?? 0), creditos: Number(m?.c ?? 0), aguardando: Number(a?.n ?? 0) };
}

/** Apaga os arquivos: descartados em 7 dias; prontos em 45 dias (ou 30 dias depois da última publicação, quando houver). */
export async function limparArquivos(): Promise<number> {
  const velhos = await query<{ id: number; video: string | null; cover: string | null; status: string; rendered_at: string | null; created_at: string }>(
    `SELECT id, video, cover, status, rendered_at, created_at FROM video_jobs WHERE video IS NOT NULL AND (
       (status = 'descartado' AND created_at < UTC_TIMESTAMP() - INTERVAL 7 DAY) OR (status = 'pronto' AND rendered_at < UTC_TIMESTAMP() - INTERVAL 45 DAY))`,
  );
  let n = 0;
  for (const v of velhos) {
    for (const f of [v.video, v.cover]) {
      if (!f || !/^\/media\/video\/\d{4}\/\d{2}\/[\w.-]+$/.test(f)) continue;
      await rm(join(mediaDir(), f.slice("/media/".length)), { force: true }).catch(() => undefined);
    }
    await exec("UPDATE video_jobs SET video = NULL, cover = NULL WHERE id = ?", [v.id]);
    n++;
  }
  return n;
}

