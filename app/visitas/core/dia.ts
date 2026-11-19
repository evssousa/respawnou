// Dias de Brasília e os períodos do painel. Puro, sem banco.
const TZ = "America/Sao_Paulo";
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** "2026-11-19" no horário de Brasília. */
export const diaBrasilia = (d: Date = new Date()) => fmt.format(d);

/** Soma `n` dias a um dia "AAAA-MM-DD" (calendário, sem fuso). */
export function somarDias(dia: string, n: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export type Periodo = "hoje" | "ontem" | "7d" | "30d";
export const PERIODOS: Periodo[] = ["hoje", "ontem", "7d", "30d"];
export const isPeriodo = (v: unknown): v is Periodo => typeof v === "string" && (PERIODOS as string[]).includes(v);

/** Dias de `de` até `ate`, inclusive. Janelas de 7 e 30 dias terminam hoje (o dia de hoje entra parcial). */
export function intervalo(p: Periodo, hoje: string): { de: string; ate: string; dias: number } {
  switch (p) {
    case "hoje":
      return { de: hoje, ate: hoje, dias: 1 };
    case "ontem": {
      const o = somarDias(hoje, -1);
      return { de: o, ate: o, dias: 1 };
    }
    case "7d":
      return { de: somarDias(hoje, -6), ate: hoje, dias: 7 };
    case "30d":
      return { de: somarDias(hoje, -29), ate: hoje, dias: 30 };
  }
}

/** O período anterior, do mesmo tamanho, logo antes. */
export function anterior(p: Periodo, hoje: string): { de: string; ate: string; dias: number } {
  const atual = intervalo(p, hoje);
  return { de: somarDias(atual.de, -atual.dias), ate: somarDias(atual.de, -1), dias: atual.dias };
}

/** Todos os dias de `de` a `ate`, inclusive. */
export function diasEntre(de: string, ate: string): string[] {
  const out: string[] = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) out.push(d);
  return out;
}

/** "19/11" a partir de "2026-11-19". */
export const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
