// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Renderiza um cartão de dados do vídeo (PNG pequeno com folga para a sombra). Só no servidor.
import { createElement } from "react";
import { renderizarPng } from "~/social/render/render.server";
import type { FatosVideo, TipoCartao } from "../cartoes";
import { ALTURA_CARTAO, CartaoGratis, CartaoDia, CartaoLancamento, CartaoNota, CartaoPlataformas, CartaoPreco, CartaoRanking, CartaoRequisitos, LARGURA_CARTAO } from "./cartoes";

const COMPONENTES: Partial<Record<TipoCartao, (p: { f: FatosVideo; item?: number }) => unknown>> = {
  preco: CartaoPreco,
  lancamento: CartaoLancamento,
  nota: CartaoNota,
  requisitos: CartaoRequisitos,
  gratis: CartaoGratis,
  plataformas: CartaoPlataformas,
  ranking: CartaoRanking,
  dia: CartaoDia,
};

/** PNG do cartão, ou null se não há dado para ele (o cartão simplesmente não entra; o vídeo nunca falha por isso). */
export async function gerarCartao(tipo: TipoCartao, f: FatosVideo, item = 0): Promise<{ png: Buffer; largura: number; altura: number } | null> {
  const comp = COMPONENTES[tipo];
  if (!comp || comp({ f, item }) === null) return null;
  const altura = ALTURA_CARTAO[tipo] + 80;
  try {
    const png = await renderizarPng(createElement(comp as never, { f, item }), { largura: LARGURA_CARTAO, altura });
    return { png, largura: LARGURA_CARTAO, altura };
  } catch (e) {
    console.warn(`[video] cartão ${tipo} não renderizou:`, String((e as Error)?.message ?? e).slice(0, 120));
    return null;
  }
}
