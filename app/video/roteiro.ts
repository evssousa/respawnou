// Tipos e contas do roteiro (puro: vale no navegador e no servidor).
import { MARCA } from "../marca";
import { type ItemPronuncia, montarFala } from "../../scripts/video/falar";
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

/** Partes do roteiro na ordem falada: gancho, cenas e fechamento fixo (texto da TELA). */
export const partesDoRoteiro = (r: Roteiro) => [r.gancho, ...r.cenas.map((c) => c.fala), VIDEO.fechamento];

/** Texto que vai para a ElevenLabs: o da tela convertido (números por extenso, siglas pelo dicionário, pausas antes de números). */
export const textoFalado = (r: Roteiro, dic: ItemPronuncia[] = [], pausa = 0) => montarFala(partesDoRoteiro(r), dic, pausa).falado;
/** Caracteres que custam crédito (do texto FALADO, com o dicionário e as pausas dados). */
export const caracteresDoRoteiro = (r: Roteiro, dic: ItemPronuncia[] = MARCA.video.pronunciaBase, pausa = VIDEO.voz.pausaAntesNumero) => textoFalado(r, dic, pausa).length;
