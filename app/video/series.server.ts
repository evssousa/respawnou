// DO SITE (adaptar): dados das séries de vídeo (lê free_games, social_posts.payload e os pontos do artigo). Séries:
//  - gratis-semana: jogos grátis ativos (calendário, quinta depois das 14h);
//  - lancamentos-semana: a peça "lançamentos da semana" (calendário, segunda; o dono aprova pelo painel);
//  - review-60: review de crítica (formato automático);
//  - top5: artigo com 5 pontos (formato automático).
// Ao copiar o módulo para outro site, este arquivo pode começar devolvendo "nenhuma série".
import { MARCA } from "~/marca";
import { horaBR } from "~/social/core/agenda";
import { extrairPontos } from "~/social/core/pontos";
import { type DicaSocial, prazo } from "~/social/site.server";
import type { EntradaSocial } from "~/social/tipos";
import type { FatosVideo } from "./cartoes";
import type { VideoConfig } from "./config";
import { query } from "./db";
import type { Imagem, Roteiro } from "./roteiro";

export const SERIES = ["gratis-semana", "lancamentos-semana", "review-60", "top5"] as const;
export type Serie = (typeof SERIES)[number];
export const ehSerie = (s: string): s is Serie => (SERIES as readonly string[]).includes(s);
export const rotuloDaSerie = (s: string) => MARCA.video.series[s]?.rotulo ?? "";

/** A "dica" da matéria (lançamentos/ofertas da semana), guardada em social_posts.payload. Sem ela o modelo S nunca aparece no vídeo. */
export async function dicaDoPost(postId: number): Promise<DicaSocial | undefined> {
  const [r] = await query<{ payload: unknown }>("SELECT payload FROM social_posts WHERE post_id = ? AND network = 'instagram' AND kind = 'feed' LIMIT 1", [postId]);
  try {
    return (typeof r?.payload === "string" ? JSON.parse(r.payload) : r?.payload) as DicaSocial | undefined;
  } catch {
    return undefined;
  }
}

/** Formato automático pelo tipo da matéria: review → review-60; artigo com 5 pontos → top5; senão avulso (""). */
export function serieDoFormato(e: EntradaSocial, modelo: string, cfg: Pick<VideoConfig, "formatos">): string {
  if (modelo === "C-review" && e.review && cfg.formatos["review-60"]) return "review-60";
  if (modelo === "C-artigo" && cfg.formatos.top5 && extrairPontos(e.corpo).length >= 5) return "top5";
  return "";
}

const dinheiro = (t: string | null) => {
  const n = parseFloat((t ?? "").replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Jogos grátis ativos agora, do mais valioso para o menos (até 5). */
async function gratisAtivos(): Promise<NonNullable<FatosVideo["gratis"]>> {
  const rows = await query<{ name: string; store: string; worth: string | null; ends_at: string; image_url: string | null }>(
    "SELECT name, store, worth, ends_at, image_url FROM free_games WHERE ends_at > UTC_TIMESTAMP() AND post_id IS NOT NULL ORDER BY ends_at ASC LIMIT 20",
  );
  return rows
    .sort((a, b) => dinheiro(b.worth) - dinheiro(a.worth))
    .slice(0, 5)
    .map((g) => ({ nome: g.name, loja: g.store, ate: prazo(String(g.ends_at)), precoNormal: g.worth, arte: g.image_url }));
}

/**
 * Fatos extras e imagens da série (somam aos fatos da matéria). `null` = a série não tem dados suficientes (grátis com menos de 2
 * jogos, lançamentos sem a peça da semana, top 5 com menos de 5 pontos).
 */
export async function dadosDaSerie(serie: string, e: EntradaSocial): Promise<{ fatos: Partial<FatosVideo>; imagens: Imagem[] } | null> {
  if (serie === "gratis-semana") {
    const gratis = await gratisAtivos();
    if (gratis.length < 2) return null;
    return { fatos: { gratis }, imagens: gratis.filter((g) => g.arte).map((g) => ({ src: g.arte!, alt: `arte de ${g.nome}` })) };
  }
  if (serie === "lancamentos-semana") {
    const dias = (e.semana?.dias ?? []).filter((d) => d.jogos.length).slice(0, 6);
    if (!dias.length) return null;
    const imagens: Imagem[] = [];
    for (const d of dias) for (const j of d.jogos.slice(0, 1)) if (j.arte) imagens.push({ src: j.arte, alt: `arte de ${j.nome}` });
    return { fatos: { dias: dias.map((d) => ({ rotulo: d.rotulo, data: d.data, jogos: d.jogos.map((j) => j.nome) })) }, imagens };
  }
  if (serie === "top5") {
    const pontos = extrairPontos(e.corpo).slice(0, 5);
    if (pontos.length < 5) return null;
    const contagem = /melhor|melhores|top|ranking/i.test(e.titulo);
    // Contagem regressiva (#5 → #1, ordem inversa do texto) ou 01 → 05 na ordem do texto.
    const ordem = contagem ? [...pontos].reverse() : pontos;
    const ranking = ordem.map((p, i) => ({ titulo: p.titulo, posicao: contagem ? `#${5 - i}` : `0${i + 1}` }));
    return { fatos: { ranking }, imagens: ordem.filter((p) => p.imagem).map((p) => ({ src: p.imagem!, alt: `imagem de ${p.titulo}` })) };
  }
  return { fatos: {}, imagens: [] };
}

/**
 * Deixa o roteiro da série na forma fixa, sem depender do Gemini acertar: cada cena de lista (grátis, dia, ranking) recebe o
 * cartão e o item na ordem, e a imagem daquele item, se houver. Review em 60 s: cartão de nota na 1ª cena e de plataformas/preço na 4ª.
 */
export function normalizarSerie(r: Roteiro, serie: string, fatos: FatosVideo, imagens: Imagem[]): Roteiro {
  const cenas = r.cenas.map((c) => ({ ...c }));
  const imagemDe = (nome: string) => imagens.findIndex((x) => x.alt.toLowerCase().includes(nome.toLowerCase()));
  const lista: [tipo: "gratis" | "dia" | "ranking", nomes: string[]][] = [
    ["gratis", (fatos.gratis ?? []).map((g) => g.nome)],
    ["dia", (fatos.dias ?? []).map((d) => d.jogos[0] ?? "")],
    ["ranking", (fatos.ranking ?? []).map((x) => x.titulo)],
  ];
  const [tipo, nomes] = lista.find(([t]) => (serie === "gratis-semana" && t === "gratis") || (serie === "lancamentos-semana" && t === "dia") || (serie === "top5" && t === "ranking")) ?? ["gratis", []];
  if (nomes.length) {
    cenas.forEach((c, k) => {
      if (k >= nomes.length) return;
      c.cartao = tipo;
      c.item = k;
      const i = nomes[k] ? imagemDe(nomes[k]) : -1;
      if (i >= 0) c.imagem = i;
    });
  }
  if (serie === "review-60") {
    if (fatos.nota && cenas[0]) cenas[0].cartao = "nota";
    const ultimo = cenas[cenas.length - 1];
    if (ultimo) {
      if ((fatos.plataformas ?? []).length) ultimo.cartao = "plataformas";
      else if (fatos.preco) ultimo.cartao = "preco";
    }
  }
  const out: Roteiro = { ...r, cenas };
  const padrao = MARCA.video.series[serie]?.perguntaPadrao;
  if (padrao && !out.pergunta) {
    out.pergunta = padrao;
    out.usarPergunta = true;
  }
  return out;
}

/** Cartões de lista precisam do item certo: nomes da lista de DADOS e do roteiro, para o prompt. */
export const ehSerieDeLista = (serie: string) => serie === "gratis-semana" || serie === "lancamentos-semana" || serie === "top5";

// ───────────── Séries de calendário ─────────────

const diaDaSemana = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay();
};

/**
 * Hoje é o dia (e já passou da hora) de uma série de calendário ligada? Devolve a série e a matéria-âncora, ou null. Uma vez por
 * semana: se a série já nasceu nos últimos 5 dias, não repete.
 */
export async function serieDeCalendario(cfg: VideoConfig, agora = new Date()): Promise<{ serie: Serie; postId: number } | null> {
  const { hora, dia } = horaBR(agora);
  const dow = diaDaSemana(dia);
  for (const serie of ["gratis-semana", "lancamentos-semana"] as const) {
    const c = cfg.series[serie];
    if (!c?.ligado || c.dia !== dow || hora < c.hora) continue;
    const [recente] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM video_jobs WHERE serie = ? AND status <> 'descartado' AND created_at > UTC_TIMESTAMP() - INTERVAL 5 DAY", [serie]);
    if (Number(recente?.n ?? 0) > 0) continue;
    if (serie === "gratis-semana") {
      if ((await gratisAtivos()).length < 2) continue;
      const [a] = await query<{ post_id: number }>(
        `SELECT fg.post_id FROM free_games fg JOIN posts p ON p.id = fg.post_id WHERE fg.post_id IS NOT NULL AND p.status = 'published' AND p.published_at > UTC_TIMESTAMP() - INTERVAL 3 DAY
         ORDER BY p.published_at DESC LIMIT 1`,
      );
      if (a) return { serie, postId: a.post_id };
    } else {
      const [a] = await query<{ post_id: number }>(
        `SELECT s.post_id FROM social_posts s JOIN posts p ON p.id = s.post_id WHERE s.network = 'instagram' AND s.kind = 'feed' AND s.model = 'S' AND p.status = 'published'
           AND s.created_at > UTC_TIMESTAMP() - INTERVAL 4 DAY ORDER BY s.created_at DESC LIMIT 1`,
      );
      if (a) return { serie, postId: a.post_id };
    }
  }
  return null;
}

