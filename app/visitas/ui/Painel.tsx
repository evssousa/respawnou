// Tela do painel de visitas: título, cartões de números, gráfico de 30 dias e detalhes do período.
import { Link, useNavigation } from "react-router";
import { BarChart3 } from "./icones";
import type { Periodo } from "../core/dia";
import type { Cartao, Cartoes, Dimensoes, PaginaVista, PontoDia } from "../server/consultas.server";
import { Grafico } from "./Grafico";
import { Dimensao, Origem, Paginas } from "./Listas";

const fmt = new Intl.NumberFormat("pt-BR");

export type DadosPainel = {
  hoje: string;
  hora: string;
  desde: string | null;
  agora: number;
  periodo: Periodo;
  filtro: string;
  mais: boolean;
  cartoes: Cartoes;
  serie: PontoDia[];
  paginas: { itens: PaginaVista[]; total: number };
  dims: Dimensoes;
  resumo: { robos: number; paginas: number; entradas: number; paginasPorVisita: number | null };
};

const card = "rounded-[14px] border border-[var(--vp-line)] bg-[var(--vp-card)] p-4 sm:p-5 shadow-[0_1px_2px_rgba(28,20,20,.06)] dark:shadow-none";

function Variacao({ v, base }: { v: number | null; base: string }) {
  if (v == null) return <span className="text-[0.8rem] text-[var(--vp-soft)]">—</span>;
  const sobe = v >= 0;
  return (
    <span className={`text-[0.8rem] font-bold tabular-nums ${sobe ? "text-[var(--vp-up)]" : "text-[var(--vp-down)]"}`} aria-label={`${Math.abs(v)}% ${sobe ? "a mais" : "a menos"} que ${base}`}>
      {sobe ? "▲" : "▼"} {Math.abs(v)}%
    </span>
  );
}

function CartaoNumero({ rotulo, c, base, visitantes }: { rotulo: string; c: Cartao; base: string; visitantes: string }) {
  return (
    <div className={card}>
      <p className="text-[0.7rem] font-bold tracking-[0.08em] text-[var(--vp-soft)] uppercase">{rotulo}</p>
      <p className="mt-1 text-[2rem] leading-tight font-extrabold tabular-nums">{fmt.format(c.pageviews)}</p>
      <p className="mt-1 text-[0.8rem] text-[var(--vp-soft)] tabular-nums">{visitantes}</p>
      <div className="mt-1">
        <Variacao v={c.variacao} base={base} />
      </div>
    </div>
  );
}

const PERIODOS: { id: Periodo; rotulo: string }[] = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "7d", rotulo: "7 dias" },
  { id: "30d", rotulo: "30 dias" },
];

export function Painel({ d }: { d: DadosPainel }) {
  const ocupado = useNavigation().state !== "idle";
  const { cartoes: c } = d;
  const vazio = c.total.pageviews === 0;
  const desde = d.desde ? `${d.desde.slice(8, 10)}/${d.desde.slice(5, 7)}/${d.desde.slice(0, 4)}` : null;
  const href = (p: Periodo) => `/admin/visitas?${new URLSearchParams({ p, ...(d.filtro !== "tudo" ? { tipo: d.filtro } : {}) }).toString()}`;
  return (
    <div className="vp flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.02em]">Visitas</h1>
          <p className="mt-1 text-[0.88rem] text-[var(--vp-soft)]">Contagem própria, sem cookies · horário de Brasília · atualizado às {d.hora}</p>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full border border-[var(--vp-line)] bg-[var(--vp-card)] px-3 py-1.5 text-[0.8rem] font-semibold" title="Pessoas diferentes nos últimos 5 minutos (aproximado)">
          <span aria-hidden className="vp-pulso size-2 rounded-full bg-[#4cc98f]" />
          Agora: {fmt.format(d.agora)} <span className="font-normal text-[var(--vp-soft)]">(aprox.)</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 lg:grid-cols-5">
        <div className="col-span-2 rounded-[14px] bg-[var(--vp-hero)] p-4 text-[var(--vp-hero-ink)] sm:col-span-6 sm:p-5 lg:col-span-1">
          <p className="text-[0.7rem] font-bold tracking-[0.08em] text-[var(--vp-hero-label)] uppercase">Hoje</p>
          <p className="mt-1 text-[2.75rem] leading-none font-extrabold tabular-nums">{fmt.format(c.hoje.pageviews)}</p>
          <p className="mt-2 text-[0.8rem] opacity-70 tabular-nums">
            {fmt.format(c.hoje.visitantes)} visitantes · até {d.hora}
          </p>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <CartaoNumero rotulo="Ontem" c={c.ontem} base="anteontem" visitantes={`${fmt.format(c.ontem.visitantes)} visitantes`} />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <CartaoNumero rotulo="7 dias" c={c.d7} base="os 7 dias anteriores" visitantes={`≈ ${fmt.format(c.d7.mediaVisitantes ?? 0)} visitantes por dia`} />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <CartaoNumero rotulo="30 dias" c={c.d30} base="os 30 dias anteriores" visitantes={`≈ ${fmt.format(c.d30.mediaVisitantes ?? 0)} visitantes por dia`} />
        </div>
        <div className={`${card} col-span-2 sm:col-span-6 lg:col-span-1`}>
          <p className="text-[0.7rem] font-bold tracking-[0.08em] text-[var(--vp-soft)] uppercase">Total</p>
          <p className="mt-1 text-[2rem] leading-tight font-extrabold tabular-nums">{fmt.format(c.total.pageviews)}</p>
          <p className="mt-1 text-[0.8rem] text-[var(--vp-soft)]">{desde ? `desde ${desde}` : "—"}</p>
        </div>
      </div>

      {vazio ? (
        <div className={`${card} grid place-items-center py-12 text-center`}>
          <BarChart3 className="size-6 text-[var(--vp-soft)]" aria-hidden />
          <p className="mt-2 max-w-sm text-[0.9rem] text-[var(--vp-soft)]">As visitas aparecem aqui alguns segundos depois que alguém abrir o site.</p>
        </div>
      ) : (
        <Grafico serie={d.serie} hoje={d.hoje} />
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[1.1rem] font-bold">Detalhes</h2>
          <nav aria-label="Período dos detalhes" className="flex w-full rounded-full bg-[var(--vp-sunken)] p-1 sm:w-auto">
            {PERIODOS.map((p) => (
              <Link
                key={p.id}
                to={href(p.id)}
                preventScrollReset
                aria-current={p.id === d.periodo ? "page" : undefined}
                className={`inline-flex h-11 flex-1 items-center justify-center rounded-full px-4 text-[0.8rem] font-semibold sm:h-9 sm:flex-none ${p.id === d.periodo ? "bg-[var(--vp-card)] text-[var(--vp-ink)] shadow-sm" : "text-[var(--vp-soft)] hover:text-[var(--vp-ink)]"}`}
              >
                {p.rotulo}
              </Link>
            ))}
          </nav>
        </div>

        <div aria-busy={ocupado} className={`mt-4 flex flex-col gap-4 transition-opacity duration-150 ${ocupado ? "opacity-60" : ""}`}>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Paginas itens={d.paginas.itens} total={d.paginas.total} filtro={d.filtro} periodo={d.periodo} mais={d.mais} />
            </div>
            <div className="lg:col-span-5">
              <Origem dims={d.dims} resumo={d.resumo} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Dimensao titulo="Aparelho" itens={d.dims.aparelho ?? []} icones preenchimento="var(--vp-accent)" />
            <Dimensao titulo="Navegador" itens={d.dims.navegador ?? []} preenchimento="var(--vp-soft)" />
            <Dimensao titulo="Sistema" itens={d.dims.sistema ?? []} preenchimento="var(--vp-soft)" />
          </div>
        </div>
      </div>

      <p className="text-center text-[0.75rem] text-[var(--vp-soft)]">
        Robôs ignorados no período: {fmt.format(d.resumo.robos)} · Sem cookies e sem guardar IP (só um código que muda todo dia) · Visitantes são aproximados.
      </p>
    </div>
  );
}
