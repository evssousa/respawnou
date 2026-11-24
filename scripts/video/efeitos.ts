// Efeitos sonoros dos cartões de dados, sintetizados pelo ffmpeg (sem arquivo de terceiros): "ding" no preço e no grátis, "impacto"
// na nota e no ranking, "pop" nos demais. Só monta o comando; quem roda é o gerador.

export type SomEfeito = "ding" | "impacto" | "pop";
export interface EventoEfeito {
  /** Instante em segundos (a entrada do cartão). */
  t: number;
  tipo: SomEfeito;
}

/** Som de cada tipo de cartão. */
export const somDoCartao = (tipo: string): SomEfeito => (tipo === "preco" || tipo === "gratis" ? "ding" : tipo === "nota" || tipo === "ranking" ? "impacto" : "pop");

/** Intervalo mínimo entre efeitos: o segundo que cair perto demais é descartado. */
export function filtrarEventos(eventos: EventoEfeito[], minimoS = 1.5): EventoEfeito[] {
  const out: EventoEfeito[] = [];
  for (const e of [...eventos].sort((a, b) => a.t - b.t)) if (!out.length || e.t - out[out.length - 1].t >= minimoS) out.push(e);
  return out;
}

const SONS: Record<SomEfeito, { expr: string; dur: number; filtro?: string }> = {
  ding: { expr: "0.5*(sin(2*PI*1318.5*t)+0.6*sin(2*PI*1975.5*t)+0.25*sin(2*PI*2637*t))*exp(-6*t)*min(1,t*400)", dur: 0.9 },
  impacto: { expr: "0.9*sin(2*PI*(55*t+60*(1-exp(-25*t))/25))*exp(-5*t)+0.25*(random(0)*2-1)*exp(-30*t)", dur: 0.7, filtro: "lowpass=f=4000" },
  pop: { expr: "0.4*sin(2*PI*(600+900*exp(-40*t))*t)*exp(-35*t)", dur: 0.15 },
};

/**
 * Comando que gera `efeitos.wav` (mono, 44,1 kHz, `total` segundos) com cada efeito no seu instante. Depois da mistura final os
 * efeitos NÃO passam pelo abaixamento da música sob a voz (senão sumiriam).
 */
export function comandoEfeitos(eventos: EventoEfeito[], total: number, saida: string, leve = true): string[] {
  const t1 = leve ? ["-threads", "1", "-filter_threads", "1", "-filter_complex_threads", "1"] : [];
  const args = ["-y", "-hide_banner", "-loglevel", "warning", ...t1, "-f", "lavfi", "-t", total.toFixed(2), "-i", "anullsrc=r=44100:cl=mono"];
  const partes: string[] = [];
  eventos.forEach((e, i) => {
    const s = SONS[e.tipo];
    args.push(...t1, "-f", "lavfi", "-t", s.dur.toFixed(2), "-i", `aevalsrc=exprs='${s.expr}':s=44100:c=mono`);
    const ms = Math.max(0, Math.round(e.t * 1000));
    partes.push(`[${i + 1}:a]${s.filtro ? `${s.filtro},` : ""}adelay=${ms}|${ms}[e${i}]`);
  });
  // amix divide cada entrada pelo número de entradas: compensa com volume (a opção normalize=0 não existe em todo ffmpeg).
  partes.push(`[0:a]${eventos.map((_, i) => `[e${i}]`).join("")}amix=inputs=${eventos.length + 1}:duration=first:dropout_transition=0,volume=${eventos.length + 1},alimiter=limit=0.95[out]`);
  args.push("-filter_complex", partes.join(";"), "-map", "[out]", "-ar", "44100", "-ac", "1", saida);
  return args;
}
