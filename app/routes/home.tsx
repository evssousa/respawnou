import type { Route } from "./+types/home";
import { MostRead } from "~/components/cards";
import {
  ArchiveRail,
  Countdown,
  LootDrop,
  MainBroadcast,
  MissionManual,
  ModuleGrid,
  ModuleHeader,
  NewsFeed,
  PlatformSelect,
  ReviewBoard,
} from "~/components/home-modules";
import { getFeatured, getFreeGames, getMostRead, getReleases, getSectionStats, listPosts } from "~/lib/content.server";
import { platformsFor, useAvailability } from "~/lib/availability";
import { seo } from "~/lib/seo";
import { absoluteUrl, SITE } from "~/lib/site";

export async function loader() {
  const featured = await getFeatured();
  const skip = featured ? [featured.slug] : [];
  const [log, stats, news, reviews, releases, guides, articles, promos, free, mostRead] = await Promise.all([
    listPosts({ exclude: skip, perPage: 6 }),
    getSectionStats(),
    listPosts({ section: "noticias", exclude: skip, perPage: 5 }),
    listPosts({ section: "reviews", perPage: 3 }),
    getReleases({ days: 30 }),
    listPosts({ section: "guias", perPage: 4 }),
    listPosts({ section: "artigos", perPage: 8 }),
    listPosts({ section: "promocoes", perPage: 3 }),
    getFreeGames(),
    getMostRead(5),
  ]);
  return {
    featured,
    log: log.items,
    stats,
    news: news.items,
    reviews: reviews.items,
    releases,
    releasesWeek: releases.filter((r) => r.daysLeft <= 7).length,
    guides: guides.items,
    articles: articles.items,
    promos: promos.items,
    free,
    mostRead,
  };
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

interface HomeModule {
  show: boolean;
  code: string;
  title: string;
  accent: string;
  action: { to: string; label: string };
  body: React.ReactNode;
}

export default function Home({ loaderData: d }: Route.ComponentProps) {
  const platforms = platformsFor(useAvailability());
  // Módulo sem conteúdo some da home (nada de "em breve"); a numeração acompanha.
  const modules = (
    [
      {
        show: true,
        code: "FEED TÁTICO // NOTÍCIAS",
        title: "Últimas",
        accent: "operações",
        action: { to: "/noticias", label: "TODAS AS NOTÍCIAS" },
        body: <NewsFeed posts={d.news} />,
      },
      {
        show: d.reviews.length > 0,
        code: "PLACAR // REVIEWS",
        title: "O que a",
        accent: "crítica diz",
        action: { to: "/reviews", label: "TODAS AS REVIEWS" },
        body: <ReviewBoard posts={d.reviews} />,
      },
      {
        show: d.releases.length > 0,
        code: "CONTAGEM REGRESSIVA // LANÇAMENTOS",
        title: "Próximos",
        accent: "lançamentos",
        action: { to: "/lancamentos", label: "CALENDÁRIO COMPLETO" },
        body: <Countdown releases={d.releases} />,
      },
      {
        show: d.guides.length > 0,
        code: "MANUAL DE MISSÃO // GUIAS",
        title: "Guias",
        accent: "& dicas",
        action: { to: "/guias", label: "TODOS OS GUIAS" },
        body: <MissionManual posts={d.guides} />,
      },
      {
        show: d.articles.length > 0,
        code: "ARQUIVO // ARTIGOS E LISTAS",
        title: "Arquivo",
        accent: "especial",
        action: { to: "/artigos", label: "TODOS OS ARTIGOS" },
        body: <ArchiveRail posts={d.articles} />,
      },
      {
        show: d.free.length > 0 || d.promos.length > 0,
        code: "LOOT // PROMOÇÕES E JOGOS GRÁTIS",
        title: "Loot",
        accent: "do dia",
        action: { to: "/promocoes", label: "TODAS AS PROMOÇÕES" },
        body: <LootDrop free={d.free} promos={d.promos} />,
      },
    ] satisfies HomeModule[]
  ).filter((m) => m.show);

  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-16 px-4 pt-6 sm:px-6">
      <div className="flex flex-col gap-5">
        {d.featured ? (
          <MainBroadcast post={d.featured} log={d.log} />
        ) : (
          <p className="ch bg-ink-2 p-6 font-mono text-sm text-muted">&gt; AGUARDANDO A PRIMEIRA TRANSMISSÃO. AS MATÉRIAS APARECEM AQUI ASSIM QUE FOREM PUBLICADAS.</p>
        )}
        <ModuleGrid stats={d.stats} releases={d.releasesWeek} showReleases={d.releases.length > 0} />
      </div>

      {modules.map((m, i) => (
        <section key={m.code} className="flex flex-col gap-6">
          <ModuleHeader n={i + 1} code={m.code} title={m.title} accent={m.accent} action={m.action} />
          {m.body}
        </section>
      ))}

      {(d.mostRead.length > 0 || platforms.length > 0) && (
        <section className="flex flex-wrap gap-8">
          {d.mostRead.length > 0 && (
            <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-6">
              <ModuleHeader n={modules.length + 1} code="RANKING // MAIS LIDAS" title="Ranking" accent="24h" />
              <MostRead posts={d.mostRead} title="Mais acessadas" />
            </div>
          )}
          {platforms.length > 0 && (
            <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-6">
              <ModuleHeader n={modules.length + (d.mostRead.length > 0 ? 2 : 1)} code="SELEÇÃO DE PLATAFORMA" title="Escolha sua" accent="plataforma" />
              <PlatformSelect platforms={platforms} />
            </div>
          )}
        </section>
      )}
    </main>
  );
}
