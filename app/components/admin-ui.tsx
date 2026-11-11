// Peças visuais do painel /admin (tema "Central de Comando", versão compacta para trabalho).
import type { ReactNode } from "react";
import { Form, NavLink } from "react-router";
import { cx } from "./ui";

export const adminMeta = (title: string) => [{ title: `${title} · Painel Respawnou` }, { name: "robots", content: "noindex, nofollow" }];

const NAV = [
  { to: "/admin", label: "Painel", end: true },
  { to: "/admin/materias", label: "Matérias" },
  { to: "/admin/fila", label: "Fila" },
  { to: "/admin/fontes", label: "Fontes" },
  { to: "/admin/robo", label: "Robô" },
  { to: "/admin/config", label: "Config." },
];

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-ink-2">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <a href="/" className="font-display text-2xl uppercase leading-none text-paper hover:text-acc" title="Ver o site">
            Respawnou<span className="text-acc">.</span>
            <span className="ml-2 align-middle font-mono text-xs font-bold text-acc">ADMIN</span>
          </a>
          <nav aria-label="Painel" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cx("whitespace-nowrap px-3 py-2 font-mono text-xs font-bold uppercase", isActive ? "bg-acc text-ink" : "text-body hover:text-acc")
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <Form method="post" action="/admin/sair" className="ml-auto flex items-center gap-3">
            <span className="hidden font-mono text-xs text-muted md:inline">{email}</span>
            <button className="font-mono text-xs font-bold text-body hover:text-warn">SAIR</button>
          </Form>
        </div>
      </header>
      <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}

export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="font-display text-4xl uppercase leading-none">{children}</h1>
      {aside}
    </div>
  );
}

export function Card({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("border border-line bg-ink-2 p-4", className)}>
      {title && <h2 className="mb-3 font-mono text-xs font-bold uppercase text-acc">&gt; {title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "warn" }) {
  return (
    <div className="border border-line bg-ink-2 p-4">
      <p className="font-mono text-xs uppercase text-muted">{label}</p>
      <p className={cx("mt-1 font-display text-4xl leading-none", tone === "warn" ? "text-warn" : "text-paper")}>{value}</p>
    </div>
  );
}

const PILL: Record<string, string> = {
  ok: "bg-acc/15 text-acc",
  published: "bg-acc/15 text-acc",
  used: "bg-acc/15 text-acc",
  new: "bg-paper/10 text-paper",
  running: "bg-paper/10 text-paper",
  draft: "bg-paper/10 text-paper",
  skipped: "bg-line text-muted",
  archived: "bg-line text-muted",
  error: "bg-warn/15 text-warn",
  failed: "bg-warn/15 text-warn",
};

const PILL_LABEL: Record<string, string> = {
  ok: "ok",
  published: "publicada",
  used: "usada",
  new: "na fila",
  running: "rodando",
  draft: "rascunho",
  skipped: "descartada",
  archived: "arquivada",
  error: "erro",
  failed: "reprovada",
};

export function Pill({ status }: { status: string }) {
  return <span className={cx("inline-block whitespace-nowrap px-2 py-0.5 font-mono text-[11px] font-bold uppercase", PILL[status] ?? "bg-line text-muted")}>{PILL_LABEL[status] ?? status}</span>;
}

export function Button({
  children,
  tone = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "default" | "danger" }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 px-4 font-mono text-xs font-bold uppercase disabled:opacity-50",
        tone === "primary" && "bg-acc text-ink hover:bg-paper",
        tone === "default" && "border border-line-soft text-paper hover:border-acc hover:text-acc",
        tone === "danger" && "border border-warn/50 text-warn hover:bg-warn hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-xs font-bold uppercase text-body">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full border border-line-soft bg-ink px-3 py-2 text-paper placeholder:text-muted focus:border-acc focus:outline-none";

export function Notice({ tone = "ok", children }: { tone?: "ok" | "warn"; children: ReactNode }) {
  return <p className={cx("border-l-4 bg-ink-2 px-4 py-3 text-sm", tone === "ok" ? "border-acc text-paper" : "border-warn text-warn")}>{children}</p>;
}

/** Data/hora curta no fuso de Brasília. */
export function when(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
