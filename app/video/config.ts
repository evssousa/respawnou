// Configuração do módulo de vídeo ESPECÍFICA DO SITE (respawnou). Parte pura (vale no navegador). Os valores editáveis pelo dono
// ficam em settings.video_config (config.server.ts).
export const VIDEO = {
  /** Gancho e fala de cada cena, em caracteres; 3 a 5 cenas; soma de palavras de gancho + cenas. */
  limites: { gancho: 90, cena: 170, cenas: [3, 5] as const, palavras: [60, 95] as const, tituloCurto: 60 },
  /** Frase fixa do fechamento (falada) e texto do botão do cartão final. */
  fechamento: "Matéria completa no Respawnou. O link está no perfil.",
  ctaCartao: "MATÉRIA COMPLETA: LINK NO PERFIL",
  /** Ordem de preferência na escolha automática do dia (modelo da matéria no feed). */
  ordemTipos: ["C-review", "P1", "S", "C-artigo", "N"] as const,
  /** Janela de matérias candidatas (horas) e mínimo de imagens utilizáveis. */
  janelaHoras: 36,
  minImagens: 2,
  /** Hashtags extras do TikTok e frase do YouTube. */
  hashtagTikTokExtra: "gamesbr",
  avisoVoz: "Narração gerada por voz sintética.",
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

/** Seções (editorias) que podem ter voz própria. */
export const SECOES_VOZ: { id: string; rotulo: string }[] = [
  { id: "noticias", rotulo: "Notícias" },
  { id: "artigos", rotulo: "Artigos" },
  { id: "reviews", rotulo: "Reviews" },
  { id: "guias", rotulo: "Guias" },
  { id: "promocoes", rotulo: "Promoções" },
];

/** Voz da editoria da matéria (ou a padrão). */
export const vozDaSecao = (cfg: VideoConfig, secao: string) => cfg.voices[secao] || cfg.voiceDefault;
