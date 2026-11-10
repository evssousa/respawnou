import { data } from "react-router";
import type { Route } from "./+types/game";
import { PostGrid } from "~/components/cards";
import { Art, Hud, Kicker, PlatformTags, SectionTitle, SoonButton } from "~/components/ui";
import { getGame, listPosts } from "~/lib/content.server";
import { formatDate } from "~/lib/format";
import { seo } from "~/lib/seo";
import { PLATFORMS } from "~/lib/site";

export async function loader({ params }: Route.LoaderArgs) {
  const game = await getGame(params.slug);
  if (!game) throw data("Jogo não encontrado", { status: 404 });
  const posts = await listPosts({ gameSlug: game.slug, perPage: 12 });
  const upcoming = Boolean(game.releaseDate && game.releaseDate >= new Date().toISOString().slice(0, 10));
  return { game, posts: posts.items, upcoming };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { game } = loaderData;
  return [
    ...seo({ title: `${game.name}: notícias, review e data de lançamento`, description: game.description, path: `/jogos/${game.slug}` }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: game.name,
        description: game.description,
        genre: game.genres,
        gamePlatform: game.platforms.map((p) => PLATFORMS.find((x) => x.slug === p)?.label ?? p),
        author: { "@type": "Organization", name: game.developer },
        publisher: { "@type": "Organization", name: game.publisher },
        ...(game.releaseDate ? { datePublished: game.releaseDate } : {}),
      },
    },
  ];
}

const platformLabels = Object.fromEntries(PLATFORMS.map((p) => [p.slug, p.label]));

export default function GamePage({ loaderData }: Route.ComponentProps) {
  const { game, posts, upcoming } = loaderData;
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-14 px-4 pt-10 sm:px-6">
      <section className="flex flex-wrap gap-8">
        <Art variant={game.art} className="ch min-h-[280px] flex-[1_1_480px]">
          <Hud left="> FICHA DO JOGO" right={upcoming ? "STATUS: EM BREVE" : "STATUS: DISPONÍVEL"} />
        </Art>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
          <Kicker>{"// JOGO · "}{game.genres.join(" · ")}</Kicker>
          <h1 className="font-display text-6xl uppercase leading-[0.9] sm:text-[96px]">{game.name}</h1>
          <p className="text-lg leading-relaxed text-body">{game.description}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-dashed border-line-soft py-4 text-sm">
            <dt className="font-mono text-xs font-semibold text-muted">LANÇAMENTO</dt>
            <dd>{game.releaseDate ? formatDate(game.releaseDate) : "Já disponível"}</dd>
            <dt className="font-mono text-xs font-semibold text-muted">ESTÚDIO</dt>
            <dd>{game.developer}</dd>
            <dt className="font-mono text-xs font-semibold text-muted">DISTRIBUIDORA</dt>
            <dd>{game.publisher}</dd>
          </dl>
          <PlatformTags platforms={game.platforms} labels={platformLabels} />
          <div className="flex flex-wrap gap-2">
            <SoonButton>FAVORITAR · EM BREVE</SoonButton>
            <SoonButton>AVISAR NO LANÇAMENTO · EM BREVE</SoonButton>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <SectionTitle code="ARQUIVOS DO JOGO" accent={`sobre ${game.name}`}>Tudo</SectionTitle>
        {posts.length ? <PostGrid posts={posts} /> : <p className="text-body">Ainda não publicamos nada sobre este jogo.</p>}
      </section>
    </main>
  );
}
