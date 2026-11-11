// O que tem conteúdo publicado: editorias, plataformas e calendário de lançamentos.
// Página vazia não aparece em menu, rodapé, home nem sitemap, e leva noindex (o AdSense
// reprova sites com páginas "em construção"). Calculado em content.server.ts (getAvailability)
// e entregue pelo loader da raiz.
import { useRouteLoaderData } from "react-router";
import { PLATFORMS, SECTIONS, type PlatformSlug, type SectionSlug } from "./site";

export interface Availability {
  sections: SectionSlug[];
  platforms: PlatformSlug[];
  releases: boolean;
}

/** Sem dados (ex.: página de erro): mostra tudo, como antes. */
export const ALL_AVAILABLE: Availability = {
  sections: SECTIONS.map((s) => s.slug),
  platforms: PLATFORMS.map((p) => p.slug),
  releases: true,
};

export function useAvailability(): Availability {
  const data = useRouteLoaderData("root") as { available?: Availability } | undefined;
  return data?.available ?? ALL_AVAILABLE;
}

export const navFor = (a: Availability) => [
  ...SECTIONS.filter((s) => a.sections.includes(s.slug)).map((s) => ({ to: `/${s.slug}`, label: s.label })),
  ...(a.releases ? [{ to: "/lancamentos", label: "Lançamentos" }] : []),
];

export const platformsFor = (a: Availability) => PLATFORMS.filter((p) => a.platforms.includes(p.slug));
