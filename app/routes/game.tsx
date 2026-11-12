import { data } from "react-router";
import type { Route } from "./+types/game";
import { PostGrid } from "~/components/cards";
import { Gallery } from "~/components/Gallery";
import { Art, Hud, Kicker, PlatformTags, SectionTitle } from "~/components/ui";
import { getGame, listPosts } from "~/lib/content.server";
import { formatDate } from "~/lib/format";
import { seo } from "~/lib/seo";
import { PLATFORMS } from "~/lib/site";

export async function loader({ params }: Route.LoaderArgs) {
  const game = await getGame(params.slug);
  if (!game) throw data("Jogo não encontrado", { status: 404 });
  const posts = await listPosts({ gameSlug: game.slug, perPage: 12 });
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = game.releaseDate ? game.releaseDate >= today : Boolean(game.releaseLabel);
  return { game, posts: posts.items, upcoming };
}

const platformLabels = Object.fromEntries(PLATFORMS.map((p) => [p.slug, p.label]));

/** Descrição da ficha: a do IGDB traduzida ou, enquanto não há, uma frase montada só com os dados. */
function describe(game: Route.ComponentProps["loaderData"]["game"]) {
  if (game.description) return game.description;
  const genres = game.genres.length ? `de ${game.genres.slice(0, 2).join(" e ").toLowerCase()} ` : "";
  const platforms = game.platforms.map((p) => platformLabels[p] ?? p);
  const on = platforms.length ? ` para ${platforms.join(", ").replace(/, ([^,]*)$/, " e $1")}` : "";
  const by = game.developer ? `, da ${game.developer}` : "";
  const when = game.releaseDate ? `, com lançamento em ${formatDate(game.releaseDate)}` : game.releaseLabel && game.releaseLabel !== "sem data" ? `, previsto para ${game.releaseLabel}` : "";
  return `${game.name} é um jogo ${genres}${on}${by}${when}.`.replace(/\s+/g, " ");
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { game, posts } = loaderData;
  return [
    ...seo({
      title: `${game.name}: notícias, review e data de lançamento`,
      description: describe(game),
      path: `/jogos/${game.slug}`,
      image: game.image ?? undefined,
      // Ficha só com dados (sem matéria nossa) fica fora do Google até ter conteúdo próprio.
      noindex: posts.length === 0,
    }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: game.name,
        description: describe(game),
        ...(game.image ? { image: game.image } : {}),
        genre: game.genres,
        gamePlatform: game.platforms.map((p) => PLATFORMS.find((x) => x.slug === p)?.label ?? p),
        ...(game.developer ? { author: { "@type": "Organization", name: game.developer } } : {}),
        ...(game.publisher ? { publisher: { "@type": "Organization", name: game.publisher } } : {}),
        ...(game.releaseDate ? { datePublished: game.releaseDate } : {}),
      },
    },
  ];
}

export default function GamePage({ loaderData }: Route.ComponentProps) {
  const { game, posts, upcoming } = loaderData;
  // Miniatura leve na página; a versão 1080p só carrega ao ampliar.
  const shots = (game.screenshots ?? []).map((src, i) => ({
    thumb: src,
    full: src.replace(/\/t_[a-z0-9_]+\//, "/t_1080p/"),
    alt: `${game.name}: imagem ${i + 1}`,
  }));
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-14 px-4 pt-10 sm:px-6">
      <section className="flex flex-wrap gap-8">
        <Art variant={game.art} image={game.image ? { src: game.image, alt: `Arte de ${game.name}` } : undefined} eager className="ch min-h-[280px] flex-[1_1_480px]">
          <Hud left="> FICHA DO JOGO" right={upcoming ? "STATUS: EM BREVE" : "STATUS: DISPONÍVEL"} />
        </Art>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
          <Kicker>{"// JOGO · "}{game.genres.join(" · ")}</Kicker>
          <h1 className="font-display text-6xl uppercase leading-[0.9] sm:text-[96px]">{game.name}</h1>
          <p className="text-lg leading-relaxed text-body">{describe(game)}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-dashed border-line-soft py-4 text-sm">
            <dt className="font-mono text-xs font-semibold text-muted">LANÇAMENTO</dt>
            <dd>{game.releaseDate ? formatDate(game.releaseDate) : game.releaseLabel ? `Previsto: ${game.releaseLabel}` : "Já disponível"}</dd>
            {game.developer && (
              <>
                <dt className="font-mono text-xs font-semibold text-muted">ESTÚDIO</dt>
                <dd>{game.developer}</dd>
              </>
            )}
            {game.publisher && (
              <>
                <dt className="font-mono text-xs font-semibold text-muted">DISTRIBUIDORA</dt>
                <dd>{game.publisher}</dd>
              </>
            )}
          </dl>
          <PlatformTags platforms={game.platforms} labels={platformLabels} />
        </div>
      </section>

      {(game.trailer || shots.length > 0) && (
        <section className="flex flex-col gap-6">
          <SectionTitle code="ARQUIVO VISUAL" accent={game.trailer ? "e imagens" : undefined}>
            {game.trailer ? "Trailer" : "Imagens"}
          </SectionTitle>
          {/* Desktop: trailer à esquerda e imagens 2×2 à direita, ocupando a largura toda. */}
          <div className={game.trailer && shots.length ? "grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}>
            {game.trailer && (
              <div className="ch aspect-video w-full overflow-hidden bg-ink-2">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${game.trailer}`}
                  title={`Trailer de ${game.name}`}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )}
            {/* Ao lado do trailer: 2 colunas e fileiras que esticam até a altura dele. */}
            {shots.length > 0 && (
              <Gallery
                images={shots}
                fill={Boolean(game.trailer)}
                className={game.trailer ? `grid-cols-2 lg:h-full ${shots.length > 4 ? "lg:grid-rows-3" : "lg:grid-rows-2"}` : "grid-cols-2 lg:grid-cols-4"}
              />
            )}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-6">
        <SectionTitle code="ARQUIVOS DO JOGO" accent={`sobre ${game.name}`}>Tudo</SectionTitle>
        {posts.length ? <PostGrid posts={posts} /> : <p className="text-body">Ainda não publicamos nada sobre este jogo.</p>}
      </section>

      {game.igdbUrl && (
        <p className="font-mono text-[11px] text-muted">
          DADOS E IMAGENS DA FICHA:{" "}
          <a href={game.igdbUrl} target="_blank" rel="noopener" className="underline hover:text-acc">
            IGDB.COM
          </a>
        </p>
      )}
    </main>
  );
}
