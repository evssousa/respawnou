// Recortes de vídeo da matéria (trailer/material de imprensa enviado pelo dono): acha os cortes de cena, escolhe trechos curtos
// espalhados pelo vídeo e pula logotipos do começo e cartela do fim. Funções puras + o comando de análise do ffmpeg.

/** Teto de cada trecho e de quanto do vídeo final pode ser material de terceiros (citação curta, com comentário por cima). */
export const TRECHO_MAX_S = 4.5;
export const FRACAO_MAX_VIDEO = 0.4;

/** Item de vídeo: arquivo enviado pelo dono (.mp4/.webm). */
export const ehVideoSrc = (src: string) => /\.(mp4|webm|mov)$/i.test(src);

/** Comando que lista os cortes de cena (baixa resolução, 1 thread). Os instantes saem no stderr como `pts_time:`. */
export const comandoCortes = (arquivo: string): string[] => ["-hide_banner", "-nostats", "-threads", "1", "-filter_threads", "1", "-i", arquivo, "-an", "-vf", "scale=256:-2,select='gt(scene,0.32)',showinfo", "-f", "null", "-"];

export function lerCortes(stderr: string): number[] {
  return [...stderr.matchAll(/pts_time:(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])).filter((n) => Number.isFinite(n));
}

export function lerDuracao(stderr: string): number {
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

export interface Trecho {
  ss: number;
  dur: number;
}

/**
 * Escolhe `duracoes.length` trechos, na ordem do vídeo, um por pedido. Cada um começa num corte de cena (não atravessa um corte),
 * longe do começo (logotipo, 6%) e do fim (cartela, 14%). Sem cortes suficientes, cai para pontos igualmente espaçados.
 */
export function escolherTrechos(duracaoVideo: number, cortes: number[], duracoes: number[]): Trecho[] {
  const n = duracoes.length;
  if (!n || duracaoVideo <= 0) return [];
  const ini = duracaoVideo * 0.06;
  const fim = duracaoVideo * 0.86;
  const bordas = [0, ...cortes.filter((c) => c > 0 && c < duracaoVideo), duracaoVideo];
  const cand: { ss: number; max: number }[] = [];
  for (let i = 0; i < bordas.length - 1; i++) {
    const a = Math.max(bordas[i] + 0.15, ini);
    const max = Math.min(bordas[i + 1] - 0.15, fim) - a;
    if (max >= 1.2) cand.push({ ss: a, max });
  }
  // Poucos cortes (vídeo com plano longo): pontos igualmente espaçados no miolo.
  while (cand.length < n) {
    const k = cand.length;
    const ss = ini + ((fim - ini - TRECHO_MAX_S) * (k + 0.5)) / Math.max(1, n);
    if (!(ss > 0)) break;
    cand.push({ ss, max: TRECHO_MAX_S });
    cand.sort((x, y) => x.ss - y.ss);
    if (cand.length > 40) break;
  }
  if (!cand.length) return [];
  // Espalha: pega n candidatos igualmente distribuídos pela lista.
  const out: Trecho[] = [];
  for (let k = 0; k < n; k++) {
    const c = cand[Math.min(cand.length - 1, Math.floor(((k + 0.5) * cand.length) / n))];
    const dur = Math.min(duracoes[k], c.max, TRECHO_MAX_S);
    out.push({ ss: Number(c.ss.toFixed(2)), dur: Number(dur.toFixed(2)) });
  }
  return out;
}
