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
 * Autores de IA da redação: um por tipo de conteúdo (como no Anime Profile). A página /redacao explica que são autores
 * de IA, revisados por pessoa; nada de currículo ou história inventada. O nome fica em posts.author (migration 011).
 */
export interface Author {
  slug: string;
  name: string;
  sections: SectionSlug[];
  bio: string;
}

export const AUTHORS: Author[] = [
  { slug: "nox", name: "Nox", sections: ["noticias"], bio: "Acompanha anúncios, atualizações e bastidores da indústria a partir de canais oficiais e da imprensa especializada, e sempre linka a fonte original." },
  { slug: "lume", name: "Lume", sections: ["artigos"], bio: "Escreve artigos, listas e resumos feitos a partir de dados: lançamentos da semana, jogos de um gênero, jogos que rodam em PC fraco e o resumo de domingo." },
  { slug: "vero", name: "Vero", sections: ["reviews"], bio: "Reúne o consenso da crítica: calcula a média das notas publicadas pelos veículos e resume o que foi mais elogiado e mais criticado, atribuindo cada opinião a quem a escreveu." },
  { slug: "atlas", name: "Atlas", sections: ["guias"], bio: "Faz guias práticos, como requisitos de PC, com os números da loja e comparação entre o mínimo e o recomendado, sem inventar desempenho." },
  { slug: "loot", name: "Loot", sections: ["promocoes"], bio: "Acompanha jogos grátis e promoções com prazo, com preço em reais conferido na loja e a data da conferência no texto." },
];

export const authorByName = (name?: string | null) => AUTHORS.find((a) => a.name === name);
export const authorForSection = (section: string) => AUTHORS.find((a) => a.sections.includes(section as SectionSlug));

export const docPage = (to: string) => DOC_PAGES.find((d) => d.to === to);

/** Link "mailto" com assunto preenchido, para separar os pedidos na caixa de entrada. */
export const mailto = (subject: string) => `mailto:${SITE.email}?subject=${encodeURIComponent(`[${subject}] `)}`;
