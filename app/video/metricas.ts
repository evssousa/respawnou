// Contas puras das métricas dos vídeos (vale no navegador e no servidor).
export type Marco = "24h" | "72h" | "7d" | "30d";
export const MARCOS: Marco[] = ["24h", "72h", "7d", "30d"];
export const ROTULO_MARCO: Record<Marco, string> = { "24h": "24 h", "72h": "72 h", "7d": "7 dias", "30d": "30 dias" };

/** Janela de idade (horas desde a publicação) em que cada marco pode ser coletado: fora dela o número seria de outra idade. */
export const JANELA_MARCO: Record<Marco, [number, number]> = { "24h": [24, 48], "72h": [72, 120], "7d": [168, 240], "30d": [720, 960] };

export interface LinhaMetrica {
  marco: Marco;
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  avg_watch_ms: number | null;
}

/** Marco devido para a idade (horas) e os marcos que já existem; null se nenhum. */
export function marcoDevido(idadeHoras: number, existentes: Marco[]): Marco | null {
  for (const m of MARCOS) {
    const [a, b] = JANELA_MARCO[m];
    if (idadeHoras >= a && idadeHoras < b && !existentes.includes(m)) return m;
  }
  return null;
}

/** Fração do vídeo que a pessoa assiste em média (0 a 1); null sem dado. */
export function retencao(avgWatchMs: number | null | undefined, duracaoS: number | null | undefined): number | null {
  if (avgWatchMs == null || !duracaoS || duracaoS <= 0) return null;
  return Math.min(1, avgWatchMs / (duracaoS * 1000));
}

/** A linha do marco mais tardio que existir. */
export function melhorMarco(linhas: LinhaMetrica[]): LinhaMetrica | null {
  for (const m of [...MARCOS].reverse()) {
    const l = linhas.find((x) => x.marco === m);
    if (l) return l;
  }
  return null;
}

export const milhar = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("pt-BR"));
export const pct = (f: number | null) => (f == null ? "—" : `${Math.round(f * 100)}%`);
