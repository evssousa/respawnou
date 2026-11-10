import { Link } from "react-router";
import type { Route } from "./+types/home";
import { FreeGamesBox, HeroPost, MostRead, PostCard, PostGrid, ReleasesStrip } from "~/components/cards";
import { SectionTitle } from "~/components/ui";
import { getFeatured, getFreeGames, getMostRead, getReleases, listPosts } from "~/lib/content.server";
import { seo } from "~/lib/seo";
import { absoluteUrl, PLATFORMS, SITE } from "~/lib/site";

export async function loader() {
  const featured = await getFeatured();
  const [latest, mostRead, free, releases, reviews, guides] = await Promise.all([
    listPosts({ exclude: [featured.slug], perPage: 6 }),
    getMostRead(5, [featured.slug]),
    getFreeGames(),
    getReleases({ days: 7 }),
    listPosts({ section: "reviews", perPage: 3 }),
    listPosts({ section: "guias", perPage: 3 }),
  ]);
  return { featured, latest: latest.items, mostRead, free, releases, reviews: reviews.items, guides: guides.items };
}

export function meta() {
  return [
    ...seo({ path: "/" }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE.name,
        url: SITE.url,
        inLanguage: "pt-BR",
        potentialAction: {
          "@type": "SearchAction",
          target: `${absoluteUrl("/busca")}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    },
  ];
}

const platformLabels = Object.fromEntries(PLATFORMS.map((p) => [p.slug, p.label]));

export default function Home({ loaderData }: Route.ComponentProps) {
  const { featured, latest, mostRead, free, releases, reviews, guides } = loaderData;
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-14 px-4 pt-8 sm:px-6">
      <HeroPost post={featured} />

      <section className="flex flex-wrap gap-10">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          <SectionTitle action={{ to: "/noticias", label: "VER TODAS" }}>Últimas</SectionTitle>
          <PostGrid posts={latest} />
        </div>
        <aside className="flex flex-[1_1_300px] flex-col gap-8">
          <MostRead posts={mostRead} />
          <FreeGamesBox games={free} />
        </aside>
      </section>

      <ReleasesStrip releases={releases} labels={platformLabels} />

      <section className="flex flex-wrap gap-10">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-6">
          <SectionTitle accent="& notas" action={{ to: "/reviews", label: "TODAS AS REVIEWS" }}>
            Reviews
          </SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
            {reviews.map((p) => (
              <PostCard key={p.url} post={p} size="sm" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-6">
          <SectionTitle accent="& dicas" action={{ to: "/guias", label: "TODOS OS GUIAS" }}>
            Guias
          </SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
            {guides.map((p) => (
              <PostCard key={p.url} post={p} size="sm" />
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <SectionTitle>Por plataforma</SectionTitle>
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-5">
          {PLATFORMS.map((p) => (
            <Link key={p.slug} to={`/plataforma/${p.slug}`} className="group bg-ink px-5 py-6 transition-colors hover:bg-alert hover:text-ink">
              <span className="font-mono text-xs font-semibold text-muted group-hover:text-ink">PLATAFORMA</span>
              <span className="mt-1 block font-display text-3xl uppercase leading-none">{p.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
