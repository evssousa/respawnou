import { data, Link, useLocation } from "react-router";
import type { Route } from "./+types/section";
import { MostRead, Pagination, PostRow } from "~/components/cards";
import { FilterLink, SectionTitle } from "~/components/ui";
import { getMostRead, listPosts } from "~/lib/content.server";
import { seo } from "~/lib/seo";
import { PLATFORMS, platformBySlug, sectionBySlug } from "~/lib/site";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const section = sectionBySlug(url.pathname.split("/")[1] ?? "");
  if (!section) throw data("Seção não encontrada", { status: 404 });

  const platform = platformBySlug(url.searchParams.get("plataforma") ?? "")?.slug;
  const page = Number(url.searchParams.get("pagina")) || 1;
  const [posts, mostRead] = await Promise.all([listPosts({ section: section.slug, platform, page }), getMostRead(5)]);
  return { section, platform: platform ?? null, posts, mostRead };
}

export function meta({ loaderData, location }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { section, posts, platform } = loaderData;
  const platformLabel = platform ? platformBySlug(platform)?.label : null;
  const title = platformLabel ? `${section.label} de ${platformLabel}` : section.label;
  return seo({
    title: posts.page > 1 ? `${title} — página ${posts.page}` : title,
    description: section.description,
    path: location.pathname + (posts.page > 1 ? `?pagina=${posts.page}` : ""),
    // Filtros por plataforma já têm página própria em /plataforma/:slug.
    noindex: Boolean(platform) || posts.total === 0,
  });
}

export default function SectionPage({ loaderData }: Route.ComponentProps) {
  const { section, posts, mostRead, platform } = loaderData;
  const location = useLocation();
  const base = `/${section.slug}`;

  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 pt-10 sm:px-6">
      <div className="flex flex-col gap-4">
        <SectionTitle as="h1" size="xl">
          {section.label}
        </SectionTitle>
        <p className="max-w-2xl text-lg text-body">{section.description}</p>
        <nav aria-label="Filtrar por plataforma" className="flex flex-wrap gap-2">
          <FilterLink to={base} active={!platform}>
            TODAS
          </FilterLink>
          {PLATFORMS.map((p) => (
            <FilterLink key={p.slug} to={`${base}?plataforma=${p.slug}`} active={platform === p.slug}>
              {p.label.toUpperCase()}
            </FilterLink>
          ))}
        </nav>
      </div>

      <div className="flex flex-wrap gap-10">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col">
          {posts.items.length === 0 ? (
            <p className="border-y border-line py-10 text-lg text-body">Nenhuma matéria por aqui ainda. Volte em breve!</p>
          ) : (
            posts.items.map((p) => <PostRow key={p.url} post={p} />)
          )}
          <div className="mt-6">
            <Pagination page={posts.page} totalPages={posts.totalPages} pathname={location.pathname} search={location.search} />
          </div>
        </div>
        <aside className="flex-[1_1_300px]">
          <MostRead posts={mostRead} />
        </aside>
      </div>
    </main>
  );
}
