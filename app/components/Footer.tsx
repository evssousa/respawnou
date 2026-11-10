import { Link } from "react-router";
import { NAV, PLATFORMS, SITE } from "~/lib/site";

export function Footer() {
  return (
    <footer className="mx-auto mt-16 max-w-[1280px] px-4 pb-10 sm:px-6">
      <div className="flex flex-wrap gap-10 border-t-[6px] border-paper pt-6">
        <div className="flex max-w-sm flex-[2_1_280px] flex-col gap-3">
          <Link to="/" className="font-display text-4xl uppercase leading-none hover:text-paper">
            Respawnou<span className="text-alert">.</span>
          </Link>
          <p className="text-sm leading-relaxed text-muted">{SITE.description}</p>
        </div>
        <FooterCol title="Editorias" links={NAV} />
        <FooterCol title="Plataformas" links={PLATFORMS.map((p) => ({ to: `/plataforma/${p.slug}`, label: p.label }))} />
        <FooterCol
          title="Respawnou"
          links={[
            { to: "/sobre", label: "Sobre" },
            { to: "/contato", label: "Contato" },
            { to: "/privacidade", label: "Privacidade" },
          ]}
          extra={
            <a href="/rss.xml" className="hover:text-alert">
              RSS
            </a>
          }
        />
      </div>
      <p className="mt-10 font-mono text-xs text-muted">
        © {new Date().getFullYear()} {SITE.name.toUpperCase()} · TODOS OS DIREITOS RESERVADOS · MARCAS CITADAS PERTENCEM AOS SEUS DONOS
      </p>
    </footer>
  );
}

function FooterCol({ title, links, extra }: { title: string; links: { to: string; label: string }[]; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-[1_1_160px] flex-col gap-2.5">
      <h2 className="mb-1 font-mono text-xs font-semibold text-alert">{title.toUpperCase()}</h2>
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="text-sm text-body hover:text-alert">
          {l.label}
        </Link>
      ))}
      {extra && <span className="text-sm text-body">{extra}</span>}
    </div>
  );
}
