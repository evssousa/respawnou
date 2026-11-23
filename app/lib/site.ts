// Configuração central do site. Seções e plataformas alimentam rotas, menu e sitemap.

export const SITE = {
  name: "Respawnou",
  tagline: "Notícias de games todo dia",
  description:
    "Notícias, reviews, guias, lançamentos e promoções de games para PC, PlayStation, Xbox, Nintendo Switch e mobile. Todo dia, sem enrolação.",
  url: (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ?? "https://respawnou.com.br",
  locale: "pt_BR",
  email: "contato@respawnou.com.br",
} as const;

export type SectionSlug = "noticias" | "artigos" | "reviews" | "guias" | "promocoes";

export interface Section {
  slug: SectionSlug;
  label: string;
  /** Rótulo curto usado como "kicker" nos cards. */
  kicker: string;
  description: string;
}

export const SECTIONS: Section[] = [
  {
    slug: "noticias",
    label: "Notícias",
    kicker: "Notícias",
    description: "Tudo que acontece no mundo dos games: anúncios, trailers, atualizações e bastidores da indústria.",
  },
  {
    slug: "artigos",
    label: "Artigos",
    kicker: "Artigo",
    description: "Listas, especiais e análises aprofundadas para quem quer ir além da manchete.",
  },
  {
    slug: "reviews",
    label: "Reviews",
    kicker: "Review",
    description: "O que a crítica achou dos lançamentos: média das notas, pontos mais elogiados e mais criticados, com link para cada análise.",
  },
  {
    slug: "guias",
    label: "Guias",
    kicker: "Guia",
    description: "Dicas, tutoriais e guias para você jogar melhor e montar seu setup.",
  },
  {
    slug: "promocoes",
    label: "Promoções",
    kicker: "Promoção",
    description: "Descontos que valem a pena e jogos grátis por tempo limitado.",
  },
];

export const sectionBySlug = (slug: string) => SECTIONS.find((s) => s.slug === slug);

export type PlatformSlug = "pc" | "playstation" | "xbox" | "switch" | "mobile";

export interface Platform {
  slug: PlatformSlug;
  label: string;
  short: string;
}

export const PLATFORMS: Platform[] = [
  { slug: "pc", label: "PC", short: "PC" },
  { slug: "playstation", label: "PlayStation", short: "PS" },
  { slug: "xbox", label: "Xbox", short: "Xbox" },
  { slug: "switch", label: "Nintendo Switch", short: "Switch" },
  { slug: "mobile", label: "Mobile", short: "Mobile" },
];

export const platformBySlug = (slug: string) => PLATFORMS.find((p) => p.slug === slug);

export const NAV = [
  ...SECTIONS.map((s) => ({ to: `/${s.slug}`, label: s.label })),
  { to: "/lancamentos", label: "Lançamentos" },
  { to: "/arcade", label: "Arcade" },
];

export const absoluteUrl = (path: string) => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Páginas institucionais (não dependem do banco). Alimentam rodapé, sitemap,
 * mapa do site e a navegação lateral entre documentos.
 */
export interface DocPage {
  to: string;
  label: string;
  group: "site" | "legal";
  /** Data da última revisão do texto (AAAA-MM-DD). */
  updated: string;
}

export const DOC_PAGES: DocPage[] = [
  { to: "/sobre", label: "Sobre", group: "site", updated: "2026-11-14" },
  { to: "/contato", label: "Contato", group: "site", updated: "2026-11-10" },
  { to: "/faq", label: "Perguntas frequentes", group: "site", updated: "2026-11-14" },
  { to: "/politica-editorial", label: "Política editorial", group: "site", updated: "2026-11-22" },
  { to: "/redacao", label: "Redação", group: "site", updated: "2026-11-22" },
  { to: "/como-avaliamos", label: "Como avaliamos", group: "site", updated: "2026-11-11" },
  { to: "/anuncie", label: "Anuncie", group: "site", updated: "2026-11-10" },
  { to: "/termos", label: "Termos de uso", group: "legal", updated: "2026-11-11" },
  { to: "/privacidade", label: "Privacidade", group: "legal", updated: "2026-11-14" },
  { to: "/cookies", label: "Cookies", group: "legal", updated: "2026-11-14" },
  { to: "/acessibilidade", label: "Acessibilidade", group: "legal", updated: "2026-11-10" },
  { to: "/mapa-do-site", label: "Mapa do site", group: "legal", updated: "2026-11-10" },
];

/**
 * Autores da redação: um perfil por tipo de conteúdo (como no Anime Profile). Cada um tem página em /autores/<slug>.
 * Os textos são produzidos com apoio de IA e sempre conferidos pela redação (ver /redacao). O nome fica em posts.author
 * (migration 011). Perfil sem currículo ou história inventada: só o que a pessoa leitora precisa saber.
 */
export interface Author {
  slug: string;
  name: string;
  sections: SectionSlug[];
  /** Frase curta do perfil. */
  tagline: string;
  /** Descrição do que o autor cobre. */
  about: string;
  /** Assuntos favoritos (chips). */
  topics: string[];
  /** Frase de efeito do perfil. */
  quote: string;
}

export const AUTHORS: Author[] = [
  {
    slug: "nox",
    name: "Nox",
    sections: ["noticias"],
    tagline: "Radar ligado 24 horas nas notícias dos games.",
    about: "Nox acompanha anúncios, trailers, atualizações e bastidores da indústria a partir de canais oficiais e da imprensa especializada, e sempre linka a fonte original. Se aconteceu no mundo dos games, passou pelo radar do Nox.",
    topics: ["Anúncios", "Trailers", "Atualizações", "Indústria", "Esports"],
    quote: "Primeiro o fato, depois a opinião. E sem enrolação.",
  },
  {
    slug: "lume",
    name: "Lume",
    sections: ["artigos"],
    tagline: "Listas, resumos e dados que valem a leitura.",
    about: "Lume transforma dados em artigos: os lançamentos da semana, os jogos mais esperados de cada gênero, os que rodam em PC fraco e o resumo de domingo. Gosta de ranking bem explicado e de lista com critério claro.",
    topics: ["Listas", "Rankings", "Lançamentos da semana", "PC fraco", "Resumo da semana"],
    quote: "Lista boa mostra o critério. Ranking sem critério é só opinião.",
  },
  {
    slug: "vero",
    name: "Vero",
    sections: ["reviews"],
    tagline: "O que a crítica achou, em um lugar só.",
    about: "Vero reúne o consenso da crítica: calcula a média das notas publicadas pelos grandes veículos e resume o que foi mais elogiado e mais criticado, atribuindo cada opinião a quem a escreveu. Não dá nota própria: mostra o que a imprensa disse.",
    topics: ["Consenso da crítica", "Notas", "Elogios", "Críticas", "Lançamentos"],
    quote: "Quando todo mundo discorda, a média ainda conta uma história.",
  },
  {
    slug: "atlas",
    name: "Atlas",
    sections: ["guias"],
    tagline: "Seu mapa para jogar melhor.",
    about: "Atlas faz guias práticos: requisitos de PC com os números da loja, comparação entre o mínimo e o recomendado, e o que muda para quem joga no Brasil. Prefere dado confirmado a palpite de desempenho.",
    topics: ["Requisitos de PC", "Mínimo e recomendado", "Dicas", "PC gamer", "Preço em reais"],
    quote: "Antes de baixar, confira se o seu PC dá conta.",
  },
  {
    slug: "loot",
    name: "Loot",
    sections: ["promocoes"],
    tagline: "Caçador de jogo grátis e promoção de verdade.",
    about: "Loot acompanha jogos grátis e promoções com prazo, com o preço em reais conferido na loja e a data da conferência no texto. Só entra oferta que vale a pena de verdade.",
    topics: ["Jogos grátis", "Promoções", "Steam", "Epic Games", "Descontos"],
    quote: "Grátis acaba. Quem resgata a tempo, joga de graça para sempre.",
  },
];

export const authorByName = (name?: string | null) => AUTHORS.find((a) => a.name === name);
export const authorForSection = (section: string) => AUTHORS.find((a) => a.sections.includes(section as SectionSlug));

export const docPage = (to: string) => DOC_PAGES.find((d) => d.to === to);

/** Link "mailto" com assunto preenchido, para separar os pedidos na caixa de entrada. */
export const mailto = (subject: string) => `mailto:${SITE.email}?subject=${encodeURIComponent(`[${subject}] `)}`;
