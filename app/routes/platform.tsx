import { data, Link, useLocation } from "react-router";
import type { Route } from "./+types/platform";
import { Pagination, PostGrid } from "~/components/cards";
import { SectionTitle } from "~/components/ui";
import { getReleases, listPosts } from "~/lib/content.server";
import { seo } from "~/lib/seo";
import { platformBySlug } from "~/lib/site";

export async function loader({ params, request }: Route.LoaderArgs) {
  const platform = platformBySlug(params.slug);
  if (!platform) throw data("Plataforma não encontrada", { status: 404 });
  const page = Number(new URL(request.url).searchParams.get("pagina")) || 1;
  const [posts, releases] = await Promise.all([listPosts({ platform: platform.slug, page }), getReleases({ platform: platform.slug })]);
  return { platform, posts, releases: releases.slice(0, 6) };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { platform, posts } = loaderData;
  return seo({
    title: `${platform.label}: notícias, reviews e lançamentos${posts.page > 1 ? ` — página ${posts.page}` : ""}`,
    description: `Tudo sobre jogos de ${platform.label}: notícias, reviews, guias, lançamentos e promoções.`,
    path: `/plataforma/${platform.slug}${posts.page > 1 ? `?pagina=${posts.page}` : ""}`,
    // Sem matérias: fica fora do Google até ter conteúdo.
    noindex: posts.total === 0,
  });
}

export default function PlatformPage({ loaderData }: Route.ComponentProps) {
  const { platform, posts, releases } = loaderData;
  const location = useLocation();
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-12 px-4 pt-10 sm:px-6">
      <div className="flex flex-col gap-4">
        <p className="font-mono text-xs font-semibold text-acc">PLATAFORMA</p>
        <SectionTitle as="h1" size="xl">
          {platform.label}
        </SectionTitle>
        <p className="max-w-2xl text-lg text-body">Notícias, reviews, guias e lançamentos de {platform.label}.</p>
      </div>

      {releases.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs font-semibold text-acc">PRÓXIMOS LANÇAMENTOS</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-px bg-line">
            {releases.map((r) => (
              <Link key={r.game.slug} to={`/jogos/${r.game.slug}`} className="group bg-ink p-4">
                <span className="font-display text-4xl leading-none text-acc">
                  {r.day} {r.monthShort}
                </span>
                <span className="mt-1 block font-display text-2xl uppercase leading-none group-hover:text-acc">{r.game.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-6">
        <SectionTitle>Últimas</SectionTitle>
        {posts.items.length ? <PostGrid posts={posts.items} /> : <p className="text-body">Nenhuma matéria para esta plataforma ainda.</p>}
        <Pagination page={posts.page} totalPages={posts.totalPages} pathname={location.pathname} search={location.search} />
      </section>
    </main>
  );
}
