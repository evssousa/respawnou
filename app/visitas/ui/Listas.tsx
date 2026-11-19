// Cartões de detalhe do painel: páginas mais vistas, de onde vêm e aparelho/navegador/sistema.
import { Link } from "react-router";
import { ChevronDown, ExternalLink, Monitor, Smartphone, Tablet } from "./icones";
import { VISITAS } from "../config";
import type { Dimensoes, PaginaVista } from "../server/consultas.server";

const fmt = new Intl.NumberFormat("pt-BR");
const pct = (n: number, de: number) => (de > 0 ? Math.round((n / de) * 100) : 0);
const card = "rounded-[14px] border border-[var(--vp-line)] bg-[var(--vp-card)] p-4 sm:p-5";

/* ---------- páginas mais vistas ---------- */

export function Paginas({ itens, filtro, periodo, mais, total }: { itens: PaginaVista[]; filtro: string; periodo: string; mais: boolean; total: number }) {
  const href = (extra: Record<string, string>) => {
    const q = new URLSearchParams({ p: periodo, ...(filtro !== "tudo" ? { tipo: filtro } : {}), ...(mais ? { mais: "1" } : {}), ...extra });
    for (const [k, v] of [...q]) if (v === "") q.delete(k);
    return `/admin/visitas?${q.toString()}`;
  };
  const maior = Math.max(...itens.map((i) => i.views), 1);
  return (
    <section aria-labelledby="vp-paginas" className={card}>
      <h2 id="vp-paginas" className="text-base font-bold">
        Páginas mais vistas
      </h2>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {VISITAS.filtros.map((f) => (
          <Link
            key={f.id}
            to={href({ tipo: f.id === "tudo" ? "" : f.id, mais: "" })}
            preventScrollReset
            aria-current={f.id === filtro ? "true" : undefined}
            className={`inline-flex h-11 shrink-0 items-center rounded-full border px-3 text-[0.78rem] font-semibold sm:h-8 ${f.id === filtro ? "border-[var(--vp-accent)] bg-[var(--vp-accent-soft)] text-[var(--vp-accent)]" : "border-[var(--vp-line)] text-[var(--vp-soft)] hover:text-[var(--vp-ink)]"}`}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>
      {itens.length === 0 ? (
        <p className="mt-4 text-[0.9rem] text-[var(--vp-soft)]">Nenhuma visita neste período.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-1">
          {itens.map((p, k) => (
            <li key={p.path} className="group relative">
              <span aria-hidden className="absolute inset-y-0 left-0 rounded-[10px] bg-[var(--vp-accent-soft)]" style={{ width: `${(p.views / maior) * 100}%` }} />
              <a href={p.path} target="_blank" rel="noreferrer" className="relative grid min-h-[52px] grid-cols-[28px_1fr_auto] items-center gap-2 rounded-[10px] px-3 py-1.5 hover:bg-[var(--vp-sunken)]/60">
                <span className="text-[0.8rem] font-extrabold text-[var(--vp-soft)] tabular-nums">{k + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[0.88rem] font-semibold">{p.titulo ?? p.path} {!p.titulo && <span className="font-normal text-[var(--vp-soft)]">(sem título)</span>}</span>
                  <span className="block truncate text-[0.75rem] text-[var(--vp-soft)]">
                    {filtro === "tudo" && <span className="font-bold tracking-wide uppercase">{p.rotulo} · </span>}
                    {p.path}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-right">
                  <ExternalLink className="size-3.5 text-[var(--vp-soft)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                  <span>
                    <span className="block text-[0.88rem] font-bold tabular-nums">{fmt.format(p.views)}</span>
                    <span className="block text-[0.75rem] text-[var(--vp-soft)] tabular-nums">{p.pct < 1 ? "<1" : Math.round(p.pct)}%</span>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
      {(itens.length >= 10 || mais) && (
        <Link to={href({ mais: mais ? "" : "1" })} preventScrollReset className="mt-3 inline-block text-[0.82rem] font-semibold text-[var(--vp-accent)]">
          {mais ? "Mostrar 10" : "Mostrar 25"}
        </Link>
      )}
      <p className="sr-only">Total de páginas vistas neste filtro: {fmt.format(total)}</p>
    </section>
  );
}

/* ---------- de onde vêm ---------- */

const ORIGENS = [
  { id: "direto", rotulo: "Direto", sub: null },
  { id: "busca", rotulo: "Busca", sub: "ref_busca" },
  { id: "social", rotulo: "Redes sociais", sub: "ref_social" },
  { id: "site", rotulo: "Outros sites", sub: "ref_site" },
  { id: "campanha", rotulo: "Campanhas (UTM)", sub: "campanha" },
] as const;

export function Origem({ dims, resumo }: { dims: Dimensoes; resumo: { paginas: number; entradas: number; paginasPorVisita: number | null } }) {
  const por = new Map((dims.origem ?? []).map((d) => [d.valor, d.n]));
  const total = [...por.values()].reduce((a, b) => a + b, 0);
  const internas = Math.max(0, resumo.paginas - resumo.entradas);
  return (
    <section aria-labelledby="vp-origem" className={card}>
      <h2 id="vp-origem" className="text-base font-bold">
        De onde vêm
      </h2>
      <p className="text-[0.75rem] text-[var(--vp-soft)]">por visita (primeira página aberta)</p>
      {total === 0 ? (
        <p className="mt-4 text-[0.9rem] text-[var(--vp-soft)]">Nenhuma visita neste período.</p>
      ) : (
        <>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[var(--vp-card)]" role="img" aria-label={ORIGENS.map((o) => `${o.rotulo} ${pct(por.get(o.id) ?? 0, total)}%`).join(", ")}>
            {ORIGENS.map((o) => {
              const w = ((por.get(o.id) ?? 0) / total) * 100;
              return w >= 1 ? <span key={o.id} className="mr-0.5 last:mr-0" style={{ width: `${w}%`, background: `var(--vp-o-${o.id})` }} /> : null;
            })}
          </div>
          <ul className="mt-3 flex flex-col">
            {ORIGENS.map((o) => {
              const n = por.get(o.id) ?? 0;
              const subs = o.sub ? (dims[o.sub] ?? []).slice(0, 8) : [];
              const linha = (
                <span className="flex w-full items-center gap-2 py-2 text-[0.88rem]">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: `var(--vp-o-${o.id})` }} />
                  <span className="font-semibold">{o.rotulo}</span>
                  <span className="ml-auto font-bold tabular-nums">{fmt.format(n)}</span>
                  <span className="w-10 text-right text-[0.78rem] text-[var(--vp-soft)] tabular-nums">{pct(n, total)}%</span>
                  {o.sub && n > 0 ? <ChevronDown className="size-3.5 text-[var(--vp-soft)] transition-transform group-open:rotate-180" aria-hidden /> : <span className="size-3.5" aria-hidden />}
                </span>
              );
              return (
                <li key={o.id} className={n === 0 ? "opacity-50" : ""}>
                  {subs.length && n > 0 ? (
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden">{linha}</summary>
                      <ul className="mb-2 ml-5 flex flex-col gap-1 border-l border-[var(--vp-line)] pl-3 text-[0.8rem]">
                        {subs.map((s) => (
                          <li key={s.valor} className="flex items-center justify-between gap-2">
                            <span className="truncate">{s.valor}</span>
                            <span className="tabular-nums text-[var(--vp-soft)]">
                              {fmt.format(s.n)} · {pct(s.n, n)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    linha
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-3 border-t border-[var(--vp-line)] pt-3 text-[0.8rem] text-[var(--vp-soft)]">
        Navegação dentro do site: {fmt.format(internas)} páginas{resumo.paginasPorVisita != null ? ` · ${resumo.paginasPorVisita.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} páginas por visita` : ""}
      </p>
    </section>
  );
}

/* ---------- aparelho, navegador, sistema ---------- */

const ICONES: Record<string, typeof Smartphone> = { celular: Smartphone, computador: Monitor, tablet: Tablet };

export function Dimensao({ titulo, itens, icones, preenchimento }: { titulo: string; itens: { valor: string; n: number }[]; icones?: boolean; preenchimento: string }) {
  const total = itens.reduce((a, i) => a + i.n, 0);
  const topo = itens.slice(0, 5);
  const outros = itens.slice(5).reduce((a, i) => a + i.n, 0);
  const linhas = outros > 0 ? [...topo, { valor: "Outros", n: outros }] : topo;
  return (
    <section aria-label={titulo} className={card}>
      <h2 className="text-base font-bold">{titulo}</h2>
      {total === 0 ? (
        <p className="mt-3 text-[0.9rem] text-[var(--vp-soft)]">Nenhuma visita neste período.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {linhas.map((i) => {
            const Icon = icones ? ICONES[i.valor] : undefined;
            const p = pct(i.n, total);
            return (
              <li key={i.valor}>
                <div className="flex items-center gap-2 text-[0.88rem]">
                  {Icon && <Icon className="size-4 text-[var(--vp-soft)]" aria-hidden />}
                  <span className="capitalize">{i.valor}</span>
                  <span className="ml-auto font-bold tabular-nums">{p}%</span>
                  <span className="w-12 text-right text-[0.75rem] text-[var(--vp-soft)] tabular-nums">{fmt.format(i.n)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[var(--vp-sunken)]" role="presentation">
                  <div className="h-full rounded-full" style={{ width: `${p}%`, background: preenchimento }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
