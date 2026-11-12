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
  { to: "/sobre", label: "Sobre", group: "site", updated: "2026-11-10" },
  { to: "/contato", label: "Contato", group: "site", updated: "2026-11-10" },
  { to: "/faq", label: "Perguntas frequentes", group: "site", updated: "2026-11-10" },
  { to: "/politica-editorial", label: "Política editorial", group: "site", updated: "2026-11-10" },
  { to: "/como-avaliamos", label: "Como avaliamos", group: "site", updated: "2026-11-11" },
  { to: "/anuncie", label: "Anuncie", group: "site", updated: "2026-11-10" },
  { to: "/termos", label: "Termos de uso", group: "legal", updated: "2026-11-11" },
  { to: "/privacidade", label: "Privacidade", group: "legal", updated: "2026-11-11" },
  { to: "/cookies", label: "Cookies", group: "legal", updated: "2026-11-11" },
  { to: "/acessibilidade", label: "Acessibilidade", group: "legal", updated: "2026-11-10" },
  { to: "/mapa-do-site", label: "Mapa do site", group: "legal", updated: "2026-11-10" },
];

export const docPage = (to: string) => DOC_PAGES.find((d) => d.to === to);

/** Link "mailto" com assunto preenchido, para separar os pedidos na caixa de entrada. */
export const mailto = (subject: string) => `mailto:${SITE.email}?subject=${encodeURIComponent(`[${subject}] `)}`;
