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
import { seo } from "~/lib/seo";
import { absoluteUrl, SITE } from "~/lib/site";

export async function loader() {
  const featured = await getFeatured();
  const skip = [featured.slug];
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

export default function Home({ loaderData: d }: Route.ComponentProps) {
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-16 px-4 pt-6 sm:px-6">
      <div className="flex flex-col gap-5">
        <MainBroadcast post={d.featured} log={d.log} />
        <ModuleGrid stats={d.stats} releases={d.releasesWeek} />
      </div>

      <section className="flex flex-col gap-6">
        <ModuleHeader n={1} code="FEED TÁTICO // NOTÍCIAS" title="Últimas" accent="operações" action={{ to: "/noticias", label: "TODAS AS NOTÍCIAS" }} />
        <NewsFeed posts={d.news} />
      </section>

      <section className="flex flex-col gap-6">
        <ModuleHeader n={2} code="PLACAR // REVIEWS" title="Análises" accent="concluídas" action={{ to: "/reviews", label: "TODAS AS REVIEWS" }} />
        <ReviewBoard posts={d.reviews} />
      </section>

      <section className="flex flex-col gap-6">
        <ModuleHeader n={3} code="CONTAGEM REGRESSIVA // LANÇAMENTOS" title="Próximos" accent="lançamentos" action={{ to: "/lancamentos", label: "CALENDÁRIO COMPLETO" }} />
        <Countdown releases={d.releases} />
      </section>

      <section className="flex flex-col gap-6">
        <ModuleHeader n={4} code="MANUAL DE MISSÃO // GUIAS" title="Guias" accent="& dicas" action={{ to: "/guias", label: "TODOS OS GUIAS" }} />
        <MissionManual posts={d.guides} />
      </section>

      <section className="flex flex-col gap-6">
        <ModuleHeader n={5} code="ARQUIVO // ARTIGOS E LISTAS" title="Arquivo" accent="especial" action={{ to: "/artigos", label: "TODOS OS ARTIGOS" }} />
        <ArchiveRail posts={d.articles} />
      </section>

      <section className="flex flex-col gap-6">
        <ModuleHeader n={6} code="LOOT // PROMOÇÕES E JOGOS GRÁTIS" title="Loot" accent="do dia" action={{ to: "/promocoes", label: "TODAS AS PROMOÇÕES" }} />
        <LootDrop free={d.free} promos={d.promos} />
      </section>

      <section className="flex flex-wrap gap-8">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-6">
          <ModuleHeader n={7} code="RANKING // MAIS LIDAS" title="Ranking" accent="24h" />
          <MostRead posts={d.mostRead} title="Mais acessadas" />
        </div>
        <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-6">
          <ModuleHeader n={8} code="SELEÇÃO DE PLATAFORMA" title="Escolha sua" accent="plataforma" />
          <PlatformSelect />
        </div>
      </section>
    </main>
  );
}
