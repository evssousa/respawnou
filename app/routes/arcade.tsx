import { useSearchParams } from "react-router";
import { ArcadeCard, useArcadeRecords } from "~/components/ArcadeCard";
import { FilterLink, SectionTitle } from "~/components/ui";
import { ARCADE_CATEGORIES, ARCADE_GAMES, type ArcadeCategory } from "~/lib/arcade";
import { seo } from "~/lib/seo";
import { absoluteUrl, SITE } from "~/lib/site";

// Nome de busca de cada jogo para o ItemList (mesmo termo do shareName, sem depender do arquivo só de servidor).
const ARCADE_SEO_NAMES: Record<string, string> = Object.fromEntries(ARCADE_GAMES.map((g) => [g.slug, g.shareName]));

export const meta = () => [
  ...seo({
    title: "Jogos online grátis: sudoku, paciência e mais",
    description: `Jogos online grátis do ${SITE.name}, direto no navegador e sem cadastro: sudoku, paciência, campo minado, jogo da memória, caça-palavras, pinball e mais.`,
    path: "/arcade",
  }),
  {
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Arcade do Respawnou",
      itemListElement: ARCADE_GAMES.map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/arcade/${g.slug}`),
        name: ARCADE_SEO_NAMES[g.slug] ?? g.name,
      })),
    },
  },
];

export default function ArcadePage() {
  const best = useArcadeRecords(ARCADE_GAMES);
  // Filtro por categoria (?categoria=); o canonical continua /arcade.
  const cat = useSearchParams()[0].get("categoria") as ArcadeCategory | null;
  const active = cat && cat in ARCADE_CATEGORIES ? cat : null;
  const games = active ? ARCADE_GAMES.filter((g) => g.category === active) : ARCADE_GAMES;

  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 pt-10 sm:px-6">
      <div className="flex flex-col gap-4">
        <SectionTitle as="h1" size="xl" code="MÓDULO // PASSATEMPO" accent="Respawnou">
          Arcade
        </SectionTitle>
        <p className="max-w-2xl text-lg text-body">
          Jogos rápidos e sem fim para passar o tempo, direto no navegador. Sem baixar nada, sem cadastro, no PC ou no celular. Seu recorde fica salvo neste aparelho.
        </p>
        <nav aria-label="Filtrar por categoria" className="flex flex-wrap gap-2">
          <FilterLink to="/arcade" active={!active}>
            TODOS
          </FilterLink>
          {(Object.keys(ARCADE_CATEGORIES) as ArcadeCategory[]).map((k) => (
            <FilterLink key={k} to={`/arcade?categoria=${k}`} active={active === k}>
              {ARCADE_CATEGORIES[k].toUpperCase()}
            </FilterLink>
          ))}
        </nav>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <li key={g.slug}>
            <ArcadeCard game={g} best={best[g.slug]} />
          </li>
        ))}
      </ul>

      <p className="max-w-2xl text-body">
        Todos os jogos do Arcade são criações do {SITE.name}: rodam direto no navegador, sem baixar nada e sem cadastro, no PC, no celular ou no tablet. Os recordes ficam salvos só no seu aparelho. Tem jogo de lógica, como sudoku, paciência, campo minado, jogo da memória e caça-palavras, e jogo de reflexo e ação, como pinball, corredor infinito, nave e quebrar blocos.
      </p>

      <p className="font-mono text-xs text-muted">&gt; NOVOS JOGOS CHEGAM AOS POUCOS. TODOS SÃO CRIAÇÕES DO {SITE.name.toUpperCase()}.</p>
    </main>
  );
}
