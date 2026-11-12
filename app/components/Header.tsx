import { useEffect, useState } from "react";
import { Form, Link, NavLink, useLocation } from "react-router";
import { navFor, platformsFor, useAvailability } from "~/lib/availability";
import { SITE } from "~/lib/site";
import { cx } from "./ui";

export interface HeaderStatus {
  today: string;
  postsToday: number;
  releasesWeek: number;
  freeNow: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 sm:gap-3">
      <span className="chs flex h-9 w-9 shrink-0 items-center justify-center bg-acc sm:h-10 sm:w-10">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#060807" strokeWidth="2.6" aria-hidden>
          <path d="M20 12a8 8 0 1 1-2.3-5.6" />
          <path d="M20 4v5h-5" />
        </svg>
      </span>
      <span className={cx("font-display uppercase leading-[0.9]", compact ? "text-[30px] sm:text-[40px]" : "text-[40px]")}>Respawnou</span>
    </span>
  );
}

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </svg>
);

/** Barra de status (rola junto com a página). */
export function StatusBar({ status }: { status: HeaderStatus | null }) {
  if (!status) return null;
  return (
    <div className="border-b border-line">
      <div className="mx-auto flex max-w-[1280px] justify-between gap-4 px-4 py-2 font-mono text-[11px] font-semibold leading-snug text-muted sm:px-6">
        <span>
          STATUS <span className="text-acc">■ ONLINE</span>
        </span>
        <span>
          POSTS HOJE <span className="text-paper">{pad(status.postsToday)}</span>
        </span>
        <span className="hidden md:block">
          LANÇAMENTOS <span className="text-paper">{pad(status.releasesWeek)} NA SEMANA</span>
        </span>
        <span className="hidden md:block">
          GRÁTIS AGORA <span className="text-paper">{pad(status.freeNow)}</span>
        </span>
        <span className="hidden sm:block">{status.today}</span>
      </div>
    </div>
  );
}

/** Cabeçalho fixo no topo: logo, menu e busca. O painel admin fica em /admin, fora da navegação. */
export function Header() {
  const [open, setOpen] = useState(false);
  const available = useAvailability();
  const nav = navFor(available);
  const platforms = platformsFor(available);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const iconBtn = "chs flex h-11 w-11 shrink-0 items-center justify-center bg-ink-3 text-acc";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/85">
      <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 py-3 sm:px-6 lg:gap-6">
        <Link to="/" aria-label={`${SITE.name} — página inicial`} className="mr-auto py-1 hover:text-paper lg:mr-0">
          <Logo compact />
        </Link>

        <nav aria-label="Principal" className="hidden flex-1 gap-0.5 font-mono text-xs font-bold uppercase lg:flex">
          {nav.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cx("chs px-2.5 py-3.5 whitespace-nowrap transition-colors", isActive ? "bg-acc text-ink" : "hover:text-acc")}
            >
              <span className="hidden opacity-60 xl:inline">{pad(i + 1)} </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <SearchForm id="busca-topo" className="hidden xl:flex" />
        <Link to="/busca" aria-label="Buscar" className={cx(iconBtn, "hover:bg-acc hover:text-ink xl:hidden")}>
          <SearchIcon />
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          className="chs flex h-11 items-center gap-2.5 bg-ink-3 px-3.5 font-mono text-xs font-bold text-acc lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
          </svg>
          {open ? "FECHAR" : "MENU"}
        </button>
      </div>

      {open && (
        <div id="menu-mobile" className="h-[calc(100dvh-68px)] overflow-y-auto overscroll-contain border-t border-line bg-ink lg:hidden">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-5 sm:px-6">
            <SearchForm id="busca-mobile" className="flex w-full" />
            <nav aria-label="Principal (mobile)" className="grid grid-cols-2 gap-2">
              {nav.map((item, i) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cx("ch flex flex-col gap-1 px-4 py-4", isActive ? "bg-acc text-ink" : "bg-ink-3")}
                >
                  <span className="font-mono text-[11px] font-bold opacity-70">MÓDULO {pad(i + 1)}</span>
                  <span className="font-display text-2xl uppercase leading-none">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <p className="font-mono text-[11px] font-bold text-muted">&gt; PLATAFORMAS</p>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <Link key={p.slug} to={`/plataforma/${p.slug}`} className="chs flex min-h-11 items-center bg-ink-3 px-3.5 font-mono text-xs font-semibold text-acc">
                  {p.label.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/** Atalhos de plataforma (desktop), logo abaixo do cabeçalho fixo. */
export function PlatformBar() {
  const platforms = platformsFor(useAvailability());
  return (
    <nav aria-label="Plataformas" className="hidden border-b border-line lg:block">
      <div className="mx-auto flex max-w-[1280px] items-center gap-1 px-6 font-mono text-[11px] font-semibold text-muted">
        <span className="mr-1">PLATAFORMA:</span>
        {platforms.map((p) => (
          <NavLink key={p.slug} to={`/plataforma/${p.slug}`} className={({ isActive }) => cx("px-2 py-2.5 hover:text-acc", isActive && "text-acc")}>
            {p.label.toUpperCase()}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function SearchForm({ id, className }: { id: string; className?: string }) {
  return (
    <Form
      action="/busca"
      method="get"
      role="search"
      className={cx("chs bg-ink-3 focus-within:shadow-[inset_0_0_0_2px_var(--color-acc)]", className)}
    >
      <label htmlFor={id} className="sr-only">
        Buscar no {SITE.name}
      </label>
      <span aria-hidden className="flex items-center pl-3.5 font-mono text-sm text-acc">
        &gt;
      </span>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="buscar"
        className="h-11 min-w-0 flex-1 bg-transparent px-2 font-mono text-[13px] text-acc placeholder:text-muted focus:outline-none xl:w-44"
      />
      <button type="submit" aria-label="Buscar" className="flex h-11 w-11 shrink-0 items-center justify-center text-acc hover:bg-acc hover:text-ink">
        <SearchIcon />
      </button>
    </Form>
  );
}
