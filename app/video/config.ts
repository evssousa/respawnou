// Configuração do módulo de vídeo. Textos e nomes do site vêm de app/marca.ts; aqui ficam as regras do núcleo. Parte pura (vale no navegador). Os valores editáveis pelo dono
// ficam em settings.video_config (config.server.ts).
import { MARCA } from "../marca";

export const VIDEO = {
  /** Gancho e fala de cada cena, em caracteres; 3 a 5 cenas; soma de palavras de gancho + cenas. */
  limites: { gancho: 90, cena: 170, cenas: [3, 5] as const, palavras: [60, 95] as const, tituloCurto: 60 },
  /**
   * Duração por tipo de matéria. Notícia e promoção: vídeo curto (30 a 60 s). Artigo, review e guia contam mais coisas e podem
   * passar de 60 s (até ~2 min). Narração a ~2,5 palavras/s: segundos ≈ palavras / 2,5 + 3 (abertura e fechamento).
   */
  perfis: {
    curto: { rotulo: "30 a 60 s", cenas: [3, 6] as const, palavras: [70, 140] as const, cena: 200, alvoPalavras: "entre 85 e 130" },
    longo: { rotulo: "60 a 120 s", cenas: [6, 12] as const, palavras: [145, 290] as const, cena: 220, alvoPalavras: "entre 170 e 270" },
  },
  /** Voz: pausa (s) antes de preço, nota e data para a pessoa acompanhar o número; 0 desliga. No máximo 4 por vídeo. */
  voz: { pausaAntesNumero: 0.25 },
  /** Frase fixa do fechamento (falada) e texto do botão do cartão final. */
  fechamento: MARCA.video.fechamento,
  fechamentoPergunta: MARCA.video.fechamentoPergunta,
  ctaCartao: MARCA.video.ctaCartao,
  /** Ordem de preferência na escolha automática do dia (modelo da matéria no feed). */
  ordemTipos: ["C-review", "P1", "S", "C-artigo", "N"] as const,
  /** Janela de matérias candidatas (horas) e mínimo de imagens utilizáveis. */
  janelaHoras: 36,
  minImagens: 2,
  /** Hashtags extras do TikTok e frase do YouTube. */
  hashtagTikTokExtra: MARCA.video.hashtagTikTokExtra,
  avisoVoz: MARCA.video.avisoVoz,
  /** Preço por 1.000 caracteres (US$) só para a estimativa do painel (Starter ≈ US$ 5 por 30 mil créditos). */
  usdPorMilCreditos: 0.1667,
  /** Padrões da configuração (o painel muda). */
  padrao: {
    enabled: false,
    perDay: 1,
    hour: 8,
    autoApprove: false,
    model: "eleven_multilingual_v2",
    speed: 0.95,
    creditsMonth: 30000,
    /** Uma voz por editoria (seção da matéria). Vazio = usa a voz padrão. */
    voiceDefault: "",
    voices: {} as Record<string, string>,
  },
};

export type VideoConfig = typeof VIDEO.padrao;

export type PerfilVideo = keyof typeof VIDEO.perfis;
/** Editorias com matéria longa ganham vídeo mais longo. */
export const perfilDaSecao = (secao: string): (typeof VIDEO.perfis)[PerfilVideo] & { id: PerfilVideo } => {
  const id: PerfilVideo = MARCA.secoes[secao]?.perfil ?? "curto";
  return { id, ...VIDEO.perfis[id] };
};

/** Seções (editorias) que podem ter voz própria. */
export const SECOES_VOZ: { id: string; rotulo: string }[] = Object.entries(MARCA.secoes).map(([id, s]) => ({ id, rotulo: s.nome }));

/** Voz da editoria da matéria (ou a padrão). */
export const vozDaSecao = (cfg: VideoConfig, secao: string) => cfg.voices[secao] || cfg.voiceDefault;
