// Fila dos vídeos (tabela video_jobs): escolha do dia, roteiro, aprovação, entrega ao worker, resultado e limpeza.
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { mediaDir } from "../../server-paths.mjs";
import { horaBR } from "~/social/core/agenda";
import { lerOverrides } from "~/social/core/overrides";
import { MARCA } from "~/marca";
import { SOCIAL } from "~/social/config";
import { escolherModelo, lerEntrada, urlDaMateria } from "~/social/site.server";
import type { Foco } from "~/social/tipos";
import { lerDuracao } from "../../scripts/video/videoclip";
import { VIDEO, vozDaSecao, ENERGIA_VOZ } from "./config";
import { lerConfig } from "./config.server";
import { exec, hasDatabase, query } from "./db";
import { gerarVideo } from "./gerador.server";
import { legendasDoVideo } from "./legendas";
import { fechamentoFinal, perguntaDoFechamento, textoFalado, type Imagem, type Roteiro } from "./roteiro";
import type { ItemPronuncia } from "./pronuncia";
import { dicionarioCompleto } from "./pronuncia.server";
import { termosDeDestaque, type FatosVideo } from "./cartoes";
import { fatosDe } from "./fatos.server";
import { gerarRoteiro, imagensDisponiveis, validarRoteiro } from "./roteiro.server";

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
  serie?: string;
  model?: string | null;
  facts?: unknown;
  progress?: string | null;
  metrics_checked_at?: string | null;
  ig_status?: "enviando" | "publicado" | "falhou" | null;
  ig_permalink?: string | null;
  ig_published_at?: string | null;
  ig_error?: string | null;
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
    facts: json(r.facts, null),
    duration_s: r.duration_s == null ? null : Number(r.duration_s),
  };
}

/** Cria o job (a matéria precisa estar publicada e ter imagens). O roteiro é pedido na hora; se falhar, o job fica `falhou` com o motivo. */
export async function criarJob(postId: number, origem: "auto" | "manual", serie = ""): Promise<{ id: number } | { erro: string }> {
  if (!hasDatabase()) return { erro: "sem banco" };
  const [ja] = await query<{ id: number; status: StatusVideo }>("SELECT id, status FROM video_jobs WHERE post_id = ? AND serie = ?", [postId, serie]);
  if (ja && ja.status !== "descartado") return { erro: "esta matéria já tem um vídeo (veja em /admin/videos)" };
  const e = await lerEntrada(postId);
  if (!e || !e.publicada) return { erro: "matéria não publicada" };
  const [fila] = await query<{ overrides: unknown }>("SELECT overrides FROM social_posts WHERE post_id = ? AND network = 'instagram' AND kind = 'feed'", [postId]);
  const imagens = imagensDisponiveis(e, lerOverrides(fila?.overrides));
  if (imagens.length < (origem === "manual" ? 1 : VIDEO.minImagens)) return { erro: `poucas imagens utilizáveis (${imagens.length})` };
  const cfg = await lerConfig();
  if (ja) await exec("DELETE FROM video_jobs WHERE id = ?", [ja.id]); // descartado antes: recomeça
  const r = await exec("INSERT INTO video_jobs (post_id, origin, serie, model, images, voice_id, voice_model) VALUES (?, ?, ?, ?, ?, ?, ?)", [postId, origem, serie, escolherModelo(e), JSON.stringify(imagens), vozDaSecao(cfg, e.section) || null, cfg.model]);
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
    // Fatos da matéria congelados (cartões de dados): refeitos a cada roteiro novo, para pegar preço/nota atuais.
    const fatosVideo = fatosDe(e);
    const roteiro = await gerarRoteiro(e, job.images, fatosVideo, job.serie ?? "");
    await exec("UPDATE video_jobs SET script = ?, facts = ?, status = 'aguardando', error = NULL WHERE id = ?", [JSON.stringify(roteiro), JSON.stringify(fatosVideo), id]);
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
  const [pp] = await query<{ section: string }>("SELECT section FROM posts WHERE id = ?", [job.post_id]);
  const v = validarRoteiro(roteiro, job.images.length, pp?.section ?? "", (job.facts as FatosVideo | null) ?? null, job.serie ?? "");
  if (!v.ok) return `Roteiro inválido: ${v.erro}.`;
  await exec("UPDATE video_jobs SET script = ?, focus = ?, status = IF(status = 'falhou', 'aguardando', status), error = NULL WHERE id = ?", [JSON.stringify(v.roteiro), JSON.stringify(focus), id]);
  return "ok";
}

export const MAX_IMAGENS = 14;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

/**
 * O dono enviou um trecho de material de divulgação (trailer/vídeo de imprensa) para recortar. Entra na lista de imagens como
 * item de vídeo; o crédito vira o texto exibido enquanto o trecho aparece. Nada é baixado de sites de terceiros.
 */
export async function adicionarVideo(id: number, file: File, credito: string): Promise<string> {
  const [j] = await query<Record<string, unknown>>("SELECT * FROM video_jobs WHERE id = ?", [id]);
  if (!j) return "Job não encontrado.";
  const job = linha(j);
  if (job.status !== "aguardando" && job.status !== "falhou") return "Só dá para acrescentar vídeos enquanto o vídeo está em rascunho (use Editar e refazer).";
  if (job.images.length >= MAX_IMAGENS) return `Limite de ${MAX_IMAGENS} itens por vídeo.`;
  const cred = credito.replace(/[{}\\\r\n]/g, " ").trim().slice(0, 60);
  if (cred.length < 3) return "Informe o crédito/fonte do vídeo (ex.: Bandai Namco). Ele aparece na tela durante o trecho.";
  if (!file.size) return "Nenhum arquivo enviado.";
  if (file.size > MAX_VIDEO_BYTES) return "Vídeo maior que 80 MB.";
  const ext = file.type === "video/mp4" ? "mp4" : file.type === "video/webm" ? "webm" : "";
  if (!ext) return "Formato não aceito: use MP4 ou WebM.";
  const buf = Buffer.from(await file.arrayBuffer());
  const d = new Date();
  const rel = `video/uploads/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const nome = `v${id}-${createHash("sha1").update(buf).digest("hex").slice(0, 8)}.${ext}`;
  await mkdir(join(mediaDir(), rel), { recursive: true });
  const caminho = join(mediaDir(), rel, nome);
  await writeFile(caminho, buf);
  // Confere se o ffmpeg consegue abrir (e a duração): arquivo ruim é apagado na hora.
  const { caminhoFfmpeg } = await import("./gerador.server");
  const { spawn } = await import("node:child_process");
  const binario = await caminhoFfmpeg();
  const info = await new Promise<string>((ok) => {
    const p = spawn(binario, ["-hide_banner", "-threads", "1", "-i", caminho], { stdio: ["ignore", "ignore", "pipe"] });
    let e = "";
    p.stderr.on("data", (x) => (e += String(x)));
    p.on("error", () => ok(""));
    p.on("close", () => ok(e));
  });
  const dur = lerDuracao(info);
  if (dur < 4 || !/Video:/.test(info)) {
    await rm(caminho, { force: true }).catch(() => undefined);
    return "Não deu para ler esse vídeo (ou ele tem menos de 4 segundos).";
  }
  await exec("UPDATE video_jobs SET images = ? WHERE id = ?", [JSON.stringify([...job.images, { src: `/media/${rel}/${nome}`, alt: `Vídeo: ${cred}` }]), id]);
  return "ok";
}

/** O dono enviou uma imagem própria para o vídeo: entra no fim da lista (os números das imagens existentes não mudam). */
export async function adicionarImagem(id: number, file: File): Promise<string> {
  const [j] = await query<Record<string, unknown>>("SELECT * FROM video_jobs WHERE id = ?", [id]);
  if (!j) return "Job não encontrado.";
  const job = linha(j);
  if (job.status !== "aguardando" && job.status !== "falhou") return "Só dá para acrescentar imagens enquanto o vídeo está em rascunho (use Editar e refazer).";
  if (job.images.length >= MAX_IMAGENS) return `Limite de ${MAX_IMAGENS} imagens por vídeo.`;
  const { salvarUpload } = await import("~/social/server/uploads.server");
  const up = await salvarUpload(id, file);
  await exec("UPDATE video_jobs SET images = ? WHERE id = ?", [JSON.stringify([...job.images, { src: up.src, alt: "imagem enviada por você" }]), id]);
  return "ok";
}

/**
 * Botão "Publicar no Instagram (Reels)": envia o MP4 pronto, com a legenda sugerida e a capa. Roda em segundo plano (o Instagram leva
 * minutos para processar o vídeo); o painel atualiza sozinho. Só um envio por vídeo: publicado ou em andamento não repete.
 */
export async function publicarReel(id: number): Promise<string> {
  const { getConta, getToken, marcarTokenInvalido } = await import("~/social/server/conta.server");
  const conta = await getConta();
  const token = await getToken();
  if (!conta.hasToken || !token || conta.token_status !== "ok" || !conta.account_id) return "Instagram não conectado ou com token inválido (veja /admin/instagram).";
  const [j] = await query<Record<string, unknown>>("SELECT * FROM video_jobs WHERE id = ?", [id]);
  if (!j || j.status !== "pronto" || !j.video) return "O vídeo precisa estar pronto para publicar.";
  const job = linha(j);
  if (job.ig_status === "publicado") return "Este vídeo já foi publicado no Instagram.";
  const { containerStatus, publicarReel: enviarReel, classificar } = await import("~/social/server/instagram.server");
  // Envio travado (processo caiu): se o Instagram já publicou aquele contêiner, não envia de novo.
  const antigo = typeof j.ig_container_id === "string" ? j.ig_container_id : "";
  if (job.ig_status === "enviando" && antigo) {
    try {
      if ((await containerStatus(antigo, token)) === "PUBLISHED") {
        await exec("UPDATE video_jobs SET ig_status = 'publicado', ig_published_at = UTC_TIMESTAMP(), ig_error = NULL WHERE id = ?", [id]);
        return "O Instagram já tinha publicado este vídeo (marquei como publicado).";
      }
    } catch {
      /* segue para tentar de novo */
    }
  }
  const r = await exec(
    "UPDATE video_jobs SET ig_status = 'enviando', ig_started_at = UTC_TIMESTAMP(), ig_error = NULL, ig_container_id = NULL WHERE id = ? AND status = 'pronto' AND (ig_status IS NULL OR ig_status = 'falhou' OR (ig_status = 'enviando' AND ig_started_at < UTC_TIMESTAMP() - INTERVAL 15 MINUTE))",
    [id],
  );
  if (!r.affected) return "Este vídeo já está sendo enviado ao Instagram.";
  const legenda = (job.captions?.instagram ?? "").trim() || `${job.title ?? MARCA.site}`;
  void (async () => {
    try {
      const { cota } = await import("~/social/server/instagram.server");
      if ((await cota(conta.account_id!, token)).uso >= 95) throw new Error("Cota diária da API do Instagram quase cheia: tente mais tarde.");
      const res = await enviarReel({
        contaId: conta.account_id!,
        token,
        videoUrl: `${SOCIAL.baseUrl}${job.video}`,
        legenda: legenda.slice(0, 2200),
        capaUrl: job.cover ? `${SOCIAL.baseUrl}${job.cover}` : undefined,
        aoCriarContainer: async (cid) => void (await exec("UPDATE video_jobs SET ig_container_id = ? WHERE id = ?", [cid, id])),
      });
      await exec("UPDATE video_jobs SET ig_status = 'publicado', ig_media_id = ?, ig_permalink = ?, ig_published_at = UTC_TIMESTAMP(), ig_error = NULL WHERE id = ?", [res.mediaId, res.link, id]);
    } catch (err) {
      const msg = String((err as Error)?.message ?? err).slice(0, 450);
      if (classificar(err).acao === "token") await marcarTokenInvalido("Token do Instagram inválido: gere outro e cole em /admin/instagram.");
      await exec("UPDATE video_jobs SET ig_status = 'falhou', ig_error = ? WHERE id = ?", [msg, id]);
    }
  })();
  return "ok";
}

/** Aprova e começa a gerar o vídeo aqui no servidor (em segundo plano). */
export async function aprovar(id: number): Promise<{ ok: boolean; aviso?: string }> {
  const r = await exec("UPDATE video_jobs SET status = 'aprovado', approved_at = UTC_TIMESTAMP(), error = NULL, attempts = 0, locked_at = NULL WHERE id = ? AND status IN ('aguardando','falhou','pronto') AND script IS NOT NULL", [id]);
  if (!r.affected) return { ok: false, aviso: "Este vídeo não pode ser aprovado agora (sem roteiro ou já em geração)." };
  void processarFilaNoServidor();
  return { ok: true };
}

let gerandoAgora = false;

/** Gera, aqui no servidor, o próximo vídeo aprovado (um por vez; em segundo plano). O que sobrar fica `aprovado` e sai na próxima chamada. */
export async function processarFilaNoServidor(): Promise<void> {
  if (gerandoAgora || !hasDatabase()) return;
  gerandoAgora = true;
  try {
    for (let n = 0; n < 5; n++) {
      const pacote = await proximo();
      if (!pacote) break;
      const dir = await mkdtemp(join(tmpdir(), "video-"));
      try {
        const out = await gerarVideo(pacote, dir, { qualidade: "leve" });
        await concluir(pacote.id, { video: await readFile(join(dir, "saida.mp4")), capa: out.capa, chars: out.chars, duracao: out.duracao });
      } catch (err) {
        let msg = String((err as Error)?.message ?? err);
        if (/ENOENT/.test(msg) && /ffmpeg/i.test(msg)) msg = "ffmpeg não encontrado neste servidor. Confira se o ffmpeg-static foi instalado no deploy.";
        console.error(`[video] #${pacote.id} falhou: ${msg.slice(0, 200)}`);
        await falhar(pacote.id, msg);
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  } finally {
    gerandoAgora = false;
  }
}

/** Apaga do disco o MP4 e a capa de um job (só caminhos de /media/video). */
async function apagarArquivosDoJob(id: number): Promise<void> {
  const [v] = await query<{ video: string | null; cover: string | null }>("SELECT video, cover FROM video_jobs WHERE id = ?", [id]);
  for (const f of [v?.video, v?.cover]) {
    if (!f || !/^\/media\/video\/\d{4}\/\d{2}\/[\w.-]+$/.test(f)) continue;
    await rm(join(mediaDir(), f.slice("/media/".length)), { force: true }).catch(() => undefined);
  }
  await exec("UPDATE video_jobs SET video = NULL, cover = NULL WHERE id = ?", [id]);
  const [im] = await query<{ images: unknown }>("SELECT images FROM video_jobs WHERE id = ?", [id]);
  for (const x of json<Imagem[]>(im?.images, [])) {
    if (/^\/media\/video\/uploads\/\d{4}\/\d{2}\/[\w.-]+$/.test(x.src)) await rm(join(mediaDir(), x.src.slice("/media/".length)), { force: true }).catch(() => undefined);
  }
}

/** Exclui o vídeo (pronto, com falha ou rascunho): some da lista e os arquivos são apagados na hora. Não mexe em vídeo sendo gerado. */
export async function descartar(id: number): Promise<boolean> {
  const r = await exec("UPDATE video_jobs SET status = 'descartado' WHERE id = ? AND status NOT IN ('gerando')", [id]);
  if (!r.affected) return false;
  await apagarArquivosDoJob(id);
  return true;
}

/** "Editar e refazer": volta um vídeo pronto para o rascunho (roteiro, imagens e enquadramentos editáveis); só gera de novo ao aprovar. O MP4 antigo continua até o novo ficar pronto. */
export async function reabrir(id: number): Promise<boolean> {
  const r = await exec("UPDATE video_jobs SET status = 'aguardando', error = NULL, ig_status = NULL, ig_container_id = NULL, ig_media_id = NULL, ig_permalink = NULL, ig_published_at = NULL, ig_error = NULL WHERE id = ? AND status = 'pronto' AND script IS NOT NULL AND (ig_status IS NULL OR ig_status <> 'enviando')", [id]);
  return r.affected > 0;
}

// ───────────── Geração no servidor ─────────────

export interface PacoteWorker {
  id: number;
  titulo: string;
  secao: string;
  roteiro: Roteiro;
  imagens: { src: string; url: string; foco: Foco }[];
  voz: string;
  modelo: string;
  velocidade: number;
  estabilidade: number;
  estilo: number;
  efeitos: boolean;
  falado: string;
  pronuncia: ItemPronuncia[];
  termos: string[];
  fatos: FatosVideo | null;
  pausa: number;
  chaveSecao: string;
  /** Índice da imagem escolhida para a capa/abertura (opcional). */
  capa?: number;
  fechamento: string;
  /** Pergunta do cartão de fechamento (null = cartão de sempre). */
  pergunta: string | null;
  cta: string;
  baseUrl: string;
}

/** Pega o job aprovado mais antigo (ou o pedido) e o marca como `gerando`. */
export async function proximo(idPedido?: number): Promise<PacoteWorker | null> {
  await recuperarPresos();
  const [j] = await query<Record<string, unknown>>(`SELECT * FROM video_jobs WHERE status = 'aprovado' ${idPedido ? "AND id = ?" : ""} ORDER BY approved_at LIMIT 1`, idPedido ? [idPedido] : []);
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
  const abs = (s: string) => (s === "arte:1" ? (arte1 ? `${SOCIAL.baseUrl}${arte1}` : s) : s.startsWith("http") || s.startsWith("arte:") || s.startsWith("yt:") ? s : `${SOCIAL.baseUrl}${s}`);
  const dic = await dicionarioCompleto();
  return {
    id: job.id,
    titulo: e.titulo,
    secao: SOCIAL.rotuloSecao[e.section] ?? e.section.toUpperCase(),
    chaveSecao: e.section,
    roteiro: job.script,
    imagens: job.images.map((x, i) => ({ src: x.src, url: abs(x.src), foco: job.focus[String(i)] ?? "auto", alt: x.alt })),
    capa: job.focus["_capa"] != null && Number.isInteger(Number(job.focus["_capa"])) ? Number(job.focus["_capa"]) : undefined,
    voz,
    modelo: job.voice_model || cfg.model,
    velocidade: Math.min(1.2, Math.max(0.7, cfg.speed * ENERGIA_VOZ[cfg.energia].velocidade)),
    efeitos: cfg.efeitos,
    estabilidade: ENERGIA_VOZ[cfg.energia].estabilidade,
    estilo: ENERGIA_VOZ[cfg.energia].estilo,
    falado: textoFalado(job.script, dic, VIDEO.voz.pausaAntesNumero),
    pronuncia: dic,
    fatos: (job.facts as FatosVideo | null) ?? null,
    termos: termosDeDestaque(job.script, (job.facts as FatosVideo | null) ?? null),
    pausa: VIDEO.voz.pausaAntesNumero,
    fechamento: fechamentoFinal(job.script),
    pergunta: perguntaDoFechamento(job.script),
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
  await exec("UPDATE video_jobs SET status = 'falhou', error = 'o gerador não respondeu (2 tentativas)', locked_at = NULL WHERE status = 'gerando' AND locked_at < UTC_TIMESTAMP() - INTERVAL 90 MINUTE AND attempts >= 2");
  await exec("UPDATE video_jobs SET status = 'aprovado', locked_at = NULL WHERE status = 'gerando' AND locked_at < UTC_TIMESTAMP() - INTERVAL 90 MINUTE");
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

/** Um job com o título e a seção da matéria (para a prévia da capa). */
export async function obterJob(id: number): Promise<(JobVideo & { titulo_post: string; secao_post: string }) | null> {
  const [r] = await query<Record<string, unknown>>("SELECT j.*, p.title AS titulo_post, p.section AS secao_post FROM video_jobs j JOIN posts p ON p.id = j.post_id WHERE j.id = ?", [id]);
  return r ? ({ ...linha(r), titulo_post: String(r.titulo_post ?? ""), secao_post: String(r.secao_post ?? "") }) : null;
}

/** Vídeos em andamento e prontos ainda não publicados (os já publicados vão para a lista recolhida). */
export async function listarJobs(limite = 10): Promise<JobVideo[]> {
  const rows = await query<Record<string, unknown>>(
    "SELECT j.*, p.title, p.section, p.image_url AS post_image FROM video_jobs j JOIN posts p ON p.id = j.post_id WHERE j.status <> 'descartado' AND (j.ig_status IS NULL OR j.ig_status <> 'publicado') ORDER BY j.created_at DESC, j.id DESC LIMIT ?",
    [limite],
  );
  return rows.map(linha);
}

/** Vídeos já publicados no Instagram (mais recentes primeiro), com busca pelo título da matéria. Os arquivos continuam disponíveis para postar em outro lugar. */
export async function listarPublicados(busca = "", limite = 40): Promise<{ itens: JobVideo[]; total: number }> {
  const like = `%${busca.replace(/[%_\\]/g, "").trim()}%`;
  const filtro = busca.trim() ? "AND p.title LIKE ?" : "";
  const args = busca.trim() ? [like] : [];
  const rows = await query<Record<string, unknown>>(
    `SELECT j.*, p.title, p.section, p.image_url AS post_image FROM video_jobs j JOIN posts p ON p.id = j.post_id WHERE j.status = 'pronto' AND j.ig_status = 'publicado' ${filtro} ORDER BY j.ig_published_at DESC, j.id DESC LIMIT ?`,
    [...args, limite],
  );
  const [t] = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM video_jobs j JOIN posts p ON p.id = j.post_id WHERE j.status = 'pronto' AND j.ig_status = 'publicado' ${filtro}`, args);
  return { itens: rows.map(linha), total: Number(t?.n ?? 0) };
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

