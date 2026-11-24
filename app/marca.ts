// MARCA: tudo o que muda de um site para outro, num arquivo só. Ao copiar os módulos social e vídeo para outro site, este é o
// arquivo que se edita (mais as pastas de fontes, o logo e o banco). `app/social/config.ts` e `app/video/config.ts` derivam daqui
// e mantêm os mesmos nomes exportados. Puro: sem node:*, sem banco (vale no navegador). Guia: docs/modulo-video.md.
import type { Modelo } from "./social/tipos";

export const MARCA = {
  site: "Respawnou",
  /** Logo em texto da arte: "RESPAWNOU" + ponto final colorido. */
  marca: "RESPAWNOU",
  /** @ da conta no Instagram (sem o @ na frente). */
  handle: "respawnou.com.br",
  dominio: "RESPAWNOU.COM.BR",
  baseUrl: "https://respawnou.com.br",
  /** Logo PNG quadrada, relativa à raiz do projeto. */
  logo: "public/logo-512.png",
  /** Entram no prompt do roteiro do vídeo. */
  descricao: "portal brasileiro de notícias de games",
  tom: "Tom de quem joga para quem joga.",
  cores: {
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
    ruim: "#ff5a3c",
    sobreDestaque: "#060807",
  },
  /**
   * Fontes da arte. O satori não lê WOFF2 nem fonte variável: arquivos WOFF/TTF estáticos em app/social/fonts.
   * `titulo`, `corpo` e `mono` são nomes de família.
   */
  fontes: {
    titulo: "Anton",
    corpo: "Inter",
    mono: "JetBrains Mono",
    arquivosSatori: [
      { name: "Anton", file: "anton-latin-400-normal.woff", weight: 400 },
      { name: "Inter", file: "inter-latin-400-normal.woff", weight: 400 },
      { name: "Inter", file: "inter-latin-600-normal.woff", weight: 600 },
      { name: "Inter", file: "inter-latin-800-normal.woff", weight: 800 },
      { name: "JetBrains Mono", file: "jetbrains-mono-latin-700-normal.woff", weight: 700 },
    ] as { name: string; file: string; weight: 400 | 600 | 700 | 800 }[],
    /** Fonte da legenda do vídeo (o libass precisa de TTF). */
    legenda: { familia: "Anton", ttf: "app/video/fonts/Anton-Regular.ttf" },
  },
  /** Título: caixa alta, largura média de cada letra (em × tamanho; Anton ≈ 0,5, Sora ≈ 0,62) e tamanhos tentados. */
  titulo: { maiusculo: true, largura: 0.5, tamanhos: [96, 84, 72, 64] },
  /** Editorias: id → rótulo na arte, nome no painel e perfil de duração do vídeo. */
  secoes: {
    noticias: { rotulo: "NOTÍCIAS", nome: "Notícias", perfil: "curto" },
    artigos: { rotulo: "ARTIGO", nome: "Artigos", perfil: "longo" },
    reviews: { rotulo: "REVIEW", nome: "Reviews", perfil: "longo" },
    guias: { rotulo: "GUIA", nome: "Guias", perfil: "longo" },
    promocoes: { rotulo: "PROMOÇÃO", nome: "Promoções", perfil: "curto" },
  } as Record<string, { rotulo: string; nome: string; perfil: "curto" | "longo" }>,

  /** Textos e regras do módulo social (Instagram). */
  social: {
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
      N: { prioridade: 10, validadeH: 48 },
    } as Record<Modelo, { prioridade: number; validadeH: number }>,
    /** Stories: padrões, fila e texto do botão por modelo do feed. */
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
    /** Parâmetros de rastreio dos links. */
    utm: "utm_source=instagram&utm_medium=social",
  },

  /** Textos e nomes do módulo de vídeo. */
  video: {
    /** Frase fixa do fechamento (falada) e texto do botão do cartão final. */
    fechamento: "Matéria completa no Respawnou. O link está no perfil.",
    /** Fechamento quando há pergunta: a pergunta vem antes (falada e no cartão). */
    fechamentoPergunta: "Responde aí nos comentários. Matéria completa no link do perfil.",
    ctaCartao: "MATÉRIA COMPLETA: LINK NO PERFIL",
    /** Hashtag extra do TikTok e frase de aviso de voz sintética. */
    hashtagTikTokExtra: "gamesbr",
    avisoVoz: "Narração gerada por voz sintética.",
    userAgent: "respawnou-video",
    /** Séries de vídeo: rótulo na tela (chip da abertura e da moldura), estilo da trilha e pergunta padrão do fechamento. */
    series: {
      "gratis-semana": { rotulo: "GRÁTIS DA SEMANA", nome: "Jogos grátis da semana", trilha: "energia" },
      "lancamentos-semana": { rotulo: "LANÇAMENTOS DA SEMANA", nome: "Lançamentos da semana", trilha: "aventura" },
      "review-60": { rotulo: "REVIEW EM 60 S", nome: "Review em 60 s", trilha: "tensao" },
      top5: { rotulo: "TOP 5", nome: "Top 5", trilha: "energia", perguntaPadrao: "Qual seria o seu número 1?" },
    } as Record<string, { rotulo: string; nome: string; trilha: string; perguntaPadrao?: string }>,
    /** Como a voz deve falar siglas e nomes (vale para todo vídeo; o dono acrescenta/troca no painel). Não muda a legenda. */
    pronunciaBase: [
      { de: "PS5", para: "pê ésse cinco" },
      { de: "PS4", para: "pê ésse quatro" },
      { de: "PC", para: "pê cê" },
      { de: "DLC", para: "dê éle cê" },
      { de: "RPG", para: "érre pê gê" },
      { de: "FPS", para: "éfe pê ésse" },
      { de: "MMO", para: "ême ême ó" },
      { de: "GTA", para: "gê tê á" },
      { de: "Xbox", para: "équis box" },
      { de: "4K", para: "quatro ká" },
      { de: "VR", para: "vê érre" },
      { de: "IA", para: "i á" },
      { de: "NPC", para: "éne pê cê" },
      { de: "HD", para: "agá dê" },
      { de: "RTX", para: "érre tê équis" },
      { de: "GPU", para: "gê pê u" },
      { de: "CPU", para: "cê pê u" },
      { de: "SSD", para: "ésse ésse dê" },
      { de: "Switch 2", para: "Switch dois" },
    ] as { de: string; para: string }[],
    /** Pastas na casa do servidor (fora do app e fora de /media). */
    pastaBin: "respawnou-bin",
    pastaTrabalho: "respawnou-trabalho",
  },
};
