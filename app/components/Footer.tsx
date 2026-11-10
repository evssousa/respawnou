import { Link } from "react-router";
import { NAV, PLATFORMS, SITE } from "~/lib/site";
import { Logo } from "./Header";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-[1280px] flex-wrap gap-10 px-4 pt-10 sm:px-6">
        <div className="flex max-w-sm flex-[2_1_280px] flex-col gap-4">
          <Link to="/" aria-label={`${SITE.name} — página inicial`} className="hover:text-paper">
            <Logo />
          </Link>
          <p className="text-sm leading-relaxed text-muted">{SITE.description}</p>
        </div>
        <FooterCol title="Módulos" links={NAV} />
        <FooterCol title="Plataformas" links={PLATFORMS.map((p) => ({ to: `/plataforma/${p.slug}`, label: p.label }))} />
        <FooterCol
          title="Base"
          links={[
            { to: "/sobre", label: "Sobre" },
            { to: "/contato", label: "Contato" },
            { to: "/privacidade", label: "Privacidade" },
          ]}
          extra={
            <a href="/rss.xml" className="text-sm text-body hover:text-acc">
              RSS
            </a>
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
    <div className="flex flex-[1_1_160px] flex-col gap-2.5">
      <h2 className="mb-1 font-mono text-xs font-bold text-acc">&gt; {title.toUpperCase()}</h2>
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="text-sm text-body hover:text-acc">
          {l.label}
        </Link>
      ))}
      {extra}
    </div>
  );
}
