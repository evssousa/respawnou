import { useEffect, useState } from "react";
import { Form, Link, NavLink, useLocation } from "react-router";
import { NAV, PLATFORMS, SITE } from "~/lib/site";
import { SoonButton, cx } from "./ui";

export interface HeaderStatus {
  today: string;
  postsToday: number;
  releasesWeek: number;
  freeNow: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="flex items-center gap-3">
      <span className={cx("chs flex items-center justify-center bg-acc", size === "lg" ? "h-12 w-12" : "h-10 w-10")}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#060807" strokeWidth="2.6" aria-hidden>
          <path d="M20 12a8 8 0 1 1-2.3-5.6" />
          <path d="M20 4v5h-5" />
        </svg>
      </span>
      <span className={cx("font-display uppercase leading-[0.9]", size === "lg" ? "text-5xl" : "text-[40px]")}>Respawnou</span>
    </span>
  );
}

export function Header({ status }: { status: HeaderStatus | null }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header>
      {status && (
        <div className="border-b border-line">
          <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-2 px-4 py-2 font-mono text-[11px] font-semibold leading-snug text-muted sm:px-6 md:grid-cols-5">
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
            <span className="col-span-2 md:col-span-1 md:text-right">{status.today}</span>
          </div>
        </div>
      )}

      <div className="border-b border-line">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-7 gap-y-3 px-4 py-4 sm:px-6">
          <Link to="/" aria-label={`${SITE.name} — página inicial`} className="hover:text-paper">
            <Logo />
          </Link>

          <nav aria-label="Principal" className="hidden flex-1 flex-wrap gap-1 font-mono text-xs font-bold uppercase lg:flex">
            {NAV.map((item, i) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cx("chs px-3 py-3.5 transition-colors", isActive ? "bg-acc text-ink" : "hover:text-acc")}
              >
                {pad(i + 1)} {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            className="chs ml-auto flex min-h-11 items-center gap-2.5 bg-ink-3 px-3.5 font-mono text-xs font-bold text-acc lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
            </svg>
            MENU
          </button>
        </div>

        <div className="mx-auto hidden max-w-[1280px] items-center gap-2 px-4 pb-3 font-mono text-[11px] font-semibold text-muted sm:px-6 lg:flex">
          <span>PLATAFORMA:</span>
          {PLATFORMS.map((p) => (
            <NavLink key={p.slug} to={`/plataforma/${p.slug}`} className={({ isActive }) => cx("px-1.5 py-1 hover:text-acc", isActive && "text-acc")}>
              {p.label.toUpperCase()}
            </NavLink>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <SearchForm id="busca-topo" />
            <SoonButton>OPERADOR · EM BREVE</SoonButton>
          </div>
        </div>
      </div>

      {open && (
        <div id="menu-mobile" className="border-b border-line lg:hidden">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-5 sm:px-6">
            <SearchForm id="busca-mobile" full />
            <nav aria-label="Principal (mobile)" className="grid grid-cols-2 gap-2">
              {NAV.map((item, i) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cx("ch flex flex-col gap-1 px-4 py-4", isActive ? "bg-acc text-ink" : "bg-ink-3")}
                >
                  <span className="font-mono text-[10px] font-bold opacity-70">MÓDULO {pad(i + 1)}</span>
                  <span className="font-display text-2xl uppercase leading-none">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <Link key={p.slug} to={`/plataforma/${p.slug}`} className="chs bg-ink-3 px-3 py-2.5 font-mono text-xs font-semibold text-acc">
                  {p.label.toUpperCase()}
                </Link>
              ))}
            </div>
            <SoonButton className="w-full">OPERADOR · EM BREVE</SoonButton>
          </div>
        </div>
      )}
    </header>
  );
}

function SearchForm({ id, full }: { id: string; full?: boolean }) {
  return (
    <Form action="/busca" method="get" role="search" className={cx("chs flex bg-ink-3", full && "w-full")}>
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
        placeholder="comando: buscar"
        className={cx("h-11 bg-transparent px-2 font-mono text-[13px] text-acc placeholder:text-muted focus:outline-none", full ? "flex-1" : "w-44")}
      />
      <button type="submit" aria-label="Buscar" className="flex h-11 w-11 items-center justify-center text-acc hover:bg-acc hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
      </button>
    </Form>
  );
}
