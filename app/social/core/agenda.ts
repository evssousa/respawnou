// Decisão pura de quando o próximo post pode sair (janela, limite do dia, intervalo). Testável sem banco.
import type { ConfigLimites } from "../tipos";

const TZ = "America/Sao_Paulo";

/** Hora (0 a 23) e dia (AAAA-MM-DD) em Brasília. */
export function horaBR(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return { hora: Number(p.hour), dia: `${p.year}-${p.month}-${p.day}` };
}

export interface EstadoEnvio {
  agora: Date;
  /** Posts publicados hoje (dia de Brasília). */
  publicadosHoje: number;
  /** Último publicado (UTC), se houver. */
  ultimoPublicado: Date | null;
  pausadoAte: Date | null;
  tokenOk: boolean;
}

export type Decisao = { pode: true } | { pode: false; motivo: string };

/** Pode enviar agora? O motivo vai para o painel ("Próximo envio"). */
export function podeEnviar(cfg: ConfigLimites, s: EstadoEnvio): Decisao {
  if (!s.tokenOk) return { pode: false, motivo: "sem token válido" };
  if (s.pausadoAte && s.pausadoAte > s.agora) return { pode: false, motivo: "pausado pela API" };
  const { hora } = horaBR(s.agora);
  if (hora < cfg.inicioHora || hora >= cfg.fimHora) return { pode: false, motivo: "fora do horário" };
  if (s.publicadosHoje >= cfg.limiteDia) return { pode: false, motivo: "limite do dia atingido" };
  if (s.ultimoPublicado && s.agora.getTime() - s.ultimoPublicado.getTime() < cfg.intervaloMin * 60_000) return { pode: false, motivo: "aguardando o intervalo" };
  return { pode: true };
}
