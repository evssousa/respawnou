// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Gera os PNGs 1080×1920 do vídeo (usado pelo worker). Reaproveita satori, fontes e logo do módulo social.
import { createElement } from "react";
import { gradeDataUri, logoDataUri } from "~/social/render/imagem.server";
import { renderizarPng } from "~/social/render/render.server";
import { Abertura, Divisoria, Fechamento, Moldura } from "./quadros";

const TAM = { largura: 1080, altura: 1920 };

export interface Quadros {
  moldura: Buffer;
  abertura: Buffer;
  fechamento: Buffer;
  /** Só na tela dividida: faixa da divisa (1080×160). A capa do Reel não é dividida (usa `abertura`). */
  divisoria?: Buffer;
}

export async function gerarQuadros(p: { titulo: string; secao: string; cta: string; pergunta?: string | null; dividido?: boolean }): Promise<Quadros> {
  const [logo, logoGrande, grade] = await Promise.all([logoDataUri(128), logoDataUri(256), gradeDataUri(1080, 1920)]);
  const q: Quadros = {
    moldura: await renderizarPng(createElement(Moldura, { logo, secao: p.secao }), TAM),
    abertura: await renderizarPng(createElement(Abertura, { titulo: p.titulo, secao: p.secao }), TAM),
    fechamento: await renderizarPng(createElement(Fechamento, { logoGrande, grade, cta: p.cta, pergunta: p.pergunta ?? null }), TAM),
  };
  if (p.dividido) q.divisoria = await renderizarPng(createElement(Divisoria), { largura: 1080, altura: 160 });
  return q;
}
