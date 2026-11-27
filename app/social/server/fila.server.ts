// Fila de posts sociais e o gatilho (docs/instagram.md). enfileirar() é rápido (não gera imagem); tick() decide e envia.
import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { mediaDir } from "../../../server-paths.mjs";
import { SOCIAL } from "../config";
import { horaBR, podeEnviar } from "../core/agenda";
import { lerOverrides } from "../core/overrides";
import { extrairPontos } from "../core/pontos";
import { montarLegenda } from "../core/legenda";
import { db, exec, hasDatabase, query } from "../db";
import { gerarSlides, gerarStory } from "../render/slides.server";
import { salvar } from "../render/render.server";
import { escolherModelo, lerEntrada, modeloAtivo, type DicaSocial } from "../site.server";
import type { Modelo, Overrides } from "../tipos";
import { getConta, getToken, marcarTokenInvalido, pausar, renovarSePreciso, type Conta } from "./conta.server";
import { limparUploads } from "./uploads.server";
import { classificar, containerStatus, cota, publicar, publicarStory, ultimasMidias } from "./instagram.server";

export interface LinhaFila {
  id: number;
  post_id: number;
  kind: "feed" | "story" | "reel";
  model: Modelo;
  status: "pending" | "preview" | "sending" | "published" | "failed" | "skipped" | "expired";
  origin: "auto" | "manual";
  priority: number;
  payload: unknown;
  overrides?: unknown;
  caption: string | null;
  images: unknown;
  container_id: string | null;
  media_id: string | null;
  permalink: string | null;
  error: string | null;
  attempts: number;
  next_try_at: string | null;
  expires_at?: string | null;
  rendered_at?: string | null;
  created_at: string;
  published_at: string | null;
  title?: string;
}

const imagensDe = (v: unknown): string[] => {
  if (Array.isArray(v)) return v as string[];
  try {
    return typeof v === "string" ? (JSON.parse(v) as string[]) : [];
  } catch {
    return [];
  }
};
const payloadDe = (v: unknown): DicaSocial | undefined => {
  try {
    return (typeof v === "string" ? JSON.parse(v) : v) as DicaSocial | undefined;
  } catch {
    return undefined;
  }
};

/** Põe a matéria publicada na fila (feed e, se ligado, Story). Rascunho não entra. Falha aqui nunca pode atrapalhar a publicação. */
export async function enfileirar(postId: number, dica?: DicaSocial, origem: "auto" | "manual" = "auto"): Promise<number | null> {
  if (!hasDatabase()) return null;
  let idFeed: number | null = null;
  let e: Awaited<ReturnType<typeof lerEntrada>> = null;
  let conta: Conta | null = null;
  let modelo: Modelo | null = null;
  try {
    e = await lerEntrada(postId, dica);
    if (!e || !e.publicada) return null;
    conta = await getConta();
    modelo = escolherModelo(e);
    if (origem === "manual" || modeloAtivo(modelo, conta.models)) {
      const cfg = SOCIAL.fila[modelo];
      // Carrossel (artigo, review, guia) nunca sai sozinho: entra na fila para o dono revisar os slides e as fotos e postar à mão.
      const origemFinal = origem === "manual" || modelo.startsWith("C-") ? "manual" : "auto";
      // Notícia: some da fila 48 h depois de publicada (passou a hora dela). Itens manuais ficam 7 dias.
      let horas = origemFinal === "manual" ? 168 : cfg.validadeH;
      if (modelo === "N" && origemFinal === "auto") {
        const [h] = await query<{ h: number }>("SELECT TIMESTAMPDIFF(HOUR, published_at, UTC_TIMESTAMP()) AS h FROM posts WHERE id = ?", [postId]);
        const restante = 48 - Number(h?.h ?? 0);
        if (restante <= 0) return null;
        horas = Math.min(horas, restante);
      }
      const r = await exec(
        `INSERT IGNORE INTO social_posts (post_id, network, kind, model, status, origin, priority, payload, expires_at)
         VALUES (?, 'instagram', 'feed', ?, 'pending', ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR))`,
        [postId, modelo, origemFinal, cfg.prioridade, dica ? JSON.stringify(dica) : null, horas],
      );
      idFeed = r.affected ? r.insertId : null;
    }
  } catch (err) {
    console.error(`[social] enfileirar falhou (post ${postId}): ${String((err as Error)?.message ?? err).slice(0, 120)}`);
  }
  // Story: independente dos modelos ligados do feed. Pelo botão "últimas 30" (manual) também entra, com validade de 7 dias.
  if (conta && modelo && (conta.story_enabled || conta.test_mode)) {
    try {
      const cfg = SOCIAL.story.fila[modelo];
      // Story de carrossel usa o slide 1 do feed (ainda não revisado): também só sai à mão.
      const manual = origem === "manual" || modelo.startsWith("C-");
      await exec(
        `INSERT IGNORE INTO social_posts (post_id, network, kind, model, status, origin, priority, payload, expires_at)
         VALUES (?, 'instagram', 'story', ?, 'pending', ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR))`,
        [postId, modelo, manual ? "manual" : "auto", cfg.prioridade, dica ? JSON.stringify(dica) : null, manual ? 168 : cfg.validadeH],
      );
    } catch (err) {
      console.error(`[social] enfileirar story falhou (post ${postId}): ${String((err as Error)?.message ?? err).slice(0, 120)}`);
    }
  }
  return idFeed;
}

/** Gera imagens e legenda de uma linha (se ainda não há) e grava. Lança erro se faltar dado. */
async function gerar(l: LinhaFila): Promise<void> {
  const e = await lerEntrada(l.post_id, payloadDe(l.payload));
  if (!e) throw new Error("matéria não existe mais");
  if (l.kind === "story") {
    // Story: ST-N (capa) para notícia; os outros usam o slide 1 do feed (se o feed já gerou a arte, reaproveita o arquivo).
    const [feed] = await query<{ images: unknown; status: string; overrides: unknown }>("SELECT images, status, overrides FROM social_posts WHERE post_id = ? AND network = 'instagram' AND kind = 'feed'", [l.post_id]);
    const slide1 = feed ? imagensDe(feed.images)[0] ?? null : null;
    // Se o dono trocou a capa do post, o Story usa a mesma.
    const capaPropria = lerOverrides(feed?.overrides, l.model, l.model === "C-artigo" ? extrairPontos(e.corpo) : []).trocas?.["1"];
    if (capaPropria) e.capa = { src: capaPropria.src, credito: null };
    const jpeg = await gerarStory(l.model, e, { slide1Src: slide1, noFeed: feed?.status === "published" });
    const img = await salvar(jpeg, l.id, 1, "st");
    await exec("UPDATE social_posts SET images = ?, caption = NULL, rendered_at = UTC_TIMESTAMP(), error = NULL WHERE id = ?", [JSON.stringify([img]), l.id]);
    return;
  }
  const ov = lerOverrides(l.overrides, l.model, l.model === "C-artigo" ? extrairPontos(e.corpo) : []);
  const slides = await gerarSlides(l.model, e, ov);
  if (slides.pontos) e.pontos = slides.pontos;
  const imgs: string[] = [];
  for (let i = 0; i < slides.jpegs.length; i++) imgs.push(await salvar(slides.jpegs[i], l.id, i + 1));
  await exec("UPDATE social_posts SET images = ?, caption = ?, rendered_at = UTC_TIMESTAMP(), error = NULL WHERE id = ?", [JSON.stringify(imgs), montarLegenda(e, l.model), l.id]);
}

async function carregar(id: number): Promise<LinhaFila | null> {
  const [l] = await query<LinhaFila>("SELECT * FROM social_posts WHERE id = ?", [id]);
  return l ?? null;
}

/**
 * A tentativa anterior desta linha já criou um contêiner: ele foi publicado? A Meta às vezes PUBLICA e mesmo assim devolve erro
 * (ex.: "Application request limit reached" no media_publish); sem esta conferência o post saía de novo a cada nova tentativa
 * (posts duplicados e triplicados em 2026-11-26).
 * "sim" = já está no Instagram (a linha é marcada como publicada); "nao" = pode enviar; "incerto" = não deu para conferir agora.
 */
async function conferirContainer(l: LinhaFila, token: string | null): Promise<"sim" | "nao" | "incerto"> {
  const legenda = (l.caption ?? "").trim().slice(0, 60);
  const mesmaLegenda = (x: { caption?: string }) => legenda.length >= 20 && (x.caption ?? "").trim().slice(0, 60) === legenda;
  const marcar = async (m: { id: string; permalink?: string } | undefined, como: string) => {
    await exec("UPDATE social_posts SET status = 'published', media_id = COALESCE(?, media_id), permalink = COALESCE(?, permalink), published_at = COALESCE(published_at, UTC_TIMESTAMP()), locked_at = NULL, error = NULL WHERE id = ?", [m?.id ?? null, m?.permalink ?? null, l.id]);
    console.warn(`[social] linha ${l.id} (matéria ${l.post_id}, ${l.kind}): já estava no Instagram (${como}); não envia de novo`);
  };
  if (!token) return l.container_id ? "incerto" : "nao";
  // 1) O contêiner da tentativa anterior foi publicado?
  if (l.container_id) {
    try {
      if ((await containerStatus(l.container_id, token)) === "PUBLISHED") {
        const m = l.kind === "story" ? undefined : (await ultimasMidias(token).catch(() => ({ data: [] as { id: string; caption?: string; permalink?: string }[] }))).data.find(mesmaLegenda);
        await marcar(m, "contêiner publicado");
        return "sim";
      }
    } catch {
      return "incerto";
    }
  }
  // 2) Feed: já existe no perfil um post com a mesma legenda? Pega o que o item 1 não pega (contêiner de uma tentativa mais antiga,
  //    status que não virou PUBLISHED). Uma chamada só por envio.
  if (l.kind === "feed" && legenda.length >= 20) {
    try {
      const m = (await ultimasMidias(token)).data.find(mesmaLegenda);
      if (m) {
        await marcar(m, "mesma legenda no perfil");
        return "sim";
      }
    } catch {
      return l.container_id || l.attempts > 0 ? "incerto" : "nao";
    }
  }
  return "nao";
}

/** Envia uma linha já travada (status sending). Atualiza o estado conforme o resultado. */
async function enviar(l: LinhaFila, conta: Conta, token: string): Promise<void> {
  // Nova tentativa: confere antes se a anterior não chegou a publicar (senão o post sai duplicado).
  const antes = await conferirContainer(l, token);
  console.log(`[social] enviar linha ${l.id} (matéria ${l.post_id}, ${l.kind}, tentativa ${l.attempts + 1}): conferência antes = ${antes}`);
  if (antes === "sim") return;
  if (antes === "incerto") {
    await exec("UPDATE social_posts SET status = 'failed', error = ?, next_try_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE), locked_at = NULL WHERE id = ?", ["não deu para conferir se a tentativa anterior foi publicada; confiro de novo em 30 min", l.id]);
    return;
  }
  try {
    if (!imagensDe(l.images).length || (l.kind === "feed" && !l.caption)) {
      await gerar(l);
      l = (await carregar(l.id))!;
    }
  } catch (err) {
    await exec("UPDATE social_posts SET status = 'skipped', error = ?, locked_at = NULL WHERE id = ?", [`não gerou a arte: ${String((err as Error)?.message ?? err).slice(0, 300)}`, l.id]);
    return;
  }
  try {
    const { uso } = await cota(conta.account_id!, token);
    if (uso >= 90) {
      await pausar(6, `Cota da API quase cheia (${uso}/100): nova tentativa em 6 h.`);
      await exec("UPDATE social_posts SET status = 'pending', locked_at = NULL WHERE id = ?", [l.id]);
      return;
    }
    const imgs = imagensDe(l.images).map((p) => `${SOCIAL.baseUrl}${p}`);
    const aoCriarContainer = async (id: string) => void (await exec("UPDATE social_posts SET container_id = ? WHERE id = ?", [id, l.id]));
    const r =
      l.kind === "story"
        ? await publicarStory({ contaId: conta.account_id!, token, imagem: imgs[0], aoCriarContainer })
        : await publicar({ contaId: conta.account_id!, token, imagens: imgs, legenda: l.caption!, aoCriarContainer });
    await exec("UPDATE social_posts SET status = 'published', media_id = ?, permalink = ?, published_at = UTC_TIMESTAMP(), locked_at = NULL, error = NULL WHERE id = ?", [r.mediaId, r.link, l.id]);
    console.log(`[social] publicado: linha ${l.id} (matéria ${l.post_id}, ${l.kind}) mídia ${r.mediaId}`);
  } catch (err) {
    const msg = String((err as Error)?.message ?? err).slice(0, 400);
    // Deu erro, mas esta tentativa pode ter publicado mesmo assim: confere já (se não der, a próxima tentativa confere antes de enviar).
    const atual = await carregar(l.id);
    const conf = atual ? await conferirContainer(atual, token) : "nao";
    console.warn(`[social] erro na linha ${l.id} (matéria ${l.post_id}, ${l.kind}): ${msg.slice(0, 160)} | conferência depois do erro: ${conf}`);
    if (conf === "sim") return;
    const c = classificar(err);
    if (c.acao === "token") {
      await marcarTokenInvalido("Token do Instagram inválido: gere outro e cole em /admin/instagram.");
      await exec("UPDATE social_posts SET status = 'pending', error = ?, locked_at = NULL WHERE id = ?", [msg, l.id]);
    } else if (c.acao === "limite") {
      await exec("UPDATE social_posts SET status = 'failed', error = ?, next_try_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), locked_at = NULL WHERE id = ?", [msg, c.atrasoMin ?? 60, l.id]);
    } else if (c.acao === "pausa") {
      await pausar(6, `Limite de publicação da API: pausado por 6 h. ${msg}`);
      await exec("UPDATE social_posts SET status = 'pending', error = ?, locked_at = NULL WHERE id = ?", [msg, l.id]);
    } else if (c.acao === "bloqueio") {
      await pausar(24, `Instagram bloqueou temporariamente: pausado por 24 h. ${msg}`);
      await exec("UPDATE social_posts SET status = 'pending', error = ?, locked_at = NULL WHERE id = ?", [msg, l.id]);
    } else if (c.acao === "falhar") {
      await exec("UPDATE social_posts SET status = 'failed', attempts = 3, error = ?, locked_at = NULL WHERE id = ?", [msg, l.id]);
    } else {
      const tent = l.attempts + 1;
      const atraso = [15, 60, 240][Math.min(tent - 1, 2)];
      await exec("UPDATE social_posts SET status = 'failed', attempts = ?, error = ?, next_try_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), locked_at = NULL WHERE id = ?", [tent, msg, atraso, l.id]);
    }
  }
}

/** Linha presa em `sending` (o processo caiu): confere o contêiner para não postar duas vezes. */
async function recuperarPresas(token: string | null): Promise<void> {
  const presas = await query<LinhaFila>("SELECT * FROM social_posts WHERE status = 'sending' AND locked_at < UTC_TIMESTAMP() - INTERVAL 15 MINUTE");
  for (const l of presas) {
    const r = await conferirContainer(l, token);
    if (r === "sim") continue;
    // Não publicada: volta para a fila. Sem como conferir agora: espera 30 min (o envio confere de novo antes de postar).
    if (r === "nao") await exec("UPDATE social_posts SET status = 'pending', locked_at = NULL WHERE id = ?", [l.id]);
    else await exec("UPDATE social_posts SET status = 'failed', next_try_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE), locked_at = NULL WHERE id = ?", [l.id]);
  }
}

async function limparArquivos(): Promise<void> {
  const raiz = join(mediaDir(), "social");
  const limite = Date.now() - 30 * 86400_000;
  try {
    // Só as pastas ano/mês das artes geradas; qualquer outra pasta (ex.: uploads do dono) não é tocada nem derruba a limpeza.
    for (const ano of (await readdir(raiz)).filter((x) => /^\d{4}$/.test(x)))
      for (const mes of (await readdir(join(raiz, ano))).filter((x) => /^\d{2}$/.test(x)))
        for (const f of await readdir(join(raiz, ano, mes))) {
          const p = join(raiz, ano, mes, f);
          try {
            if ((await stat(p)).mtimeMs < limite) await rm(p, { force: true });
          } catch {
            /* arquivo sumiu ou é pasta: segue */
          }
        }
  } catch {
    /* pasta ainda não existe */
  }
}

let ultimaLimpeza = "";

export interface ResultadoTick {
  acao: string;
  postId?: number;
}

/** Um passo da fila para o formato dado: modo de teste gera prévias; ligado, envia 1 respeitando janela, limite e intervalo. */
async function passo(kind: "feed" | "story", conta: Conta, token: string | null): Promise<ResultadoTick> {
  if (conta.test_mode) {
    // Modo de teste: gera arte (e legenda do feed) de até 2 pendentes e deixa como "preview" (não envia).
    const lista = await query<LinhaFila>("SELECT * FROM social_posts WHERE network = 'instagram' AND kind = ? AND status = 'pending' ORDER BY priority DESC, created_at DESC LIMIT 2", [kind]);
    for (const l of lista) {
      try {
        await gerar(l);
        await exec("UPDATE social_posts SET status = 'preview' WHERE id = ?", [l.id]);
      } catch (err) {
        await exec("UPDATE social_posts SET status = 'skipped', error = ? WHERE id = ?", [`não gerou a arte: ${String((err as Error)?.message ?? err).slice(0, 300)}`, l.id]);
      }
    }
    return { acao: `modo de teste: ${lista.length} prévia(s)` };
  }
  if (kind === "story" && !conta.story_enabled) return { acao: "desligado" };

  const [pub] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM social_posts WHERE network = 'instagram' AND kind = ? AND status = 'published' AND published_at >= ?", [kind, inicioDoDia()]);
  const [ult] = await query<{ t: string | null }>("SELECT MAX(published_at) AS t FROM social_posts WHERE network = 'instagram' AND kind = ? AND status = 'published'", [kind]);
  const decisao = podeEnviar(
    { limiteDia: kind === "story" ? conta.story_daily_limit : conta.daily_limit, intervaloMin: kind === "story" ? conta.story_min_gap_minutes : conta.min_gap_minutes, inicioHora: conta.start_hour, fimHora: conta.end_hour },
    { agora: new Date(), publicadosHoje: Number(pub?.n ?? 0), ultimoPublicado: ult?.t ? new Date(`${String(ult.t).replace(" ", "T")}Z`) : null, pausadoAte: conta.paused_until ? new Date(`${String(conta.paused_until).replace(" ", "T")}Z`) : null, tokenOk: conta.token_status === "ok" && !!token && !!conta.account_id },
  );
  if (!decisao.pode) return { acao: decisao.motivo };

  // Só sai sozinho o que entrou sozinho (origin auto): notícia de até 48 h, promoção e lançamentos. O que veio do botão "últimas 30" e os carrosséis ficam para "Postar agora".
  const GRUPOS: Record<string, Modelo[]> = { N: ["N"], P: ["P1", "P2"], S: ["S"] }; // carrossel (C) nunca é automático
  const modelos = kind === "feed" ? Object.entries(GRUPOS).filter(([g]) => conta.models[g] !== false).flatMap(([, m]) => m) : null;
  if (modelos && !modelos.length) return { acao: "nenhum modelo ligado" };
  const [l] = await query<LinhaFila>(
    `SELECT * FROM social_posts WHERE network = 'instagram' AND kind = ? AND origin = 'auto' ${modelos ? `AND model IN (${modelos.map(() => "?").join(",")})` : ""}
       ${kind === "feed" ? "AND (model <> 'N' OR EXISTS (SELECT 1 FROM posts p WHERE p.id = social_posts.post_id AND p.published_at > UTC_TIMESTAMP() - INTERVAL 48 HOUR))" : ""}
       AND (status = 'pending' OR (status = 'failed' AND attempts < 3 AND next_try_at <= UTC_TIMESTAMP()))
     ORDER BY priority DESC, created_at DESC LIMIT 1`,
    [kind, ...(modelos ?? [])],
  );
  if (!l) return { acao: "fila vazia" };
  const r = await exec("UPDATE social_posts SET status = 'sending', locked_at = UTC_TIMESTAMP() WHERE id = ? AND status IN ('pending','failed')", [l.id]);
  if (!r.affected) return { acao: "outra execução pegou" };
  await enviar(l, conta, token!);
  return { acao: "enviado", postId: l.post_id };
}

/** Roda a cada coleta (30 min) e logo depois de publicar uma matéria. Uma instância por vez (GET_LOCK). */
export async function tick(): Promise<ResultadoTick> {
  if (!hasDatabase()) return { acao: "sem banco" };
  const conn = await db().getConnection();
  try {
    const [[lock]] = (await conn.query("SELECT GET_LOCK('social_tick', 0) AS ok")) as unknown as [[{ ok: number }]];
    if (!lock?.ok) return { acao: "outra execução em andamento" };
    try {
      const token = await getToken();
      await recuperarPresas(token);
      await exec("UPDATE social_posts SET status = 'expired' WHERE status IN ('pending','failed') AND expires_at < UTC_TIMESTAMP()");
      await renovarSePreciso();
      const hoje = horaBR(new Date()).dia;
      if (ultimaLimpeza !== hoje) {
        ultimaLimpeza = hoje;
        await limparArquivos();
        await limparUploads();
      }
      const conta = await getConta();
      if (!conta.enabled && !conta.test_mode) return { acao: "desligado" };
      const feed = await passo("feed", conta, token);
      if (!conta.story_enabled && !conta.test_mode) return feed;
      const story = await passo("story", conta, token);
      return { acao: `feed: ${feed.acao}; story: ${story.acao}`, postId: feed.postId ?? story.postId };
    } finally {
      await conn.query("SELECT RELEASE_LOCK('social_tick')");
    }
  } finally {
    conn.release();
  }
}

/** Início do dia de Brasília em UTC (para contar os posts de hoje). */
function inicioDoDia(): string {
  const { dia } = horaBR(new Date());
  return new Date(`${dia}T03:00:00Z`).toISOString().slice(0, 19).replace("T", " ");
}

/** Ações do painel. "Postar agora" ignora janela, limite e intervalo, mas não a falta de token. */
export async function postarAgora(id: number): Promise<string> {
  const conta = await getConta();
  const token = await getToken();
  if (conta.token_status !== "ok" || !token || !conta.account_id) return "Sem token válido: conecte a conta em /admin/instagram.";
  const r = await exec("UPDATE social_posts SET status = 'sending', locked_at = UTC_TIMESTAMP(), origin = 'manual' WHERE id = ? AND status IN ('pending','preview','failed','skipped')", [id]);
  if (!r.affected) return "Esta linha não pode ser enviada agora.";
  const l = await carregar(id);
  if (l) await enviar(l, conta, token);
  return "ok";
}

/** As N matérias publicadas mais recentes (a "vitrine" da fila: é só isso que o painel mostra). */
const RECENTES = `SELECT id FROM (SELECT id FROM posts WHERE status = 'published' AND published_at <= UTC_TIMESTAMP() ORDER BY published_at DESC, id DESC LIMIT ?) r`;

/** Coloca na fila as N últimas matérias publicadas que ainda não estão (para ver as artes de matérias que já existiam). Repetir o clique não acrescenta nada além das N mais recentes. */
export async function enfileirarRecentes(n = 30): Promise<number> {
  // Matérias das N mais recentes que ainda não têm o post de feed OU o Story (o Story só conta se estiver ligado ou em teste).
  const conta = await getConta();
  const comStory = conta.story_enabled || conta.test_mode;
  const rows = await query<{ id: number }>(
    `SELECT p.id FROM posts p WHERE p.id IN (${RECENTES})
       AND (NOT EXISTS (SELECT 1 FROM social_posts s WHERE s.post_id = p.id AND s.network = 'instagram' AND s.kind = 'feed')
         ${comStory ? "OR NOT EXISTS (SELECT 1 FROM social_posts s WHERE s.post_id = p.id AND s.network = 'instagram' AND s.kind = 'story')" : ""})
     ORDER BY p.published_at DESC`,
    [n],
  );
  const contar = async () => Number((await query<{ c: number }>("SELECT COUNT(*) AS c FROM social_posts WHERE network = 'instagram'"))[0]?.c ?? 0);
  const antes = await contar();
  for (const r of rows.reverse()) await enfileirar(r.id, undefined, "manual");
  return (await contar()) - antes;
}

/** Zera a fila: apaga tudo que ainda não foi ao ar (o que já foi publicado fica, para nunca postar duas vezes a mesma matéria). */
export async function zerarFila(kind: "feed" | "story" = "feed"): Promise<number> {
  const r = await exec("DELETE FROM social_posts WHERE network = 'instagram' AND kind = ? AND status <> 'published' AND status <> 'sending'", [kind]);
  return r.affected;
}

/** Regenera na hora a arte (com as imagens próprias) sem mudar o estado. Item pulado por "sem capa" volta à fila. */
export async function gerarAgora(id: number): Promise<string> {
  const l = await carregar(id);
  if (!l) return "Item não encontrado.";
  if (l.status === "published" || l.status === "sending") return "Este item já foi ao ar ou está sendo enviado.";
  try {
    await gerar(l);
  } catch (err) {
    const msg = `não gerou a arte: ${String((err as Error)?.message ?? err).slice(0, 300)}`;
    await exec("UPDATE social_posts SET error = ? WHERE id = ?", [msg, id]);
    return msg;
  }
  const conta = await getConta();
  const novo = l.status === "skipped" ? (conta.test_mode ? "preview" : "pending") : l.status;
  await exec("UPDATE social_posts SET status = ?, error = NULL, attempts = 0 WHERE id = ?", [novo, id]);
  return "ok";
}

/** Imagens próprias do item de feed da matéria (a prévia e o Story usam). */
export async function overridesDoPost(postId: number): Promise<Overrides> {
  const [r] = await query<{ overrides: unknown }>("SELECT overrides FROM social_posts WHERE post_id = ? AND network = 'instagram' AND kind = 'feed'", [postId]);
  return lerOverrides(r?.overrides);
}

/**
 * Edita as imagens próprias de um item de feed (só enquanto não foi ao ar): `fn` mexe no objeto, o resultado é limpo e gravado.
 * Mexer no slide 1 (capa) invalida a arte do Story da mesma matéria. Devolve o resultado limpo.
 */
export async function editarOverrides(id: number, fn: (ov: Overrides, ctx: { maxExtras: number }) => void): Promise<Overrides> {
  const l = await carregar(id);
  if (!l || l.kind !== "feed") throw new Error("Item não encontrado.");
  if (l.status === "published" || l.status === "sending") throw new Error("Este item já foi ao ar: o Instagram não troca a imagem de um post publicado.");
  const e = await lerEntrada(l.post_id, payloadDe(l.payload));
  const pontos = l.model === "C-artigo" && e ? extrairPontos(e.corpo) : [];
  const { maxExtras } = await import("../core/overrides");
  const ov = lerOverrides(l.overrides, l.model, pontos);
  const antes = JSON.stringify(ov.trocas?.["1"] ?? null);
  fn(ov, { maxExtras: maxExtras(l.model, pontos.length) });
  const limpo = lerOverrides(ov, l.model, pontos);
  await exec("UPDATE social_posts SET overrides = ? WHERE id = ?", [Object.keys(limpo).length ? JSON.stringify(limpo) : null, id]);
  if (JSON.stringify(limpo.trocas?.["1"] ?? null) !== antes) {
    await exec("UPDATE social_posts SET images = NULL, rendered_at = NULL WHERE post_id = ? AND network = 'instagram' AND kind = 'story' AND status <> 'published' AND status <> 'sending'", [l.post_id]);
  }
  return limpo;
}

export const pular = (id: number) => exec("UPDATE social_posts SET status = 'skipped' WHERE id = ? AND status <> 'published'", [id]);
export const gerarDeNovo = (id: number) => exec("UPDATE social_posts SET images = NULL, caption = NULL, rendered_at = NULL, status = 'pending', error = NULL, attempts = 0 WHERE id = ? AND status <> 'published'", [id]);
export const repostar = (id: number) => exec("UPDATE social_posts SET status = 'pending', origin = 'manual', media_id = NULL, permalink = NULL, published_at = NULL, container_id = NULL, attempts = 0, error = NULL WHERE id = ? AND status = 'published'", [id]);

/**
 * Fila de um formato. Sem `secao`: as 30 matérias mais recentes (a vitrine do botão "últimas 30"). Com `secao` (noticias, artigos,
 * reviews, guias, promocoes): tudo o que está na fila daquela categoria, da mais nova para a mais antiga.
 */
export async function listarFila(limite = 30, kind: "feed" | "story" = "feed", secao?: string): Promise<LinhaFila[]> {
  if (secao) {
    return query<LinhaFila>(
      `SELECT s.*, p.title FROM social_posts s JOIN posts p ON p.id = s.post_id WHERE s.network = 'instagram' AND s.kind = ? AND s.status <> 'published' AND p.section = ? ORDER BY p.published_at DESC, p.id DESC LIMIT 100`,
      [kind, secao],
    );
  }
  if (kind === "story") {
    return query<LinhaFila>(`SELECT s.*, p.title FROM social_posts s JOIN posts p ON p.id = s.post_id WHERE s.network = 'instagram' AND s.kind = 'story' AND s.status <> 'published' ORDER BY s.created_at DESC, s.id DESC LIMIT ?`, [limite]);
  }
  return query<LinhaFila>(
    `SELECT s.*, p.title FROM social_posts s JOIN posts p ON p.id = s.post_id WHERE s.network = 'instagram' AND s.kind = 'feed' AND s.status <> 'published' AND s.post_id IN (${RECENTES}) ORDER BY p.published_at DESC, p.id DESC`,
    [limite],
  );
}

/** Quantos itens (ainda não postados) há na fila por categoria da matéria, para as abas do painel. */
export async function contagemPorSecao(kind: "feed" | "story" = "feed"): Promise<Record<string, number>> {
  const rows = await query<{ section: string; n: number }>(
    "SELECT p.section, COUNT(*) AS n FROM social_posts s JOIN posts p ON p.id = s.post_id WHERE s.network = 'instagram' AND s.kind = ? AND s.status <> 'published' AND s.status <> 'expired' GROUP BY p.section",
    [kind],
  );
  return Object.fromEntries(rows.map((r) => [r.section, Number(r.n)]));
}

/** Já postados no Instagram (lista à parte, mais discreta), do mais recente para o mais antigo. */
export async function listarPostados(limite = 50, kind: "feed" | "story" = "feed"): Promise<LinhaFila[]> {
  return query<LinhaFila>(
    `SELECT s.*, p.title FROM social_posts s JOIN posts p ON p.id = s.post_id WHERE s.network = 'instagram' AND s.kind = ? AND s.status = 'published' ORDER BY s.published_at DESC LIMIT ?`,
    [kind, limite],
  );
}

/** Tira da lista de postados (não apaga nada no Instagram; a matéria pode voltar à fila depois). */
export const tirarDosPostados = (id: number) => exec("DELETE FROM social_posts WHERE id = ? AND status = 'published'", [id]);

/** Story postado à mão (pelo app, com figurinha): marca como publicado para o robô não repetir. */
export const marcarPostadoAMao = (id: number) => exec("UPDATE social_posts SET status = 'published', origin = 'manual', published_at = UTC_TIMESTAMP(), locked_at = NULL, error = NULL WHERE id = ? AND status <> 'published'", [id]);

export async function resumo() {
  const [h] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM social_posts WHERE network = 'instagram' AND kind = 'feed' AND status = 'published' AND published_at >= ?", [inicioDoDia()]);
  const [p] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM social_posts WHERE network = 'instagram' AND kind = 'feed' AND status IN ('pending','preview','failed')");
  const [hs] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM social_posts WHERE network = 'instagram' AND kind = 'story' AND status = 'published' AND published_at >= ?", [inicioDoDia()]);
  const [ps] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM social_posts WHERE network = 'instagram' AND kind = 'story' AND status IN ('pending','preview','failed')");
  return { hoje: Number(h?.n ?? 0), naFila: Number(p?.n ?? 0), storiesHoje: Number(hs?.n ?? 0), storiesNaFila: Number(ps?.n ?? 0) };
}

export { imagensDe };
