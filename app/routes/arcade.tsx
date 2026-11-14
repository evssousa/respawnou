import { useSearchParams } from "react-router";
import { ArcadeCard, useArcadeRecords } from "~/components/ArcadeCard";
import { FilterLink, SectionTitle } from "~/components/ui";
import { ARCADE_CATEGORIES, ARCADE_GAMES, type ArcadeCategory } from "~/lib/arcade";
import { seo } from "~/lib/seo";
import { SITE } from "~/lib/site";

export const meta = () =>
  seo({
    title: "Arcade: jogos grátis para jogar no navegador",
    description: `Jogos de passatempo do ${SITE.name} para jogar grátis no navegador, no PC ou no celular, sem baixar nada: corredor infinito, nave, cobrinha, campo minado, paciência, jogo da memória e mais.`,
    path: "/arcade",
  });

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

      <p className="font-mono text-xs text-muted">&gt; NOVOS JOGOS CHEGAM AOS POUCOS. TODOS SÃO CRIAÇÕES DO {SITE.name.toUpperCase()}.</p>
    </main>
  );
}
