import { data, Link } from "react-router";
import type { Route } from "./+types/arcade-game";
import { ArcadeShell } from "~/components/ArcadeShell";
import { ArcadeThumb } from "~/components/ArcadeThumb";
import { BodyBlock } from "~/components/BodyBlock";
import { ARCADE_CATEGORIES, ARCADE_GAMES, arcadeGame } from "~/lib/arcade";
import { ARCADE_SEO } from "~/lib/arcade-seo.server";
import { seo } from "~/lib/seo";
import { absoluteUrl, SITE } from "~/lib/site";

export function loader({ params }: Route.LoaderArgs) {
  const game = arcadeGame(params.slug);
  if (!game) throw data("Jogo não encontrado", { status: 404 });
  return { game, seo: ARCADE_SEO[game.slug] };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { game, seo: s } = loaderData;
  const url = absoluteUrl(`/arcade/${game.slug}`);
  const image = absoluteUrl(`/og/arcade/${game.slug}.png`);
  return [
    ...seo({ title: s.title, description: s.description, path: `/arcade/${game.slug}`, image }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": ["VideoGame", "WebApplication"],
            name: game.name,
            description: s.description,
            url,
            image,
            genre: ARCADE_CATEGORIES[game.category],
            gamePlatform: ["Navegador", "PC", "Celular"],
            applicationCategory: "GameApplication",
            operatingSystem: "Qualquer (navegador)",
            browserRequirements: "Requer JavaScript e HTML5",
            playMode: "SinglePlayer",
            numberOfPlayers: 1,
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
            inLanguage: "pt-BR",
            dateModified: game.updated,
            publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: SITE.url },
              { "@type": "ListItem", position: 2, name: "Arcade", item: absoluteUrl("/arcade") },
              { "@type": "ListItem", position: 3, name: game.name, item: url },
            ],
          },
        ],
      },
    },
  ];
}

export default function ArcadeGamePage({ loaderData }: Route.ComponentProps) {
  const { game, seo: s } = loaderData;
  // Jogos parecidos escolhidos à mão (campo related do catálogo).
  const similar = game.related.map((slug) => ARCADE_GAMES.find((g) => g.slug === slug)).filter((g) => !!g);
  const updated = game.updated.split("-").reverse().join("/");
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 pt-6 sm:px-6">
      <div className="flex flex-col gap-2">
        <nav aria-label="Trilha" className="font-mono text-xs font-semibold text-muted">
          <Link to="/arcade" className="hover:text-acc">
            ARCADE
          </Link>{" "}
          / <span className="text-acc">{ARCADE_CATEGORIES[game.category].toUpperCase()}</span>
        </nav>
        <h1 className="flex flex-col gap-2">
          <span className="font-display text-5xl uppercase leading-none sm:text-6xl">{game.name}</span>
          <span className="font-mono text-xs font-bold uppercase tracking-wide text-acc sm:text-sm">{s.h1Line}</span>
        </h1>
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

      <section aria-labelledby="sobre" className="flex flex-col gap-6">
        <h2 id="sobre" className="font-display text-4xl uppercase leading-none">
          Sobre o <span className="text-acc">{game.name}</span>
        </h2>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,720px)_320px]">
          <div className="article-body">
            {s.about.map((b, i) => (
              <BodyBlock key={i} block={b} />
            ))}
          </div>
          <aside className="ch flex flex-col gap-3 self-start bg-ink-2 p-5 sm:p-6">
            <h3 className="font-mono text-xs font-semibold text-acc">&gt; FICHA RÁPIDA</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Categoria</dt>
              <dd>{ARCADE_CATEGORIES[game.category]}</dd>
              <dt className="text-muted">Jogadores</dt>
              <dd>1</dd>
              <dt className="text-muted">Funciona em</dt>
              <dd>PC, celular e tablet</dd>
              <dt className="text-muted">Precisa baixar</dt>
              <dd>Não</dd>
              <dt className="text-muted">Cadastro</dt>
              <dd>Não</dd>
              <dt className="text-muted">Recorde</dt>
              <dd>Salvo neste navegador</dd>
              <dt className="text-muted">Atualizado em</dt>
              <dd>{updated}</dd>
            </dl>
          </aside>
        </div>
      </section>

      {similar.length > 0 && (
        <section aria-labelledby="parecidos" className="flex flex-col gap-4">
          <h2 id="parecidos" className="font-display text-4xl uppercase leading-none">
            Jogos <span className="text-acc">parecidos</span>
          </h2>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {similar.map((g) => (
              <li key={g.slug}>
                <Link to={`/arcade/${g.slug}`} className="group chs flex h-full flex-col bg-ink-2 hover:bg-ink-3">
                  <ArcadeThumb slug={g.slug} className="block aspect-video w-full" />
                  <span className="p-3 font-display text-2xl uppercase leading-none group-hover:text-acc">{g.name}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link to="/arcade" className="group chs flex h-full min-h-32 items-center justify-center bg-ink-2 p-3 text-center hover:bg-ink-3">
                <span className="font-display text-2xl uppercase leading-none group-hover:text-acc">
                  Ver os {ARCADE_GAMES.length} jogos <span className="text-acc">→</span>
                </span>
              </Link>
            </li>
          </ul>
        </section>
      )}
    </main>
  );
}
