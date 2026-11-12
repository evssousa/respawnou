import { Link } from "react-router";
import type { Route } from "./+types/releases";
import { FilterLink, SectionTitle } from "~/components/ui";
import { getReleases } from "~/lib/content.server";
import { formatMonthYear } from "~/lib/format";
import { seo } from "~/lib/seo";
import { PLATFORMS, platformBySlug } from "~/lib/site";
import type { Release } from "~/lib/types";

export async function loader({ request }: Route.LoaderArgs) {
  const platform = platformBySlug(new URL(request.url).searchParams.get("plataforma") ?? "")?.slug;
  const releases = await getReleases({ platform });

  // Agrupa por mês ("novembro de 2026").
  const groups: { month: string; items: Release[] }[] = [];
  for (const r of releases) {
    const month = formatMonthYear(r.date);
    const last = groups.at(-1);
    if (last?.month === month) last.items.push(r);
    else groups.push({ month, items: [r] });
  }
  return { groups, platform: platform ?? null };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return seo({
    title: "Calendário de lançamentos de games",
    description: "Datas de lançamento dos próximos jogos para PC, PlayStation, Xbox, Nintendo Switch e mobile.",
    path: "/lancamentos",
    noindex: Boolean(loaderData?.platform) || !loaderData?.groups.length,
  });
}

const platformLabels = Object.fromEntries(PLATFORMS.map((p) => [p.slug, p.label]));

export default function ReleasesPage({ loaderData }: Route.ComponentProps) {
  const { groups, platform } = loaderData;
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 pt-10 sm:px-6">
      <div className="flex flex-col gap-4">
        <SectionTitle as="h1" size="xl" accent="de lançamentos">
          Calendário
        </SectionTitle>
        <p className="max-w-2xl text-lg text-body">Os próximos jogos, em ordem de chegada. Datas podem mudar conforme anúncios das empresas.</p>
        <nav aria-label="Filtrar por plataforma" className="flex flex-wrap gap-2">
          <FilterLink to="/lancamentos" active={!platform}>
            TODAS
          </FilterLink>
          {PLATFORMS.map((p) => (
            <FilterLink key={p.slug} to={`/lancamentos?plataforma=${p.slug}`} active={platform === p.slug}>
              {p.label.toUpperCase()}
            </FilterLink>
          ))}
        </nav>
      </div>

      {groups.length === 0 && <p className="border-y border-line py-10 text-lg text-body">Nenhum lançamento previsto para este filtro.</p>}

      {groups.map((g) => (
        <section key={g.month} className="flex flex-col">
          <h2 className="pb-3 font-mono text-xs font-bold text-acc">
            &gt; <span className="font-display text-4xl uppercase leading-none text-paper">{g.month}</span>
          </h2>
          <ol className="flex flex-col gap-3">
            {g.items.map((r) => (
              <li key={r.game.slug}>
                <Link
                  to={`/jogos/${r.game.slug}`}
                  className="group ch grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-3 bg-ink-2 p-4 transition-colors hover:bg-ink-3 sm:grid-cols-[96px_1fr_auto] sm:gap-x-6 sm:p-5"
                >
                  <span className="flex flex-col items-center">
                    <span className="font-display text-5xl leading-[0.9] text-acc sm:text-6xl">{r.day}</span>
                    <span className="font-mono text-[11px] font-bold text-muted">{r.monthShort}</span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="font-mono text-[11px] font-semibold text-muted">
                      {r.weekday.toUpperCase()} · {r.game.platforms.map((p) => platformLabels[p]).join(" · ").toUpperCase()}
                    </span>
                    <h3 className="font-display text-[28px] uppercase leading-none transition-colors group-hover:text-acc sm:text-4xl">{r.game.name}</h3>
                    <span className="text-sm text-body">{r.game.genres.join(" · ")}</span>
                  </span>
                  <span className="chs col-span-2 justify-self-start bg-ink-3 px-3 py-2 font-mono text-xs font-bold text-acc sm:col-span-1 sm:justify-self-end">
                    {r.daysLeft <= 0 ? "LANÇA HOJE" : r.daysLeft === 1 ? "T-01 · AMANHÃ" : `T-${String(r.daysLeft).padStart(2, "0")} DIAS`}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {groups.length > 0 && (
        <p className="font-mono text-[11px] text-muted">
          DATAS E DADOS DOS JOGOS:{" "}
          <a href="https://www.igdb.com" target="_blank" rel="noopener" className="underline hover:text-acc">
            IGDB.COM
          </a>
          . AS DATAS PODEM MUDAR; O CALENDÁRIO SE ATUALIZA SOZINHO.
        </p>
      )}
    </main>
  );
}
