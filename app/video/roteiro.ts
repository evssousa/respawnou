// Tipos e contas do roteiro (puro: vale no navegador e no servidor).
import { VIDEO } from "./config";

export interface Imagem {
  src: string;
  alt: string;
}
export interface Roteiro {
  gancho: string;
  cenas: { fala: string; imagem: number }[];
  titulo_curto: string;
}

export const contarPalavras = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
export const palavrasDoRoteiro = (r: Roteiro) => contarPalavras(r.gancho) + r.cenas.reduce((a, c) => a + contarPalavras(c.fala), 0);

/** Texto que vai para a ElevenLabs: gancho, falas das cenas e o fechamento fixo. */
export const textoFalado = (r: Roteiro) => [r.gancho, ...r.cenas.map((c) => c.fala), VIDEO.fechamento].map((t) => t.trim().replace(/[.!?…]+$/, "")).join(". ") + ".";
export const caracteresDoRoteiro = (r: Roteiro) => textoFalado(r).length;
