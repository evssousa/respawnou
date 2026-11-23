// Gera os JPEGs (1 slide ou o carrossel inteiro) de uma entrada social, um slide por vez.
import { createElement } from "react";
import { extrairPontos } from "../core/pontos";
import type { EntradaSocial, Modelo, Ponto } from "../tipos";
import { bufferDataUri, gradeDataUri, imagemDataUri, logoDataUri } from "./imagem.server";
import { ModeloNoticia } from "./modelos/noticia";
import { slidesCarrossel } from "./modelos/carrossel";
import { ModeloGratis, ModeloOfertas } from "./modelos/promo";
import { ModeloSemana } from "./modelos/semana";
import { ModeloStoryMoldura, ModeloStoryNoticia } from "./modelos/story";
import { ALTURA_STORY, renderizar } from "./render.server";

export interface Slides {
  jpegs: Buffer[];
  /** Pontos usados (carrossel de artigo). */
  pontos?: Ponto[];
}

/** Gera os slides do modelo. Lança erro se faltar dado (o chamador marca o post como `skipped`/`failed`). */
export async function gerarSlides(modelo: Modelo, e: EntradaSocial): Promise<Slides> {
  const [logo, grade] = await Promise.all([logoDataUri(128), gradeDataUri()]);

  if (modelo === "N") {
    const capa = await imagemDataUri(e.capa?.src, 1080, 760);
    if (!capa) throw new Error("sem capa utilizável");
    return { jpegs: [await renderizar(createElement(ModeloNoticia, { e, ins: { logo, grade, capa } }))] };
  }

  if (modelo === "P1") {
    if (!e.gratis) throw new Error("sem dados do jogo grátis");
    const arteSrc = e.gratis.arte ?? e.capa?.src ?? null;
    const [arte, fundo] = await Promise.all([imagemDataUri(arteSrc, 948, 476), imagemDataUri(arteSrc, 1080, 1350, { blur: 30 })]);
    return { jpegs: [await renderizar(createElement(ModeloGratis, { e, ins: { logo, grade, arte, fundo, imagens: [] } }))] };
  }

  if (modelo === "P2") {
    if (!e.ofertas?.itens.length) throw new Error("sem dados das ofertas");
    const imagens: (string | null)[] = [];
    for (const it of e.ofertas.itens.slice(0, 4)) imagens.push(await imagemDataUri(it.imagem, 300, 140));
    return { jpegs: [await renderizar(createElement(ModeloOfertas, { e, ins: { logo, grade, arte: null, fundo: null, imagens } }))] };
  }

  if (modelo === "S") {
    if (!e.semana?.dias.length) throw new Error("sem jogos na semana");
    const artes: (string | null)[][] = [];
    for (const d of e.semana.dias.slice(0, 5)) {
      const linha: (string | null)[] = [];
      for (const j of (d.jogos.length > 4 ? d.jogos.slice(0, 3) : d.jogos)) linha.push(await imagemDataUri(j.arte, 192, 108));
      artes.push(linha);
    }
    return { jpegs: [await renderizar(createElement(ModeloSemana, { e, ins: { logo, grade, artes } }))] };
  }

  // Carrossel
  const logoGrande = await logoDataUri(256);
  const pontos = modelo === "C-artigo" ? (e.pontos?.length ? e.pontos : extrairPontos(e.corpo)) : [];
  if (modelo === "C-artigo" && pontos.length < 3) throw new Error("menos de 3 pontos para o carrossel");
  if (modelo === "C-review" && !e.review) throw new Error("sem dados da review");
  if (modelo === "C-guia" && !e.requisitos) throw new Error("sem requisitos lidos");
  const capa = await imagemDataUri(e.capa?.src, 952, 536);
  // Todo slide de ponto tem imagem grande: a do trecho, ou um recorte (zoom e enquadramento diferentes) das imagens da matéria e da capa.
  const pool = [...e.corpo.flatMap((b) => (b.type === "img" ? [b.src] : [])), ...(e.capa ? [e.capa.src] : [])];
  const variacoes: { zoom: number; ancora: "centre" | "west" | "east" | "north" | "south" }[] = [
    { zoom: 1.5, ancora: "west" },
    { zoom: 1.8, ancora: "east" },
    { zoom: 1.4, ancora: "centre" },
    { zoom: 2, ancora: "south" },
    { zoom: 1.7, ancora: "west" },
  ];
  const imagens: (string | null)[] = [];
  for (let i = 0; i < pontos.length; i++) {
    const propria = pontos[i].imagem;
    imagens.push(propria ? await imagemDataUri(propria, 952, 600) : pool.length ? await imagemDataUri(pool[i % pool.length], 952, 600, variacoes[i % variacoes.length]) : null);
  }
  // Review e guia: slides de dados ganham a capa desfocada e escurecida de fundo (mais chamativo que só texto).
  const fundo = modelo === "C-artigo" ? null : await imagemDataUri(e.capa?.src, 1080, 1350, { blur: 26 });
  const slides = slidesCarrossel(modelo, e, { logo, logoGrande, grade, capa, fundo, imagens }, pontos);
  const jpegs: Buffer[] = [];
  for (const s of slides) jpegs.push(await renderizar(s));
  return { jpegs, pontos: modelo === "C-artigo" ? pontos : undefined };
}

/**
 * Story 1080×1920 da matéria. Modelo N do feed: ST-N (capa grande). Os outros: ST-M, a moldura com o slide 1 do feed
 * (`slide1Src` = arquivo já gerado do post de feed, se existir; senão o slide 1 é gerado na hora, sem gravar).
 */
export async function gerarStory(modeloFeed: Modelo, e: EntradaSocial, opts: { slide1Src?: string | null; noFeed: boolean }): Promise<Buffer> {
  const [logo, grade] = await Promise.all([logoDataUri(128), gradeDataUri(1080, ALTURA_STORY)]);
  if (modeloFeed === "N") {
    const arte = await imagemDataUri(e.capa?.src, 1080, 1000);
    if (!arte) throw new Error("sem capa utilizável");
    return renderizar(createElement(ModeloStoryNoticia, { e, ins: { logo, grade, arte, noFeed: opts.noFeed } }), { altura: ALTURA_STORY });
  }
  let arte = opts.slide1Src ? await imagemDataUri(opts.slide1Src, 860, 1076) : null;
  let fundo: string | null = null;
  if (arte) fundo = await imagemDataUri(opts.slide1Src, 1080, ALTURA_STORY, { blur: 40 });
  else {
    const jpeg = (await gerarSlides(modeloFeed, e)).jpegs[0];
    arte = await bufferDataUri(jpeg, 860, 1076);
    fundo = await bufferDataUri(jpeg, 1080, ALTURA_STORY, { blur: 40 });
  }
  return renderizar(createElement(ModeloStoryMoldura, { e, modelo: modeloFeed, ins: { logo, grade, arte, fundo, noFeed: opts.noFeed } }), { altura: ALTURA_STORY });
}
