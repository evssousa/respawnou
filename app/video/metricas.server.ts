// Coleta das estatísticas dos Reels publicados (Instagram) em marcos de 24 h, 72 h, 7 d e 30 d. Chamada no fim da coleta do robô;
// nunca derruba nada. Os números alimentam o painel /admin/videos e, mais tarde, o peso na escolha do vídeo do dia.
import { contagensMidia, insightsMidia, semPermissao } from "~/social/server/instagram.server";
import { getConta, getToken } from "~/social/server/conta.server";
import { exec, query } from "./db";
import { type LinhaMetrica, type Marco, marcoDevido, MARCOS, retencao } from "./metricas";

const AVISO_PERMISSAO = "O token do Instagram não tem permissão de estatísticas. Gere o token de novo marcando a permissão de insights e cole em /admin/instagram.";

async function setting(nome: string): Promise<string | null> {
  const [r] = await query<{ value: unknown }>("SELECT value FROM settings WHERE name = ?", [nome]);
  if (r?.value == null) return null;
  return typeof r.value === "string" ? r.value.replace(/^"|"$/g, "") : String(r.value);
}
const gravar = (nome: string, valor: string | null) =>
  valor == null ? exec("DELETE FROM settings WHERE name = ?", [nome]) : exec("INSERT INTO settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [nome, JSON.stringify(valor)]);

/** Mensagem de erro de permissão guardada (ou null), para o painel. */
export const avisoMetricas = () => setting("video_metrics_erro");

export async function coletarMetricas(): Promise<string> {
  try {
    const ultima = await setting("video_metrics_last");
    if (ultima && Date.now() - new Date(ultima).getTime() < 3 * 3600_000) return "recente";
    const conta = await getConta();
    const token = await getToken();
    if (!conta.hasToken || !token || conta.token_status !== "ok") return "sem Instagram";
    await gravar("video_metrics_last", new Date().toISOString());
    const jobs = await query<{ id: number; ig_media_id: string; horas: number }>(
      `SELECT id, ig_media_id, TIMESTAMPDIFF(MINUTE, ig_published_at, UTC_TIMESTAMP()) / 60 AS horas FROM video_jobs
       WHERE ig_status = 'publicado' AND ig_media_id IS NOT NULL AND ig_published_at > UTC_TIMESTAMP() - INTERVAL 41 DAY
         AND (metrics_checked_at IS NULL OR metrics_checked_at < UTC_TIMESTAMP() - INTERVAL 3 HOUR) ORDER BY ig_published_at LIMIT 8`,
    );
    let gravados = 0;
    for (const j of jobs) {
      const existentes = (await query<{ marco: Marco }>("SELECT marco FROM video_metrics WHERE job_id = ? AND network = 'instagram'", [j.id])).map((x) => x.marco).filter((m) => MARCOS.includes(m));
      const marco = marcoDevido(Number(j.horas), existentes);
      await exec("UPDATE video_jobs SET metrics_checked_at = UTC_TIMESTAMP() WHERE id = ?", [j.id]);
      if (!marco) continue;
      try {
        let m: Record<string, number> | null = null;
        let parcial: { likes: number | null; comments: number | null } | null = null;
        try {
          m = await insightsMidia(j.ig_media_id, token);
          await gravar("video_metrics_erro", null);
        } catch (e) {
          if (!semPermissao(e)) throw e;
          await gravar("video_metrics_erro", AVISO_PERMISSAO);
          parcial = await contagensMidia(j.ig_media_id, token);
        }
        await exec(
          `INSERT INTO video_metrics (job_id, network, marco, views, reach, likes, comments, shares, saves, interactions, avg_watch_ms, total_watch_ms, raw, collected_at)
           VALUES (?, 'instagram', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE collected_at = collected_at`,
          [
            j.id, marco, m?.views ?? null, m?.reach ?? null, m?.likes ?? parcial?.likes ?? null, m?.comments ?? parcial?.comments ?? null, m?.shares ?? null, m?.saved ?? null,
            m?.total_interactions ?? null, m?.ig_reels_avg_watch_time ?? null, m?.ig_reels_video_view_total_time ?? null, JSON.stringify(m ?? parcial ?? {}),
          ],
        );
        gravados++;
      } catch (e) {
        console.warn(`[video] métricas do job ${j.id} falharam:`, String((e as Error)?.message ?? e).slice(0, 160));
      }
    }
    return `${gravados} marco(s) gravado(s)`;
  } catch (e) {
    console.warn("[video] coleta de métricas falhou:", String((e as Error)?.message ?? e).slice(0, 160));
    return "erro";
  }
}

/** Métricas por vídeo (todas as linhas de cada um), para os chips da lista de publicados. */
export async function metricasDosJobs(ids: number[]): Promise<Record<number, LinhaMetrica[]>> {
  if (!ids.length) return {};
  const rows = await query<LinhaMetrica & { job_id: number }>("SELECT job_id, marco, views, reach, likes, comments, shares, saves, avg_watch_ms FROM video_metrics WHERE network = 'instagram' AND job_id IN (?)", [ids]);
  const out: Record<number, LinhaMetrica[]> = {};
  for (const r of rows) (out[r.job_id] ??= []).push(r);
  return out;
}

export interface Desempenho {
  medidos: number;
  viewsMedias72h: number | null;
  formatos: { formato: string; videos: number; views: number | null; retencao: number | null; interacoes: number | null }[];
}

const NOME_MODELO: Record<string, string> = { N: "Notícia", "C-review": "Review", "C-artigo": "Artigo", "C-guia": "Guia", P1: "Jogo grátis", P2: "Promoção", S: "Lançamentos" };
const NOME_SERIE: Record<string, string> = { gratis: "Jogos grátis da semana", lancamentos: "Lançamentos da semana", review60: "Review em 60 s", top5: "Top 5" };

/** Desempenho por formato (série, senão modelo da matéria), usando o marco de 72 h de cada vídeo dos últimos 60 dias. */
export async function desempenho(): Promise<Desempenho> {
  const rows = await query<{ serie: string; model: string | null; duration_s: number | null; views: number | null; likes: number | null; comments: number | null; avg_watch_ms: number | null }>(
    `SELECT j.serie, j.model, j.duration_s, m.views, m.likes, m.comments, m.avg_watch_ms FROM video_metrics m JOIN video_jobs j ON j.id = m.job_id
     WHERE m.network = 'instagram' AND m.marco = '72h' AND j.ig_published_at > UTC_TIMESTAMP() - INTERVAL 60 DAY`,
  );
  const por = new Map<string, typeof rows>();
  for (const r of rows) {
    const nome = r.serie ? (NOME_SERIE[r.serie] ?? r.serie) : (NOME_MODELO[r.model ?? ""] ?? "Outro");
    por.set(nome, [...(por.get(nome) ?? []), r]);
  }
  const media = (l: (number | null)[]) => {
    const v = l.filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const views = rows.map((r) => r.views);
  return {
    medidos: rows.length,
    viewsMedias72h: media(views) == null ? null : Math.round(media(views)!),
    formatos: [...por.entries()].map(([formato, l]) => ({
      formato,
      videos: l.length,
      views: media(l.map((r) => r.views)) == null ? null : Math.round(media(l.map((r) => r.views))!),
      retencao: media(l.map((r) => retencao(r.avg_watch_ms, r.duration_s))),
      interacoes: media(l.map((r) => (r.likes == null && r.comments == null ? null : (r.likes ?? 0) + (r.comments ?? 0)))),
    })).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)),
  };
}
