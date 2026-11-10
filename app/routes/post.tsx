import { data, Link } from "react-router";
import type { Route } from "./+types/post";
import { MostRead, PostCard, ScoreBadge } from "~/components/cards";
import { ShareButtons } from "~/components/ShareButtons";
import { Art, Hud, Kicker, PlatformTags, SectionTitle } from "~/components/ui";
import { getGame, getMostRead, getPost, listPosts } from "~/lib/content.server";
import { formatDate, formatDateTime } from "~/lib/format";
import { seo } from "~/lib/seo";
import { absoluteUrl, PLATFORMS, SITE, sectionBySlug } from "~/lib/site";
import type { Block } from "~/lib/types";

export async function loader({ params, request }: Route.LoaderArgs) {
  const sectionSlug = new URL(request.url).pathname.split("/")[1] ?? "";
  const post = await getPost(sectionSlug, params.slug);
  if (!post) throw data("Post não encontrado", { status: 404 });

  const [game, related, mostRead] = await Promise.all([
    post.gameSlug ? getGame(post.gameSlug) : Promise.resolve(null),
    listPosts({ section: post.section, exclude: [post.slug], perPage: 3 }),
    getMostRead(5, [post.slug]),
  ]);
  return { post, game, related: related.items, mostRead, section: sectionBySlug(post.section)! };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { post } = loaderData;
  const url = absoluteUrl(post.url);
  return [
    ...seo({
      title: post.title,
      description: post.excerpt,
      path: post.url,
      image: post.image?.src,
      type: "article",
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
    }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": post.review ? "Review" : "NewsArticle",
        headline: post.title,
        description: post.excerpt,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt ?? post.publishedAt,
        author: { "@type": "Organization", name: post.author },
        publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
        mainEntityOfPage: url,
        inLanguage: "pt-BR",
        ...(post.image ? { image: [absoluteUrl(post.image.src)] } : {}),
        ...(post.review && loaderData.game
          ? {
              itemReviewed: { "@type": "VideoGame", name: loaderData.game.name },
              reviewRating: { "@type": "Rating", ratingValue: post.review.score, bestRating: 10, worstRating: 0 },
            }
          : {}),
      },
    },
  ];
}

const platformLabels = Object.fromEntries(PLATFORMS.map((p) => [p.slug, p.label]));

export default function PostPage({ loaderData }: Route.ComponentProps) {
  const { post, game, related, mostRead, section } = loaderData;

  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-14 px-4 pt-8 sm:px-6">
      <article className="flex flex-col gap-8">
        <nav aria-label="Você está em" className="font-mono text-xs font-semibold text-muted">
          &gt;{" "}
          <Link to="/" className="-my-3 inline-block py-3 hover:text-acc">
            HOME
          </Link>{" "}
          //{" "}
          <Link to={`/${section.slug}`} className="-my-3 inline-block py-3 hover:text-acc">
            {section.label.toUpperCase()}
          </Link>
        </nav>

        <header className="flex max-w-5xl flex-col gap-5">
          <Kicker>{"// "}{post.kicker}</Kicker>
          <h1 className="font-display text-5xl uppercase leading-[0.9] sm:text-[84px]">{post.title}</h1>
          <p className="max-w-3xl text-xl leading-relaxed text-body">{post.excerpt}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-dashed border-line-soft py-3 font-mono text-xs text-muted">
            <span>POR {post.author.toUpperCase()}</span>
            <time dateTime={post.publishedAt}>{formatDateTime(post.publishedAt)}</time>
            <span>{post.readMinutes} MIN DE LEITURA</span>
          </div>
        </header>

        <Art variant={post.art} image={post.image} eager className="ch aspect-[16/9] w-full sm:aspect-[21/9]">
          <Hud left="> ARQUIVO VISUAL" right={post.timeLabel} />
        </Art>

        <div className="flex flex-wrap gap-12">
          <div className="min-w-0 max-w-[720px] flex-[999_1_560px]">
            <div className="article-body">
              {post.body.map((b, i) => (
                <BodyBlock key={i} block={b} />
              ))}
            </div>

            {post.review && (
              <section aria-label="Veredito" className="ch mt-10 bg-ink-2 p-6">
                <div className="flex items-center gap-5">
                  <ScoreBadge score={post.review.score} className="h-20 w-20 text-4xl" />
                  <div>
                    <p className="font-mono text-xs font-semibold text-acc">&gt; VEREDITO</p>
                    <p className="font-display text-3xl uppercase leading-none">{post.review.verdict}</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <ProsCons title="Pontos fortes" items={post.review.pros} sign="+" />
                  <ProsCons title="Pontos fracos" items={post.review.cons} sign="−" />
                </div>
              </section>
            )}

            <div className="mt-10 flex flex-col gap-6 border-t border-dashed border-line-soft pt-6">
              <PlatformTags platforms={post.platforms} labels={platformLabels} />
              <ShareButtons url={absoluteUrl(post.url)} title={post.title} />
              {post.source && (
                <p className="font-mono text-xs text-muted">
                  FONTE:{" "}
                  <a href={post.source.url} rel="noopener nofollow" target="_blank" className="text-paper underline hover:text-acc">
                    {post.source.name}
                  </a>
                </p>
              )}
              {post.updatedAt && <p className="font-mono text-xs text-muted">ATUALIZADO EM {formatDate(post.updatedAt).toUpperCase()}</p>}
            </div>
          </div>

          <aside className="flex flex-[1_1_300px] flex-col gap-8">
            {game && (
              <Link to={`/jogos/${game.slug}`} className="group ch block bg-ink-2 p-5 transition-colors hover:bg-ink-3">
                <p className="font-mono text-xs font-semibold text-acc">&gt; FICHA DO JOGO</p>
                <p className="mt-2 font-display text-4xl uppercase leading-none group-hover:text-acc">{game.name}</p>
                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted">Gênero</dt>
                  <dd>{game.genres.join(", ")}</dd>
                  <dt className="text-muted">Estúdio</dt>
                  <dd>{game.developer}</dd>
                  {game.releaseDate && (
                    <>
                      <dt className="text-muted">Lançamento</dt>
                      <dd>{formatDate(game.releaseDate)}</dd>
                    </>
                  )}
                </dl>
                <span className="mt-4 inline-block font-mono text-xs font-semibold text-acc">VER JOGO →</span>
              </Link>
            )}
            <MostRead posts={mostRead} />
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section className="flex flex-col gap-6">
          <SectionTitle code="TRANSMISSÕES RELACIONADAS" accent={`em ${section.label.toLowerCase()}`}>Mais</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
            {related.map((p) => (
              <PostCard key={p.url} post={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function BodyBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "h2":
      return <h2>{block.text}</h2>;
    case "quote":
      return <blockquote>{block.text}</blockquote>;
    case "ul":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
  }
}

function ProsCons({ title, items, sign }: { title: string; items: string[]; sign: string }) {
  return (
    <div>
      <h3 className="mb-2 font-mono text-xs font-semibold text-muted">{title.toUpperCase()}</h3>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden className="font-display text-xl leading-none text-acc">
              {sign}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
