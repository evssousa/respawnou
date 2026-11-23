// Trilha de fundo e efeitos sonoros gerados pelo próprio ffmpeg (síntese): música 100% nossa, sem direitos autorais de terceiros
// (não cai em Content ID e não atrapalha a monetização). Só monta o comando; quem roda é o gerador.

export interface Estilo {
  nome: string;
  bpm: number;
  /** Fundamental do baixo por compasso (Hz) e do arpejo (uma oitava acima, Hz). */
  baixo: number[];
  arpejo: number[];
  /** true = acorde menor naquele compasso. */
  menor: boolean[];
}

export const ESTILOS: Estilo[] = [
  { nome: "energia", bpm: 112, baixo: [110, 87.31, 130.81, 98], arpejo: [220, 174.61, 261.63, 196], menor: [true, false, false, false] },
  { nome: "tensao", bpm: 104, baixo: [73.42, 58.27, 87.31, 65.41], arpejo: [146.83, 116.54, 174.61, 130.81], menor: [true, false, false, false] },
  { nome: "aventura", bpm: 120, baixo: [98, 130.81, 87.31, 110], arpejo: [196, 261.63, 174.61, 220], menor: [false, false, false, true] },
];

/** Estilo estável por vídeo (o mesmo vídeo sempre gera a mesma trilha). */
export const estiloDoVideo = (id: number): Estilo => ESTILOS[Math.abs(id) % ESTILOS.length];

const f = (n: number) => n.toFixed(4);
const escolha = (valores: number[], idx: string) => valores.reduceRight((resto, v, i) => (i === valores.length - 1 ? f(v) : `if(lt(${idx},${i + 1}),${f(v)},${resto})`), "0");

/** Expressão do aevalsrc: baixo + arpejo + bumbo + caixa + chimbal. Amplitude de pico em torno de 0,6. */
export function expressaoMusica(e: Estilo): string {
  const B = 60 / e.bpm;
  const m = `mod(floor(t/${f(B * 4)}),4)`;
  const baixo = escolha(e.baixo, m);
  const raiz = escolha(e.arpejo, m);
  const terca = escolha(e.menor.map((x) => (x ? 1.1892 : 1.2599)), m);
  // Passo do arpejo (colcheias): fundamental, terça, quinta, oitava, quinta, terça...
  const p = `mod(floor(t/${f(B / 2)}),6)`;
  const razao = `if(lt(${p},1),1,if(lt(${p},2),${terca},if(lt(${p},3),1.4983,if(lt(${p},4),2,if(lt(${p},5),1.4983,${terca})))))`;
  const tb = `mod(t,${f(B)})`;
  const th = `mod(t,${f(B / 2)})`;
  const tc = `mod(t+${f(B)},${f(B * 2)})`;
  const bx = `0.30*sin(2*PI*(${baixo})*t)*exp(-2.5*${tb})*min(1,${tb}*300)*min(1,(${f(B)}-${tb})*80)`;
  const fa = `2*PI*(${raiz})*(${razao})*t`;
  const arp = `0.10*(sin(${fa})+0.35*sin(3*${fa}))*exp(-7*${th})*min(1,${th}*400)`;
  const kick = `0.55*sin(2*PI*(42*${tb}+110*(1-exp(-30*${tb}))/30))*exp(-9*${tb})`;
  const caixa = `0.16*(random(0)*2-1)*exp(-16*${tc})*gt(${tc},0)*lt(${tc},${f(B * 0.4)})`;
  const hat = `0.07*(random(1)*2-1)*exp(-45*${th})`;
  return `${bx}+${arp}+${kick}+${caixa}+${hat}`;
}

/**
 * Comando que gera `trilha.wav`: música em loop contínuo (mono) + um "whoosh" em cada transição (instantes em segundos).
 * A trilha entra com fade de 0,6 s e sai nos últimos 1,5 s.
 */
export function comandoTrilha(estilo: Estilo, total: number, transicoes: number[], saida: string, leve = true): string[] {
  const t1 = leve ? ["-threads", "1", "-filter_threads", "1", "-filter_complex_threads", "1"] : [];
  const args = ["-y", "-hide_banner", "-loglevel", "warning", ...t1, "-f", "lavfi", "-t", (total + 0.5).toFixed(2), "-i", `aevalsrc=exprs='${expressaoMusica(estilo)}':s=44100:c=mono`];
  const n = transicoes.length;
  const partes: string[] = [];
  partes.push(`[0:a]highpass=f=35,lowpass=f=9000,volume=0.8,afade=t=in:d=0.6,afade=t=out:st=${Math.max(0, total - 1.5).toFixed(2)}:d=1.5[mus]`);
  if (n) {
    args.push(...t1, "-f", "lavfi", "-t", "0.6", "-i", "anoisesrc=color=pink:amplitude=0.9:sample_rate=44100");
    partes.push(`[1:a]highpass=f=500,lowpass=f=7000,afade=t=in:d=0.22,afade=t=out:st=0.22:d=0.38,volume=0.55${n > 1 ? `,asplit=${n}${transicoes.map((_, i) => `[w${i}]`).join("")}` : "[w0]"}`);
    transicoes.forEach((t, i) => {
      const ms = Math.max(0, Math.round((t - 0.2) * 1000));
      partes.push(`[w${i}]adelay=${ms}|${ms}[s${i}]`);
    });
    partes.push(`[mus]${transicoes.map((_, i) => `[s${i}]`).join("")}amix=inputs=${n + 1}:duration=first:dropout_transition=0,volume=${n + 1},alimiter=limit=0.95[out]`);
  } else partes.push("[mus]anull[out]");
  args.push("-filter_complex", partes.join(";"), "-map", "[out]", "-ar", "44100", "-ac", "1", saida);
  return args;
}
