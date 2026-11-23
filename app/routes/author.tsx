import { data, useLocation } from "react-router";
import type { Route } from "./+types/author";
import { AuthorAvatar } from "~/components/AuthorAvatar";
import { Pagination, PostGrid } from "~/components/cards";
import { SectionTitle } from "~/components/ui";
import { listPosts } from "~/lib/content.server";
import { formatDate } from "~/lib/format";
import { seo } from "~/lib/seo";
import { absoluteUrl, AUTHORS, SECTIONS, SITE } from "~/lib/site";

export async function loader({ params, request }: Route.LoaderArgs) {
  const author = AUTHORS.find((a) => a.slug === params.slug);
  if (!author) throw data("Autor não encontrado", { status: 404 });
  const page = Number(new URL(request.url).searchParams.get("pagina")) || 1;
  const posts = await listPosts({ author: author.name, page, perPage: 12 });
  return { author, posts };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { author, posts } = loaderData;
  const url = `/autores/${author.slug}`;
  return [
    ...seo({
      title: `${author.name}: ${author.tagline}`,
      description: author.about.slice(0, 155),
      path: `${url}${posts.page > 1 ? `?pagina=${posts.page}` : ""}`,
      noindex: posts.total === 0,
    }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        mainEntity: { "@type": "Person", name: author.name, url: absoluteUrl(url), description: author.about, worksFor: { "@type": "Organization", name: SITE.name, url: SITE.url } },
      },
    },
  ];
}

export default function AuthorPage({ loaderData }: Route.ComponentProps) {
  const { author, posts } = loaderData;
  const location = useLocation();
  const labels = author.sections.map((s) => SECTIONS.find((x) => x.slug === s)?.label).filter(Boolean).join(" e ");
  const first = posts.items.at(-1);
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-12 px-4 pt-10 sm:px-6">
      <section className="flex flex-wrap items-start gap-8">
        <AuthorAvatar slug={author.slug} className="ch h-40 w-40 shrink-0 bg-ink-2 sm:h-56 sm:w-56" />
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
          <p className="font-mono text-xs font-semibold text-acc">&gt; REDAÇÃO // {labels.toUpperCase()}</p>
          <h1 className="font-display text-6xl uppercase leading-[0.9] sm:text-[96px]">{author.name}</h1>
          <p className="text-xl leading-relaxed text-paper">{author.tagline}</p>
          <p className="max-w-2xl text-lg leading-relaxed text-body">{author.about}</p>
          <blockquote className="max-w-2xl border-l-4 border-acc pl-4 font-mono text-sm leading-relaxed text-body">“{author.quote}”</blockquote>
          <ul className="flex flex-wrap gap-2" aria-label="Assuntos favoritos">
            {author.topics.map((t) => (
              <li key={t} className="chs border border-line-soft bg-ink-2 px-3 py-1.5 font-mono text-xs font-bold text-acc">
                {t.toUpperCase()}
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-dashed border-line-soft py-4 text-sm sm:max-w-md">
            <dt className="font-mono text-xs font-semibold text-muted">MATÉRIAS</dt>
            <dd>{posts.total}</dd>
            {first && posts.page === posts.totalPages && (
              <>
                <dt className="font-mono text-xs font-semibold text-muted">ASSINA DESDE</dt>
                <dd>{formatDate(first.publishedAt)}</dd>
              </>
            )}
          </dl>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <SectionTitle code="ARQUIVO" accent={`de ${author.name}`}>
          Matérias
        </SectionTitle>
        {posts.items.length ? <PostGrid posts={posts.items} /> : <p className="text-body">Ainda não há matérias assinadas por {author.name}.</p>}
        <Pagination page={posts.page} totalPages={posts.totalPages} pathname={location.pathname} search={location.search} />
      </section>
    </main>
  );
}
