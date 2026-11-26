// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Formato da tela do vídeo (tela cheia × tela dividida). Puro: vale no painel (navegador) e no servidor.
import type { Roteiro } from "./roteiro";

/** Proporção da metade de baixo na tela dividida (1080×960). */
export const ASPECTO_BAIXO = 9 / 8;

export const ehVideoSrc = (src: string) => /\.(mp4|webm|mov)$/i.test(src);

/** Como o vídeo de cima preenche a metade (1080×960). */
export const ENQUADRAMENTOS_TOPO = [
  { id: "centre", rotulo: "Centro" },
  { id: "west", rotulo: "Esquerda" },
  { id: "east", rotulo: "Direita" },
  { id: "inteira", rotulo: "Inteiro (fundo desfocado)" },
] as const;
export type EnquadramentoTopo = (typeof ENQUADRAMENTOS_TOPO)[number]["id"];
export const enquadramentoTopoValido = (v: unknown): v is EnquadramentoTopo => ENQUADRAMENTOS_TOPO.some((e) => e.id === v);

/**
 * Formato que vale para o roteiro: "dividido" só se o roteiro pede e existe vídeo na lista. `topo` = o vídeo escolhido (se for
 * mesmo um vídeo) ou o 1º vídeo da lista; -1 na tela cheia.
 */
export function layoutDoRoteiro(r: Pick<Roteiro, "layout" | "topo"> | null | undefined, imagens: { src: string }[]): { modo: "dividido" | "cheio"; topo: number } {
  const primeiro = imagens.findIndex((x) => ehVideoSrc(x.src));
  if (r?.layout !== "dividido" || primeiro < 0) return { modo: "cheio", topo: -1 };
  const t = r.topo;
  return { modo: "dividido", topo: typeof t === "number" && imagens[t] && ehVideoSrc(imagens[t].src) ? t : primeiro };
}
