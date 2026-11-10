import { Link } from "react-router";
import type { Route } from "./+types/releases";
import { SectionTitle, cx } from "~/components/ui";
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
    noindex: Boolean(loaderData?.platform),
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
          <Filter to="/lancamentos" active={!platform}>
            TODAS
          </Filter>
          {PLATFORMS.map((p) => (
            <Filter key={p.slug} to={`/lancamentos?plataforma=${p.slug}`} active={platform === p.slug}>
              {p.label.toUpperCase()}
            </Filter>
          ))}
        </nav>
      </div>

      {groups.length === 0 && <p className="border-y border-line py-10 text-lg text-body">Nenhum lançamento previsto para este filtro.</p>}

      {groups.map((g) => (
        <section key={g.month} className="flex flex-col">
          <h2 className="border-t-[6px] border-alert pt-3 pb-2 font-display text-4xl uppercase leading-none">{g.month}</h2>
          <ol>
            {g.items.map((r) => (
              <li key={r.game.slug}>
                <Link to={`/jogos/${r.game.slug}`} className="group flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-line-soft py-5">
                  <span className="w-28 shrink-0 font-display text-6xl leading-[0.9] text-alert">{r.day}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-mono text-xs font-semibold text-muted">{r.weekday.toUpperCase()}</span>
                    <h3 className="font-display text-4xl uppercase leading-none transition-colors group-hover:text-alert">{r.game.name}</h3>
                    <span className="text-sm text-body">{r.game.genres.join(" · ")}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-muted">{r.game.platforms.map((p) => platformLabels[p]).join(" · ").toUpperCase()}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}

function Filter({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cx("border px-3 py-2.5 font-mono text-xs font-semibold", active ? "border-alert bg-alert text-ink" : "border-line hover:border-alert hover:text-alert")}
    >
      {children}
    </Link>
  );
}
