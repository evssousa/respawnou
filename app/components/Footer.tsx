import { Link, useRouteLoaderData } from "react-router";
import { CookiePrefsButton } from "./CookieConsent";
import { navFor, platformsFor, useAvailability } from "~/lib/availability";
import { DOC_PAGES, SITE } from "~/lib/site";
import { Logo } from "./Header";

export function Footer() {
  const available = useAvailability();
  const ads = Boolean((useRouteLoaderData("root") as { adsClient?: string | null } | undefined)?.adsClient);
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-x-6 gap-y-8 px-4 pt-10 sm:px-6 md:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex max-w-sm flex-col gap-4 md:col-span-4 lg:col-span-1">
          <Link to="/" aria-label={`${SITE.name} — página inicial`} className="py-1 hover:text-paper">
            <Logo />
          </Link>
          <p className="text-sm leading-relaxed text-muted">{SITE.description}</p>
        </div>
        <FooterCol title="Módulos" links={navFor(available)} />
        <FooterCol title="Plataformas" links={platformsFor(available).map((p) => ({ to: `/plataforma/${p.slug}`, label: p.label }))} />
        <FooterCol title="Institucional" links={DOC_PAGES.filter((d) => d.group === "site")} />
        <FooterCol
          title="Legal"
          links={DOC_PAGES.filter((d) => d.group === "legal")}
          extra={
            <>
              {ads && <CookiePrefsButton className="py-2.5 text-left text-sm text-body hover:text-acc md:py-1.5" />}
              <a href="/rss.xml" className="py-2.5 text-sm text-body hover:text-acc md:py-1.5">
                Feed RSS
              </a>
            </>
          }
        />
      </div>
      <p className="mx-auto mt-10 max-w-[1280px] border-t border-line px-4 py-6 font-mono text-[11px] text-muted sm:px-6">
        © {new Date().getFullYear()} {SITE.name.toUpperCase()} // CENTRAL DE COMANDO · MARCAS CITADAS PERTENCEM AOS SEUS DONOS
      </p>
    </footer>
  );
}

function FooterCol({ title, links, extra }: { title: string; links: { to: string; label: string }[]; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <h2 className="mb-1 font-mono text-xs font-bold text-acc md:mb-2">&gt; {title.toUpperCase()}</h2>
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="py-2.5 text-sm text-body hover:text-acc md:py-1.5">
          {l.label}
        </Link>
      ))}
      {extra}
    </div>
  );
}
