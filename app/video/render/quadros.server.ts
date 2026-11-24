// Gera os PNGs 1080×1920 do vídeo (usado pelo worker). Reaproveita satori, fontes e logo do módulo social.
import { createElement } from "react";
import { gradeDataUri, logoDataUri } from "~/social/render/imagem.server";
import { renderizarPng } from "~/social/render/render.server";
import { Abertura, Fechamento, Moldura } from "./quadros";

const TAM = { largura: 1080, altura: 1920 };

export async function gerarQuadros(p: { titulo: string; secao: string; cta: string; pergunta?: string | null }): Promise<{ moldura: Buffer; abertura: Buffer; fechamento: Buffer }> {
  const [logo, logoGrande, grade] = await Promise.all([logoDataUri(128), logoDataUri(256), gradeDataUri(1080, 1920)]);
  return {
    moldura: await renderizarPng(createElement(Moldura, { logo, secao: p.secao }), TAM),
    abertura: await renderizarPng(createElement(Abertura, { titulo: p.titulo, secao: p.secao }), TAM),
    fechamento: await renderizarPng(createElement(Fechamento, { logoGrande, grade, cta: p.cta, pergunta: p.pergunta ?? null }), TAM),
  };
}
