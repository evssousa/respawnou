import { useEffect, type ReactNode } from "react";
import { data, Link } from "react-router";
import type { Route } from "./+types/post";
import { MostRead, PostCard, ScoreBadge } from "~/components/cards";
import { ShareButtons } from "~/components/ShareButtons";
import { Art, Hud, Kicker, PlatformTags, SectionTitle } from "~/components/ui";
import { isAdmin } from "~/lib/admin/auth.server";
import { getGame, getMostRead, getPost, listPosts } from "~/lib/content.server";
import { formatDate, formatDateTime, formatScore } from "~/lib/format";
import { firstSegment } from "~/lib/route-path";
import { seo } from "~/lib/seo";
import { absoluteUrl, PLATFORMS, SITE, sectionBySlug } from "~/lib/site";
import type { Block } from "~/lib/types";

// Pré-visualização: ?previa=1 com o admin logado mostra rascunho/arquivada com o visual do site.
// Sem sessão, o parâmetro é ignorado (rascunho continua 404). Nunca indexa nem entra em cache.
export async function loader({ params, request }: Route.LoaderArgs) {
  const sectionSlug = firstSegment(request);
  const preview = new URL(request.url).searchParams.get("previa") === "1" && (await isAdmin(request));
  const post = await getPost(sectionSlug, params.slug, preview);
  if (!post) throw data("Post não encontrado", { status: 404 });

  const [game, related, mostRead] = await Promise.all([
    post.gameSlug ? getGame(post.gameSlug) : Promise.resolve(null),
    listPosts({ section: post.section, exclude: [post.slug], perPage: 3 }),
    getMostRead(5, [post.slug]),
  ]);
  const result = { post, game, related: related.items, mostRead, section: sectionBySlug(post.section)!, preview };
  return preview ? data(result, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } }) : result;
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { post } = loaderData;
  if (loaderData.preview) return [{ title: `Prévia: ${post.title}` }, { name: "robots", content: "noindex, nofollow" }];
  const url = absoluteUrl(post.url);
  return [
    ...seo({
      title: post.title,
      description: post.metaDescription ?? post.excerpt,
      path: post.url,
      image: post.image?.src,
      type: "article",
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
    }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        // Reviews são consenso da crítica: a nota não é nossa, então não marcamos como Review.
        "@type": "NewsArticle",
        headline: post.title,
        description: post.metaDescription ?? post.excerpt,
        articleSection: loaderData.section.label,
        ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
        datePublished: post.publishedAt,
        dateModified: post.updatedAt ?? post.publishedAt,
        author: { "@type": "Organization", name: post.author },
        publisher: { "@type": "Organization", name: SITE.name, url: SITE.url, logo: { "@type": "ImageObject", url: absoluteUrl("/logo-512.png"), width: 512, height: 512 } },
        mainEntityOfPage: url,
        inLanguage: "pt-BR",
        ...(post.image ? { image: [absoluteUrl(post.image.src)] } : {}),
        ...(loaderData.game ? { about: { "@type": "VideoGame", name: loaderData.game.name } } : {}),
      },
    },
  ];
}

const platformLabels = Object.fromEntries(PLATFORMS.map((p) => [p.slug, p.label]));

export default function PostPage({ loaderData }: Route.ComponentProps) {
  const { post, game, related, mostRead, section, preview } = loaderData;
  // Conta a visita depois de abrir no navegador (bots e pré-carregamentos não contam).
  useEffect(() => {
    if (preview) return;
    const body = JSON.stringify({ path: post.url });
    if (!navigator.sendBeacon?.("/api/view", new Blob([body], { type: "application/json" })))
      fetch("/api/view", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [post.url, preview]);

  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-14 px-4 pt-8 sm:px-6">
      {preview && (
        <div role="status" className="ch flex flex-wrap items-center justify-between gap-3 border border-acc bg-ink-2 px-4 py-3 font-mono text-xs">
          <span className="font-bold text-acc">
            &gt; PRÉ-VISUALIZAÇÃO · {post.status === "published" ? "NO AR" : post.status === "archived" ? "ARQUIVADA" : "RASCUNHO"} · SÓ VOCÊ VÊ ESTA PÁGINA
          </span>
          <span className="text-muted">Data e "mais lidas" são provisórias até publicar.</span>
        </div>
      )}
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

        <figure className="flex flex-col gap-2">
          <Art variant={post.art} image={post.image} eager className="ch aspect-[16/9] w-full sm:aspect-[21/9]">
            <Hud left="> ARQUIVO VISUAL" right={post.timeLabel} />
          </Art>
          {post.image?.credit && <figcaption className="font-mono text-xs text-muted">{post.image.credit}</figcaption>}
        </figure>

        <div className="flex flex-wrap gap-12">
          <div className="min-w-0 max-w-[720px] flex-[999_1_560px]">
            <div className="article-body">
              {post.body.map((b, i) => (
                <BodyBlock key={i} block={b} />
              ))}
            </div>

            {post.review && (
              <section aria-labelledby="consenso" className="ch mt-10 bg-ink-2 p-5 sm:p-6">
                <div className="flex items-center gap-5">
                  <ScoreBadge score={post.review.score} className="h-20 w-20 text-4xl" />
                  <div className="flex flex-col gap-2">
                    <p id="consenso" className="font-mono text-xs font-semibold text-acc">
                      &gt; CONSENSO DA CRÍTICA · MÉDIA DE {post.review.critics.length} ANÁLISES
                    </p>
                    <p className="font-display text-2xl uppercase leading-none sm:text-3xl">{post.review.verdict}</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <ProsCons title="Mais elogiado" items={post.review.pros} sign="+" />
                  <ProsCons title="Mais criticado" items={post.review.cons} sign="−" />
                </div>
                <div className="mt-6 border-t border-dashed border-line-soft pt-5">
                  <p className="mb-2 font-mono text-xs font-bold text-muted">&gt; ANÁLISES CONSIDERADAS</p>
                  <ul className="grid gap-x-6 sm:grid-cols-2">
                    {post.review.critics.map((c) => (
                      <li key={c.outlet}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener nofollow"
                          className="flex min-h-11 items-center justify-between gap-3 border-b border-line text-sm text-body hover:text-acc"
                        >
                          {c.outlet}
                          <span className="font-mono font-bold text-paper">{formatScore(c.score)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-muted">
                    Notas convertidas para a escala de 0 a 10.{" "}
                    <Link to="/como-avaliamos" className="-my-3 inline-block py-3 text-paper underline decoration-acc underline-offset-4 hover:text-acc">
                      Como calculamos a média
                    </Link>
                  </p>
                </div>
              </section>
            )}

            <div className="mt-10 flex flex-col gap-6 border-t border-dashed border-line-soft pt-6">
              <PlatformTags platforms={post.platforms} labels={platformLabels} />
              {post.tags && post.tags.length > 0 && (
                <ul aria-label="Tópicos" className="flex flex-wrap gap-2">
                  {post.tags.map((t) => (
                    <li key={t}>
                      <Link
                        to={`/busca?q=${encodeURIComponent(t)}`}
                        className="inline-flex min-h-9 items-center border border-line px-3 font-mono text-xs text-body hover:border-acc hover:text-acc"
                      >
                        #{t}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
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

const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

/** Texto com links no formato [texto](url): interno vira <Link>, externo abre em outra aba. */
function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    parts.push(text.slice(last, m.index));
    const [, label, href] = m;
    if (href.startsWith("/")) parts.push(<Link key={m.index} to={href}>{label}</Link>);
    else if (/^https:\/\//.test(href))
      parts.push(
        <a key={m.index} href={href} target="_blank" rel="noopener">
          {label}
        </a>,
      );
    else parts.push(label);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function BodyBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "p": {
      const also = block.text.match(/^Leia também:\s*(.+)$/);
      if (also)
        return (
          <p className="read-also">
            <span>&gt; LEIA TAMBÉM</span>
            <RichText text={also[1]} />
          </p>
        );
      return (
        <p>
          <RichText text={block.text} />
        </p>
      );
    }
    case "h2":
      return <h2>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "quote":
      return (
        <blockquote>
          <RichText text={block.text} />
        </blockquote>
      );
    case "ul":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
    case "img":
      return (
        <figure>
          <img src={block.src} alt={block.alt} width={block.width} height={block.height} loading="lazy" decoding="async" />
          {block.credit && <figcaption>{block.credit}</figcaption>}
        </figure>
      );
    case "video":
      return (
        <div className="video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${block.youtubeId}`}
            title={block.title}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
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
