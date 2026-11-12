import { data, Link } from "react-router";
import type { Route } from "./+types/arcade-game";
import { ArcadeShell } from "~/components/ArcadeShell";
import { ArcadeThumb } from "~/components/ArcadeThumb";
import { ARCADE_CATEGORIES, ARCADE_GAMES, arcadeGame } from "~/lib/arcade";
import { seo } from "~/lib/seo";
import { absoluteUrl, SITE } from "~/lib/site";

export function loader({ params }: Route.LoaderArgs) {
  const game = arcadeGame(params.slug);
  if (!game) throw data("Jogo não encontrado", { status: 404 });
  return { game };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { game } = loaderData;
  return [
    ...seo({ title: `${game.name}: jogo grátis online`, description: game.description, path: `/arcade/${game.slug}` }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: game.name,
        description: game.description,
        url: absoluteUrl(`/arcade/${game.slug}`),
        genre: ARCADE_CATEGORIES[game.category],
        gamePlatform: ["Navegador", "PC", "Celular"],
        applicationCategory: "Game",
        operatingSystem: "Qualquer (navegador)",
        isAccessibleForFree: true,
        inLanguage: "pt-BR",
        publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
      },
    },
  ];
}

export default function ArcadeGamePage({ loaderData }: Route.ComponentProps) {
  const { game } = loaderData;
  const others = ARCADE_GAMES.filter((g) => g.slug !== game.slug);
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 pt-6 sm:px-6">
      <div className="flex flex-col gap-2">
        <nav aria-label="Trilha" className="font-mono text-xs font-semibold text-muted">
          <Link to="/arcade" className="hover:text-acc">
            ARCADE
          </Link>{" "}
          / <span className="text-acc">{ARCADE_CATEGORIES[game.category].toUpperCase()}</span>
        </nav>
        <h1 className="font-display text-5xl uppercase leading-none sm:text-6xl">{game.name}</h1>
        <p className="text-lg text-body">{game.tagline}</p>
      </div>

      <ArcadeShell key={game.slug} game={game} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="como-jogar" className="ch flex flex-col gap-3 bg-ink-2 p-5 sm:p-6">
          <h2 id="como-jogar" className="font-display text-3xl uppercase leading-none">
            Como <span className="text-acc">jogar</span>
          </h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-body marker:text-acc">
            {game.howTo.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="controles" className="ch flex flex-col gap-3 bg-ink-2 p-5 sm:p-6">
          <h2 id="controles" className="font-display text-3xl uppercase leading-none">
            Con<span className="text-acc">troles</span>
          </h2>
          <dl className="flex flex-col gap-3">
            {game.controls.map((c) => (
              <div key={c.device}>
                <dt className="font-mono text-xs font-bold uppercase text-acc">{c.device}</dt>
                <dd className="text-body">{c.text}</dd>
              </div>
            ))}
            <div>
              <dt className="font-mono text-xs font-bold uppercase text-acc">Pausar</dt>
              <dd className="text-body">P ou Esc. O jogo também pausa sozinho se você trocar de aba.</dd>
            </div>
          </dl>
          <p className="mt-auto pt-2 text-sm text-muted">Seu recorde fica salvo só neste navegador. Nada é enviado para o servidor.</p>
        </section>
      </div>

      {others.length > 0 && (
        <section aria-labelledby="mais-jogos" className="flex flex-col gap-4">
          <h2 id="mais-jogos" className="font-display text-4xl uppercase leading-none">
            Mais <span className="text-acc">jogos</span>
          </h2>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {others.map((g) => (
              <li key={g.slug}>
                <Link to={`/arcade/${g.slug}`} className="group chs flex h-full flex-col bg-ink-2 hover:bg-ink-3">
                  <ArcadeThumb slug={g.slug} className="block aspect-video w-full" />
                  <span className="p-3 font-display text-2xl uppercase leading-none group-hover:text-acc">{g.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
