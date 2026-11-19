// Gráfico de linha dos últimos 30 dias, em SVG simples (sem biblioteca), com dica ao passar o mouse e tabela alternativa.
import { useState } from "react";
import { ddmm } from "../core/dia";
import type { PontoDia } from "../server/consultas.server";

const W = 1000;
const H = 220;
const fmt = new Intl.NumberFormat("pt-BR");
const curto = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)} mil` : fmt.format(n));
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const diaSemana = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay();

/** Teto "redondo" do eixo: 1, 2 ou 5 vezes uma potência de 10 acima do maior valor. */
function teto(max: number) {
  if (max <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(max));
  return ([1, 2, 5, 10].map((m) => m * p).find((v) => v >= max) ?? max) as number;
}

export function Grafico({ serie, hoje }: { serie: PontoDia[]; hoje: string }) {
  const [i, setI] = useState<number | null>(null);
  const n = serie.length;
  const max = teto(Math.max(...serie.map((p) => Math.max(p.pageviews, p.visitantes)), 0));
  const x = (k: number) => (n > 1 ? (k / (n - 1)) * W : W / 2);
  const y = (v: number) => H - 6 - (v / max) * (H - 14);
  const pontos = (pick: (p: PontoDia) => number, de: number, ate: number) => serie.slice(de, ate + 1).map((p, k) => `${x(de + k).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(" ");
  const total = serie.reduce((a, p) => a + p.pageviews, 0);
  const valores = serie.map((p) => p.pageviews);
  const resumo = `Páginas vistas nos últimos 30 dias: de ${fmt.format(Math.min(...valores))} a ${fmt.format(Math.max(...valores))} por dia, total ${fmt.format(total)}`;
  const area = `${x(0).toFixed(1)},${H} ${pontos((p) => p.pageviews, 0, n - 1)} ${x(n - 1).toFixed(1)},${H}`;
  const hover = i == null ? null : serie[i];
  const passo = 7; // uma data a cada 7 dias (igual no servidor e no navegador)
  return (
    <section aria-labelledby="vp-grafico" className="rounded-[14px] border border-[var(--vp-line)] bg-[var(--vp-card)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="vp-grafico" className="text-base font-bold">
          Últimos 30 dias
        </h2>
        <p className="flex items-center gap-4 text-[0.8rem] text-[var(--vp-soft)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-[var(--vp-accent)]" aria-hidden /> Páginas vistas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="16" height="2" aria-hidden>
              <line x1="0" y1="1" x2="16" y2="1" stroke="var(--vp-soft)" strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            Visitantes
          </span>
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="relative h-[180px] w-11 shrink-0 text-right text-[0.75rem] text-[var(--vp-soft)] sm:h-[220px]" aria-hidden>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <span key={f} className="absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: `${((H - 6 - f * (H - 14)) / H) * 100}%` }}>
              {curto(Math.round(max * f))}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="relative h-[180px] sm:h-[220px]" onMouseLeave={() => setI(null)} onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setI(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
          }}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="size-full" role="img" aria-label={resumo}>
              {serie.map((p, k) => {
                const d = diaSemana(p.dia);
                return d === 0 || d === 6 ? <rect key={p.dia} x={Math.max(0, x(k) - W / (n - 1) / 2)} y="0" width={W / (n - 1)} height={H} fill="var(--vp-sunken)" fillOpacity="0.6" /> : null;
              })}
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <line key={f} x1="0" x2={W} y1={y(max * f)} y2={y(max * f)} stroke="var(--vp-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
              <polygon points={area} fill="var(--vp-accent)" fillOpacity="0.1" />
              <polyline points={pontos((p) => p.pageviews, 0, n - 2)} fill="none" stroke="var(--vp-accent)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <polyline points={pontos((p) => p.pageviews, n - 2, n - 1)} fill="none" stroke="var(--vp-accent)" strokeWidth="2" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
              <polyline points={pontos((p) => p.visitantes, 0, n - 2)} fill="none" stroke="var(--vp-soft)" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
              <polyline points={pontos((p) => p.visitantes, n - 2, n - 1)} fill="none" stroke="var(--vp-soft)" strokeWidth="1.5" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
            </svg>
            {hover && i != null && (
              <>
                <span aria-hidden className="pointer-events-none absolute top-0 bottom-0 w-px bg-[var(--vp-ink)] opacity-30" style={{ left: `${(x(i) / W) * 100}%` }} />
                <span aria-hidden className="pointer-events-none absolute z-10 rounded-[10px] border border-[var(--vp-line)] bg-[var(--vp-card)] px-3 py-2 text-[0.75rem] whitespace-nowrap shadow-[0_4px_16px_rgba(0,0,0,.12)]" style={{ top: 4, ...(i > n * 0.6 ? { right: `${100 - (x(i) / W) * 100 + 1}%` } : { left: `${(x(i) / W) * 100 + 1}%` }) }}>
                  {DIAS[diaSemana(hover.dia)]}, {ddmm(hover.dia)} · {fmt.format(hover.pageviews)} páginas · {fmt.format(hover.visitantes)} visitantes{hover.dia === hoje ? " (parcial)" : ""}
                </span>
              </>
            )}
          </div>
          <div className="relative mt-1 h-5 text-[0.75rem] text-[var(--vp-soft)]" aria-hidden>
            {serie.map((p, k) => (k % passo === 0 || k === n - 1) && (n - 1 - k >= 3 || k === n - 1) ? (
              <span key={p.dia} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${(x(k) / W) * 100}%` }}>
                {p.dia === hoje ? "hoje" : ddmm(p.dia)}
              </span>
            ) : null)}
          </div>
        </div>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-[0.8rem] font-semibold text-[var(--vp-accent)]">Ver os números em tabela</summary>
        <div className="mt-2 max-h-80 overflow-auto rounded-[10px] border border-[var(--vp-line)]">
          <table className="w-full text-[0.8rem] tabular-nums">
            <thead className="sticky top-0 bg-[var(--vp-sunken)] text-left text-[var(--vp-soft)]">
              <tr>
                <th className="px-3 py-2 font-semibold">Dia</th>
                <th className="px-3 py-2 text-right font-semibold">Páginas vistas</th>
                <th className="px-3 py-2 text-right font-semibold">Visitantes</th>
                <th className="px-3 py-2 text-right font-semibold">Entradas</th>
              </tr>
            </thead>
            <tbody>
              {[...serie].reverse().map((p) => (
                <tr key={p.dia} className="border-t border-[var(--vp-line)]">
                  <td className="px-3 py-1.5">
                    {ddmm(p.dia)} {DIAS[diaSemana(p.dia)]}
                    {p.dia === hoje ? " (parcial)" : ""}
                  </td>
                  <td className="px-3 py-1.5 text-right">{fmt.format(p.pageviews)}</td>
                  <td className="px-3 py-1.5 text-right">{fmt.format(p.visitantes)}</td>
                  <td className="px-3 py-1.5 text-right">{fmt.format(p.entradas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
