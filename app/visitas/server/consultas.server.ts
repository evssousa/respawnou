// Leituras do painel de visitas. Cada uma é um SELECT agregado por faixa de dias (usa a chave primária).
import { VISITAS } from "../config";
import { anterior, diasEntre, intervalo, somarDias, type Periodo } from "../core/dia";
import { query } from "../db";
import { titulos } from "../site.server";

type Soma = { pageviews: number; entries: number; visitors: number; bots: number; dias: number };
const num = (v: unknown) => Number(v ?? 0);

/** Soma dos totais por dia no intervalo (inclusive). `dias` = quantos dias do intervalo têm linha. */
async function somar(de: string, ate: string): Promise<Soma> {
  const [r] = await query<{ pv: number; en: number; vi: number; bo: number; dias: number }>(
    "SELECT SUM(pageviews) AS pv, SUM(entries) AS en, SUM(visitors) AS vi, SUM(bots) AS bo, COUNT(*) AS dias FROM visit_daily WHERE day BETWEEN ? AND ?",
    [de, ate],
  );
  return { pageviews: num(r?.pv), entries: num(r?.en), visitors: num(r?.vi), bots: num(r?.bo), dias: num(r?.dias) };
}

export type Cartao = { pageviews: number; visitantes: number; /** Visitantes por dia (média) nos períodos de mais de um dia. */ mediaVisitantes: number | null; variacao: number | null };
export type Cartoes = { hoje: Cartao; ontem: Cartao; d7: Cartao; d30: Cartao; total: { pageviews: number; desde: string | null } };

const variacao = (atual: number, antes: number) => (antes > 0 ? Math.round(((atual - antes) / antes) * 100) : null);

export async function cartoes(hoje: string): Promise<Cartoes> {
  const un = (p: Periodo) => ({ atual: intervalo(p, hoje), ant: anterior(p, hoje) });
  const [h, o, o2, s7, s7a, s30, s30a, [tot]] = await Promise.all([
    somar(hoje, hoje),
    somar(somarDias(hoje, -1), somarDias(hoje, -1)),
    somar(somarDias(hoje, -2), somarDias(hoje, -2)),
    somar(un("7d").atual.de, hoje),
    somar(un("7d").ant.de, un("7d").ant.ate),
    somar(un("30d").atual.de, hoje),
    somar(un("30d").ant.de, un("30d").ant.ate),
    query<{ pv: number; desde: string | null }>("SELECT SUM(pageviews) AS pv, DATE_FORMAT(MIN(day), '%Y-%m-%d') AS desde FROM visit_daily"),
  ]);
  const media = (s: Soma, dias: number) => (s.dias ? Math.round(s.visitors / dias) : 0);
  return {
    hoje: { pageviews: h.pageviews, visitantes: h.visitors, mediaVisitantes: null, variacao: null },
    ontem: { pageviews: o.pageviews, visitantes: o.visitors, mediaVisitantes: null, variacao: variacao(o.pageviews, o2.pageviews) },
    d7: { pageviews: s7.pageviews, visitantes: s7.visitors, mediaVisitantes: media(s7, 7), variacao: variacao(s7.pageviews, s7a.pageviews) },
    d30: { pageviews: s30.pageviews, visitantes: s30.visitors, mediaVisitantes: media(s30, 30), variacao: variacao(s30.pageviews, s30a.pageviews) },
    total: { pageviews: num(tot?.pv), desde: tot?.desde ?? null },
  };
}

export type PontoDia = { dia: string; pageviews: number; visitantes: number; entradas: number };

/** Os últimos 30 dias (29 fechados + hoje parcial), com 0 nos dias sem linha. */
export async function serie30(hoje: string): Promise<PontoDia[]> {
  const de = somarDias(hoje, -29);
  const rows = await query<{ dia: string; pv: number; vi: number; en: number }>(
    "SELECT DATE_FORMAT(day, '%Y-%m-%d') AS dia, pageviews AS pv, visitors AS vi, entries AS en FROM visit_daily WHERE day BETWEEN ? AND ?",
    [de, hoje],
  );
  const por = new Map(rows.map((r) => [r.dia, r]));
  return diasEntre(de, hoje).map((dia) => ({ dia, pageviews: num(por.get(dia)?.pv), visitantes: num(por.get(dia)?.vi), entradas: num(por.get(dia)?.en) }));
}

export type PaginaVista = { path: string; titulo: string | null; tipo: string; rotulo: string; views: number; pct: number };

/** Páginas mais vistas no período, com título, filtradas por tipo (`filtro` = id de VISITAS.filtros). */
export async function paginas(periodo: Periodo, hoje: string, filtro: string, limite: number): Promise<{ itens: PaginaVista[]; total: number }> {
  const { de, ate } = intervalo(periodo, hoje);
  const f = VISITAS.filtros.find((x) => x.id === filtro) ?? VISITAS.filtros[0];
  const tipos = f.tipos;
  const where = tipos?.length ? `AND kind IN (${tipos.map(() => "?").join(",")})` : "";
  const rows = await query<{ path: string; kind: string; v: number }>(
    `SELECT path, MAX(kind) AS kind, SUM(views) AS v FROM visit_pages WHERE day BETWEEN ? AND ? ${where} GROUP BY path ORDER BY v DESC, path LIMIT ?`,
    [de, ate, ...(tipos ?? []), limite],
  );
  const [soma] = await query<{ v: number }>(`SELECT SUM(views) AS v FROM visit_pages WHERE day BETWEEN ? AND ? ${where}`, [de, ate, ...(tipos ?? [])]);
  const total = num(soma?.v);
  const nomes = await titulos(rows.map((r) => ({ path: r.path, kind: r.kind })));
  const rotulos = new Map(VISITAS.tipos.map((t) => [t.tipo, t.rotulo]));
  return {
    total,
    itens: rows.map((r) => ({ path: r.path, titulo: nomes.get(r.path) ?? null, tipo: r.kind, rotulo: rotulos.get(r.kind) ?? "Página", views: num(r.v), pct: total ? (num(r.v) / total) * 100 : 0 })),
  };
}

export type Dimensoes = Record<string, { valor: string; n: number }[]>;

/** Todas as dimensões (origem, domínios, campanhas, aparelho, navegador, sistema, idioma) do período, de uma vez. */
export async function dimensoes(periodo: Periodo, hoje: string): Promise<Dimensoes> {
  const { de, ate } = intervalo(periodo, hoje);
  const rows = await query<{ dim: string; value: string; n: number }>("SELECT dim, value, SUM(n) AS n FROM visit_dims WHERE day BETWEEN ? AND ? GROUP BY dim, value ORDER BY n DESC", [de, ate]);
  const out: Dimensoes = {};
  for (const r of rows) (out[r.dim] ??= []).push({ valor: r.value, n: num(r.n) });
  return out;
}

/** Robôs ignorados e a navegação dentro do site no período. */
export async function resumoPeriodo(periodo: Periodo, hoje: string) {
  const { de, ate } = intervalo(periodo, hoje);
  const s = await somar(de, ate);
  return { robos: s.bots, paginas: s.pageviews, entradas: s.entries, paginasPorVisita: s.entries > 0 ? s.pageviews / s.entries : null };
}
