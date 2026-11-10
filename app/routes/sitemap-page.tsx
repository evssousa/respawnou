import { Link } from "react-router";
import { StaticPage } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { DOC_PAGES, PLATFORMS, SECTIONS, SITE } from "~/lib/site";

export const meta = () => seo({ title: "Mapa do site", description: `Todas as seções e páginas do ${SITE.name} num lugar só.`, path: "/mapa-do-site" });

const GROUPS = [
  {
    title: "Conteúdo",
    links: [{ to: "/", label: "Página inicial" }, ...SECTIONS.map((s) => ({ to: `/${s.slug}`, label: s.label })), { to: "/lancamentos", label: "Lançamentos" }],
  },
  { title: "Plataformas", links: PLATFORMS.map((p) => ({ to: `/plataforma/${p.slug}`, label: p.label })) },
  { title: "Institucional", links: DOC_PAGES.filter((d) => d.group === "site") },
  { title: "Legal", links: DOC_PAGES.filter((d) => d.group === "legal" && d.to !== "/mapa-do-site") },
  {
    title: "Ferramentas",
    links: [
      { to: "/busca", label: "Busca" },
      { to: "/rss.xml", label: "Feed RSS", doc: true },
      { to: "/sitemap.xml", label: "Sitemap XML", doc: true },
    ],
  },
];

export default function SitemapPage() {
  return (
    <StaticPage path="/mapa-do-site" title="Mapa do" accent="site" lead={`Todas as seções e páginas do ${SITE.name} num lugar só.`}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {GROUPS.map((g) => (
          <section key={g.title} aria-labelledby={`mapa-${g.title}`} className="ch flex flex-col bg-ink-2 p-5">
            <h2 id={`mapa-${g.title}`} className="mb-2 font-display text-[26px] uppercase leading-none text-paper">
              {g.title}
            </h2>
            <ul className="flex flex-col">
              {g.links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    reloadDocument={"doc" in l && l.doc}
                    className="-mx-2 flex min-h-11 items-center justify-between gap-3 px-2 text-[15px] text-body hover:text-acc"
                  >
                    {l.label}
                    <span aria-hidden className="font-mono text-xs text-muted">
                      {l.to}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </StaticPage>
  );
}
