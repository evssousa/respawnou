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
    description: "Nossas análises dos lançamentos, com nota, pontos fortes e pontos fracos.",
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
];

export const absoluteUrl = (path: string) => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
