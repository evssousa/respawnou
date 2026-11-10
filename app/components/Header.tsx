import { useEffect, useState } from "react";
import { Form, Link, NavLink, useLocation } from "react-router";
import { NAV, PLATFORMS, SITE } from "~/lib/site";
import { SoonButton, cx } from "./ui";

export function Header({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 py-3 font-mono text-xs font-semibold leading-none text-muted">
        <span>
          <span className="text-alert">●</span> AO VIVO · {today}
        </span>
        <div className="hidden items-center gap-2.5 md:flex">
          <SearchForm id="busca-topo" />
          <SoonButton>LOGIN · EM BREVE</SoonButton>
        </div>
      </div>

      <Link
        to="/"
        aria-label={`${SITE.name} — página inicial`}
        className="block border-t-[6px] border-paper pt-3.5 font-display text-[clamp(64px,13vw,168px)] uppercase leading-[0.8] tracking-[-0.02em] hover:text-paper"
      >
        Respawnou<span className="text-alert">.</span>
      </Link>

      <div className="mt-4 flex items-stretch border-y border-line">
        <nav aria-label="Principal" className="hidden flex-wrap text-sm font-bold uppercase tracking-[0.1em] lg:flex">
          {NAV.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx("px-5 py-4 transition-colors hover:text-alert", i === 0 ? "pl-0" : "border-l border-line", isActive && "text-alert")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-1 font-mono text-xs font-semibold text-muted xl:flex">
          {PLATFORMS.map((p, i) => (
            <span key={p.slug} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>·</span>}
              <NavLink to={`/plataforma/${p.slug}`} className={({ isActive }) => cx("px-1 py-4 hover:text-alert", isActive && "text-alert")}>
                {p.short.toUpperCase()}
              </NavLink>
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          className="flex min-h-12 items-center gap-3 py-3 font-mono text-sm font-semibold lg:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
          </svg>
          MENU
        </button>
      </div>

      {open && (
        <div id="menu-mobile" className="flex flex-col gap-5 border-b border-line py-5 lg:hidden">
          <SearchForm id="busca-mobile" full />
          <nav aria-label="Principal (mobile)" className="grid grid-cols-2 gap-px bg-line">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => cx("bg-ink px-4 py-4 font-display text-2xl uppercase", isActive && "text-alert")}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <Link key={p.slug} to={`/plataforma/${p.slug}`} className="border border-line px-3 py-2.5 font-mono text-xs font-semibold">
                {p.label.toUpperCase()}
              </Link>
            ))}
          </div>
          <SoonButton className="w-full">LOGIN · EM BREVE</SoonButton>
        </div>
      )}
    </header>
  );
}

function SearchForm({ id, full }: { id: string; full?: boolean }) {
  return (
    <Form action="/busca" method="get" role="search" className={cx("flex", full && "w-full")}>
      <label htmlFor={id} className="sr-only">
        Buscar no {SITE.name}
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="BUSCAR"
        className={cx("h-11 border border-[#333] bg-transparent px-3 font-mono text-[13px] text-paper placeholder:text-muted", full ? "flex-1" : "w-48")}
      />
      <button type="submit" aria-label="Buscar" className="flex h-11 w-11 items-center justify-center border border-l-0 border-[#333] hover:bg-alert hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
      </button>
    </Form>
  );
}
