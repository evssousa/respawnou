// Configuração do módulo social ESPECÍFICA DO SITE (respawnou). Ao copiar o módulo, mude este arquivo, `db.ts`,
// `site.server.ts`, `fonts/` (se mudar a identidade) e `ui/social.css`. Dados puros: nada de banco aqui.
import type { Modelo } from "./tipos";

export const SOCIAL = {
  site: "Respawnou",
  /** Logo em texto da arte: "RESPAWNOU" + ponto final colorido. */
  marca: "RESPAWNOU",
  /** @ da conta no Instagram (sem o @ na frente). */
  handle: "respawnou.com.br",
  dominio: "RESPAWNOU.COM.BR",
  baseUrl: "https://respawnou.com.br",
  /** Logo PNG quadrada, relativa à raiz do projeto. */
  logo: "public/logo-512.png",
  frases: {
    /** Linha embaixo do "SIGA" no rodapé da notícia. */
    rodape: "Mais notícias de games todo dia",
    /** CTA da legenda (sempre "link na bio": no Instagram o link da legenda não é clicável). */
    legenda: "Matéria completa no link da bio. Siga @respawnou.com.br pra não perder nenhuma.",
    ctaFinal: "Notícias, reviews, guias e lançamentos todo dia.",
    botaoFinal: "MATÉRIA COMPLETA: LINK NA BIO",
  },
  /** Perguntas de engajamento (uma por matéria, escolhida pelo id, sem sorteio). */
  perguntas: {
    noticia: ["Vai jogar?", "O que achou?", "Você estava esperando por isso?", "O que mais chamou sua atenção?"],
    artigo: ["Qual desses você mais quer jogar?", "Faltou algum na lista?", "Qual seria o seu primeiro?"],
    semana: ["Qual você vai jogar primeiro?", "Algum desses está na sua lista?"],
  },
  /** Hashtag-base por tipo (máximo de 3 hashtags no total). */
  hashtagsBase: { noticia: "games", promo: "jogosgratis", semana: "lancamentosdejogos", review: "games", guia: "pcgamer", artigo: "games" } as Record<string, string>,
  hashtagsPlataforma: { pc: "PCGamer", playstation: "PS5", xbox: "Xbox", switch: "NintendoSwitch", mobile: "JogosMobile" } as Record<string, string>,
  /** Rótulo de plataforma curto no chip da arte. */
  plataformaCurta: { pc: "PC", playstation: "PS", xbox: "XBOX", switch: "SWITCH", mobile: "MOBILE" } as Record<string, string>,
  rotuloSecao: { noticias: "NOTÍCIAS", artigos: "ARTIGO", reviews: "REVIEW", guias: "GUIA", promocoes: "PROMOÇÃO" } as Record<string, string>,
  /** Padrões da conta (o painel pode mudar). */
  limites: { limiteDia: 4, intervaloMin: 90, inicioHora: 9, fimHora: 22 },
  /** Modelos ligados por padrão. */
  modelosLigados: { N: true, C: true, P: true, S: true } as Record<string, boolean>,
  /** Prioridade na fila e validade em horas, por modelo. */
  fila: {
    S: { prioridade: 40, validadeH: 48 },
    P1: { prioridade: 50, validadeH: 48 },
    P2: { prioridade: 35, validadeH: 48 },
    "C-review": { prioridade: 30, validadeH: 48 },
    "C-guia": { prioridade: 20, validadeH: 48 },
    "C-artigo": { prioridade: 20, validadeH: 48 },
    N: { prioridade: 10, validadeH: 12 },
  } as Record<Modelo, { prioridade: number; validadeH: number }>,
  /** Stories (docs/instagram-stories-videos.md): padrões, fila e texto do botão por modelo do feed. */
  story: {
    padrao: { ligado: false, limiteDia: 6, intervaloMin: 45 },
    noFeed: "NOVO NO FEED",
    apontar: "TOQUE NO @ LÁ EM CIMA",
    cta: {
      N: "MATÉRIA COMPLETA: LINK NA BIO",
      "C-artigo": "LISTA COMPLETA: LINK NA BIO",
      "C-review": "TODAS AS NOTAS: LINK NA BIO",
      "C-guia": "REQUISITOS COMPLETOS: LINK NA BIO",
      P1: "COMO RESGATAR: LINK NA BIO",
      P2: "TODAS AS OFERTAS: LINK NA BIO",
      S: "CALENDÁRIO COMPLETO: LINK NA BIO",
    } as Record<Modelo, string>,
    fila: {
      P1: { prioridade: 50, validadeH: 24 },
      S: { prioridade: 40, validadeH: 24 },
      P2: { prioridade: 35, validadeH: 24 },
      "C-review": { prioridade: 30, validadeH: 24 },
      "C-guia": { prioridade: 20, validadeH: 24 },
      "C-artigo": { prioridade: 20, validadeH: 24 },
      N: { prioridade: 10, validadeH: 6 },
    } as Record<Modelo, { prioridade: number; validadeH: number }>,
  },
  /** Tipos de post com hashtag de loja (promoções). */
  utm: "utm_source=instagram&utm_medium=social",
};

/**
 * Fontes da arte. O satori não lê WOFF2 nem fonte variável: arquivos WOFF/TTF estáticos em app/social/fonts.
 * `titulo`, `corpo` e `mono` são nomes de família; cada arquivo pode se registrar com o nome que quiser
 * (ex.: o peso ExtraBold de uma fonte pode entrar como família "Titulo" no peso 400).
 */
export const FONTES = { titulo: "Anton", corpo: "Inter", mono: "JetBrains Mono" };
export const FONTES_ARQUIVOS: { name: string; file: string; weight: 400 | 600 | 700 | 800 }[] = [
  { name: "Anton", file: "anton-latin-400-normal.woff", weight: 400 },
  { name: "Inter", file: "inter-latin-400-normal.woff", weight: 400 },
  { name: "Inter", file: "inter-latin-600-normal.woff", weight: 600 },
  { name: "Inter", file: "inter-latin-800-normal.woff", weight: 800 },
  { name: "JetBrains Mono", file: "jetbrains-mono-latin-700-normal.woff", weight: 700 },
];
/** Título: caixa alta, largura média de cada letra (em × tamanho; Anton ≈ 0,5, Sora ≈ 0,62) e tamanhos tentados. */
export const TITULO = { maiusculo: true, largura: 0.5, tamanhos: [96, 84, 72, 64] };

/** Cores da arte (iguais a app/app.css; o site só tem tema escuro). */
export const COR = {
  fundo: "#060807",
  painel: "#0c110c",
  painel2: "#111611",
  linha: "#1c241a",
  linhaSuave: "#243022",
  texto: "#eef3ea",
  corpo: "#b4bfb0",
  apagado: "#8a9787",
  destaque: "#c8ff2e",
  destaqueFundo: "#3d5200",
  alerta: "#ffb020",
  sobreDestaque: "#060807",
};
