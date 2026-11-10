import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { formatDate } from "~/lib/format";
import { DOC_PAGES, docPage } from "~/lib/site";
import { SectionTitle, cx } from "./ui";

/** Uma seção do documento: vira um <h2> com âncora e um item do índice. */
export interface DocSection {
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * Layout das páginas institucionais (sobre, contato, termos, privacidade...).
 * Cabeçalho com código do documento, índice das seções (fixo no desktop,
 * recolhível no celular) e navegação entre os documentos.
 */
export function StaticPage({
  path,
  title,
  accent,
  lead,
  sections = [],
  children,
  after,
}: {
  /** Caminho da página em DOC_PAGES, ex.: "/termos". */
  path: string;
  title: string;
  accent?: string;
  lead?: string;
  sections?: DocSection[];
  /** Blocos visuais antes das seções (cards, tabelas, acordeões...). */
  children?: ReactNode;
  /** Blocos visuais depois das seções. */
  after?: ReactNode;
}) {
  const doc = docPage(path);
  const index = DOC_PAGES.findIndex((d) => d.to === path);
  const code = `DOC ${String(index + 1).padStart(2, "0")} // ${doc?.group === "legal" ? "LEGAL" : "INSTITUCIONAL"}`;
  const showToc = sections.length > 2;

  return (
    <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pt-10 sm:px-6">
      <header className="flex flex-col gap-5 border-b border-line pb-8">
        <SectionTitle as="h1" size="xl" accent={accent} code={code}>
          {title}
        </SectionTitle>
        {lead && <p className="max-w-3xl text-lg leading-relaxed text-body sm:text-xl">{lead}</p>}
        {doc && (
          <p className="font-mono text-[11px] font-semibold text-muted">
            ÚLTIMA ATUALIZAÇÃO <time dateTime={doc.updated} className="text-paper">{formatDate(doc.updated).toUpperCase()}</time>
          </p>
        )}
      </header>

      <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14">
        <div className="flex min-w-0 flex-col gap-8">
          {showToc && (
            <details className="ch bg-ink-2 lg:hidden">
              <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 font-mono text-xs font-bold text-acc">
                &gt; NESTA PÁGINA ({sections.length})
                <span aria-hidden>▾</span>
              </summary>
              <Toc sections={sections} />
            </details>
          )}

          {children}

          {sections.length > 0 && (
            <div className="article-body max-w-[720px]">
              {sections.map((s, i) => (
                <section key={s.id} aria-labelledby={s.id}>
                  <h2 id={s.id}>
                    <span aria-hidden className="mr-3 font-mono text-base text-acc">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.title}
                  </h2>
                  {s.body}
                </section>
              ))}
            </div>
          )}

          {after}
        </div>

        <aside className="hidden flex-col gap-8 lg:sticky lg:flex lg:top-[100px] lg:self-start">
          {showToc && (
            <nav aria-label="Nesta página" className="hidden lg:block">
              <p className="mb-2 font-mono text-xs font-bold text-acc">&gt; NESTA PÁGINA</p>
              <Toc sections={sections} />
            </nav>
          )}
          <DocNav />
        </aside>
      </div>
    </main>
  );
}

function Toc({ sections }: { sections: DocSection[] }) {
  return (
    <ol className="flex flex-col border-t border-line lg:border-t-0 lg:border-l">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="flex gap-3 px-4 py-2.5 text-sm text-body hover:text-acc lg:py-1.5">
            <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** Lista de todos os documentos institucionais, com o atual destacado. */
function DocNav() {
  const groups = [
    { key: "site", label: "INSTITUCIONAL" },
    { key: "legal", label: "LEGAL" },
  ] as const;
  return (
    <nav aria-label="Documentos" className="ch flex flex-col gap-5 bg-ink-2 p-5">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col">
          <p className="mb-1 font-mono text-xs font-bold text-acc">&gt; {g.label}</p>
          {DOC_PAGES.filter((d) => d.group === g.key).map((d) => (
            <NavLink
              key={d.to}
              to={d.to}
              className={({ isActive }) =>
                cx("-mx-2 flex min-h-11 items-center justify-between px-2 text-sm lg:min-h-9", isActive ? "text-acc" : "text-body hover:text-paper")
              }
            >
              {({ isActive }) => (
                <>
                  {d.label}
                  {isActive && <span className="font-mono text-[11px] font-bold">◄ AQUI</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
      <Link to="/contato" className="chs flex h-11 items-center justify-center bg-acc font-mono text-xs font-bold text-ink hover:bg-paper">
        FALAR COM A EQUIPE →
      </Link>
    </nav>
  );
}

/** Card de canal/atalho usado em contato, anuncie e sobre. */
export function ChannelCard({ code, title, children, href, cta }: { code: string; title: string; children: ReactNode; href: string; cta: string }) {
  const external = href.startsWith("mailto:") || href.startsWith("http");
  const cls = "group ch flex h-full flex-col gap-3 bg-ink-2 p-5 transition-colors hover:bg-ink-3";
  const inner = (
    <>
      <span className="font-mono text-[11px] font-bold text-muted">{code}</span>
      <span className="font-display text-[26px] uppercase leading-none text-paper group-hover:text-acc">{title}</span>
      <span className="text-[15px] leading-relaxed text-body">{children}</span>
      <span className="mt-auto pt-2 font-mono text-xs font-bold text-acc">{cta} →</span>
    </>
  );
  return external ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <Link to={href} className={cls}>
      {inner}
    </Link>
  );
}

/** Link no corpo do texto, no padrão visual das páginas institucionais. */
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  const cls = "text-paper underline decoration-acc underline-offset-4 hover:text-acc";
  return to.startsWith("mailto:") || to.startsWith("http") ? (
    <a href={to} className={cls}>
      {children}
    </a>
  ) : (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}
