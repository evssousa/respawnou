// Fila de posts sociais e o gatilho (docs/instagram.md). enfileirar() é rápido (não gera imagem); tick() decide e envia.
import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { mediaDir } from "../../../server-paths.mjs";
import { SOCIAL } from "../config";
import { horaBR, podeEnviar } from "../core/agenda";
import { montarLegenda } from "../core/legenda";
import { db, exec, hasDatabase, query } from "../db";
import { gerarSlides } from "../render/slides.server";
import { salvar } from "../render/render.server";
import { escolherModelo, lerEntrada, modeloAtivo, type DicaSocial } from "../site.server";
import type { Modelo } from "../tipos";
import { getConta, getToken, marcarTokenInvalido, pausar, renovarSePreciso, type Conta } from "./conta.server";
import { classificar, containerStatus, cota, publicar, ultimasMidias } from "./instagram.server";

export interface LinhaFila {
  id: number;
  post_id: number;
  model: Modelo;
  status: "pending" | "preview" | "sending" | "published" | "failed" | "skipped" | "expired";
  origin: "auto" | "manual";
  priority: number;
  payload: unknown;
  caption: string | null;
  images: unknown;
  container_id: string | null;
  media_id: string | null;
  permalink: string | null;
  error: string | null;
  attempts: number;
  next_try_at: string | null;
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

/** Põe a matéria publicada na fila. Rascunho não entra. Falha aqui nunca pode atrapalhar a publicação. */
export async function enfileirar(postId: number, dica?: DicaSocial, origem: "auto" | "manual" = "auto"): Promise<number | null> {
  if (!hasDatabase()) return null;
  try {
    const e = await lerEntrada(postId, dica);
    if (!e || !e.publicada) return null;
    const conta = await getConta();
    const modelo = escolherModelo(e);
    if (origem === "auto" && !modeloAtivo(modelo, conta.models)) return null;
    const cfg = SOCIAL.fila[modelo];
    const r = await exec(
      `INSERT IGNORE INTO social_posts (post_id, network, model, status, origin, priority, payload, expires_at)
       VALUES (?, 'instagram', ?, 'pending', ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR))`,
      [postId, modelo, origem, cfg.prioridade, dica ? JSON.stringify(dica) : null, cfg.validadeH],
    );
    return r.affected ? r.insertId : null;
  } catch (err) {
    console.error(`[social] enfileirar falhou (post ${postId}): ${String((err as Error)?.message ?? err).slice(0, 120)}`);
    return null;
  }
}

/** Gera imagens e legenda de uma linha (se ainda não há) e grava. Lança erro se faltar dado. */
async function gerar(l: LinhaFila): Promise<void> {
  const e = await lerEntrada(l.post_id, payloadDe(l.payload));
  if (!e) throw new Error("matéria não existe mais");
  const slides = await gerarSlides(l.model, e);
  if (slides.pontos) e.pontos = slides.pontos;
  const imgs: string[] = [];
  for (let i = 0; i < slides.jpegs.length; i++) imgs.push(await salvar(slides.jpegs[i], l.id, i + 1));
  await exec("UPDATE social_posts SET images = ?, caption = ?, rendered_at = UTC_TIMESTAMP(), error = NULL WHERE id = ?", [JSON.stringify(imgs), montarLegenda(e, l.model), l.id]);
}

async function carregar(id: number): Promise<LinhaFila | null> {
  const [l] = await query<LinhaFila>("SELECT * FROM social_posts WHERE id = ?", [id]);
  return l ?? null;
}

/** Envia uma linha já travada (status sending). Atualiza o estado conforme o resultado. */
async function enviar(l: LinhaFila, conta: Conta, token: string): Promise<void> {
  try {
    if (!imagensDe(l.images).length || !l.caption) {
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
    const r = await publicar({
      contaId: conta.account_id!,
      token,
      imagens: imgs,
      legenda: l.caption!,
      aoCriarContainer: async (id) => void (await exec("UPDATE social_posts SET container_id = ? WHERE id = ?", [id, l.id])),
    });
    await exec("UPDATE social_posts SET status = 'published', media_id = ?, permalink = ?, published_at = UTC_TIMESTAMP(), locked_at = NULL, error = NULL WHERE id = ?", [r.mediaId, r.link, l.id]);
  } catch (err) {
    const msg = String((err as Error)?.message ?? err).slice(0, 400);
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
    let publicada = false;
    if (l.container_id && token) {
      try {
        if ((await containerStatus(l.container_id, token)) === "PUBLISHED") {
          const m = (await ultimasMidias(token)).data.find((x) => (x.caption ?? "").slice(0, 40) === (l.caption ?? "").slice(0, 40));
          if (m) {
            await exec("UPDATE social_posts SET status = 'published', media_id = ?, permalink = ?, published_at = UTC_TIMESTAMP(), locked_at = NULL WHERE id = ?", [m.id, m.permalink ?? null, l.id]);
            publicada = true;
          }
        }
      } catch {
        /* tenta de novo no próximo tick */
      }
    }
    if (!publicada) await exec("UPDATE social_posts SET status = 'pending', locked_at = NULL WHERE id = ?", [l.id]);
  }
}

async function limparArquivos(): Promise<void> {
  const raiz = join(mediaDir(), "social");
  const limite = Date.now() - 30 * 86400_000;
  try {
    for (const ano of await readdir(raiz)) for (const mes of await readdir(join(raiz, ano))) for (const f of await readdir(join(raiz, ano, mes))) {
      const p = join(raiz, ano, mes, f);
      if ((await stat(p)).mtimeMs < limite) await rm(p, { force: true });
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
      }
      const conta = await getConta();
      if (!conta.enabled && !conta.test_mode) return { acao: "desligado" };

      if (conta.test_mode) {
        // Modo de teste: gera arte e legenda de até 2 pendentes e deixa como "preview" (não envia).
        const lista = await query<LinhaFila>("SELECT * FROM social_posts WHERE network = 'instagram' AND status = 'pending' ORDER BY priority DESC, created_at DESC LIMIT 2");
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

      const [pub] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM social_posts WHERE network = 'instagram' AND status = 'published' AND published_at >= ?", [inicioDoDia()]);
      const [ult] = await query<{ t: string | null }>("SELECT MAX(published_at) AS t FROM social_posts WHERE network = 'instagram' AND status = 'published'");
      const decisao = podeEnviar(
        { limiteDia: conta.daily_limit, intervaloMin: conta.min_gap_minutes, inicioHora: conta.start_hour, fimHora: conta.end_hour },
        { agora: new Date(), publicadosHoje: Number(pub?.n ?? 0), ultimoPublicado: ult?.t ? new Date(`${String(ult.t).replace(" ", "T")}Z`) : null, pausadoAte: conta.paused_until ? new Date(`${String(conta.paused_until).replace(" ", "T")}Z`) : null, tokenOk: conta.token_status === "ok" && !!token && !!conta.account_id },
      );
      if (!decisao.pode) return { acao: decisao.motivo };

      const [l] = await query<LinhaFila>(
        `SELECT * FROM social_posts WHERE network = 'instagram' AND (status = 'pending' OR (status = 'failed' AND attempts < 3 AND next_try_at <= UTC_TIMESTAMP()))
         ORDER BY priority DESC, created_at DESC LIMIT 1`,
      );
      if (!l) return { acao: "fila vazia" };
      const r = await exec("UPDATE social_posts SET status = 'sending', locked_at = UTC_TIMESTAMP() WHERE id = ? AND status IN ('pending','failed')", [l.id]);
      if (!r.affected) return { acao: "outra execução pegou" };
      await enviar(l, conta, token!);
      return { acao: "enviado", postId: l.post_id };
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
  const rows = await query<{ id: number }>(
    `SELECT p.id FROM posts p WHERE p.id IN (${RECENTES}) AND NOT EXISTS (SELECT 1 FROM social_posts s WHERE s.post_id = p.id AND s.network = 'instagram') ORDER BY p.published_at DESC`,
    [n],
  );
  let c = 0;
  for (const r of rows.reverse()) if (await enfileirar(r.id, undefined, "manual")) c++;
  return c;
}

/** Zera a fila: apaga tudo que ainda não foi ao ar (o que já foi publicado fica, para nunca postar duas vezes a mesma matéria). */
export async function zerarFila(): Promise<number> {
  const r = await exec("DELETE FROM social_posts WHERE network = 'instagram' AND status <> 'published' AND status <> 'sending'");
  return r.affected;
}

export const pular = (id: number) => exec("UPDATE social_posts SET status = 'skipped' WHERE id = ? AND status <> 'published'", [id]);
export const gerarDeNovo = (id: number) => exec("UPDATE social_posts SET images = NULL, caption = NULL, rendered_at = NULL, status = 'pending', error = NULL, attempts = 0 WHERE id = ? AND status <> 'published'", [id]);
export const repostar = (id: number) => exec("UPDATE social_posts SET status = 'pending', origin = 'manual', media_id = NULL, permalink = NULL, published_at = NULL, container_id = NULL, attempts = 0, error = NULL WHERE id = ? AND status = 'published'", [id]);

export async function listarFila(limite = 30): Promise<LinhaFila[]> {
  return query<LinhaFila>(
    `SELECT s.*, p.title FROM social_posts s JOIN posts p ON p.id = s.post_id WHERE s.network = 'instagram' AND s.post_id IN (${RECENTES}) ORDER BY p.published_at DESC, p.id DESC`,
    [limite],
  );
}

export async function resumo() {
  const [h] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM social_posts WHERE network = 'instagram' AND status = 'published' AND published_at >= ?", [inicioDoDia()]);
  const [p] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM social_posts WHERE network = 'instagram' AND status IN ('pending','preview','failed')");
  return { hoje: Number(h?.n ?? 0), naFila: Number(p?.n ?? 0) };
}

export { imagensDe };
