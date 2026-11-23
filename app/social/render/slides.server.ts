// Gera os JPEGs (1 slide ou o carrossel inteiro) de uma entrada social, um slide por vez.
import { createElement } from "react";
import { extrairPontos } from "../core/pontos";
import type { EntradaSocial, Modelo, Overrides, Ponto } from "../tipos";
import { bufferDataUri, gradeDataUri, imagemDataUri, logoDataUri } from "./imagem.server";
import { ModeloNoticia } from "./modelos/noticia";
import { SlideFoto, slidesCarrossel, type ExtraSlide } from "./modelos/carrossel";
import { ModeloGratis, ModeloOfertas } from "./modelos/promo";
import { ModeloSemana } from "./modelos/semana";
import { ModeloStoryMoldura, ModeloStoryNoticia } from "./modelos/story";
import { ALTURA_STORY, renderizar } from "./render.server";

export interface Slides {
  jpegs: Buffer[];
  /** Pontos usados (carrossel de artigo). */
  pontos?: Ponto[];
}

/**
 * Gera os slides do modelo, já com as imagens próprias do dono (`ov`: troca de imagem por slide e slides de foto extras).
 * Lança erro se faltar dado (o chamador marca o post como `skipped`/`failed`).
 */
export async function gerarSlides(modelo: Modelo, e: EntradaSocial, ov: Overrides = {}): Promise<Slides> {
  const extras: ExtraSlide[] = [];
  for (const x of ov.extras ?? []) {
    const foto = await imagemDataUri(x.src, 1080, 1350, { foco: x.foco ?? "auto" });
    if (foto) extras.push({ foto, legenda: x.legenda });
  }
  const r = await gerarBase(modelo, e, ov, extras);
  // Modelos de imagem única + fotos extras viram carrossel: [arte, foto, foto...]. (Artigo e review já levam os extras antes do slide final.)
  if (extras.length && modelo !== "C-artigo" && modelo !== "C-review") {
    const [logo, grade] = await Promise.all([logoDataUri(128), gradeDataUri()]);
    const total = 1 + extras.length;
    for (let k = 0; k < extras.length; k++) r.jpegs.push(await renderizar(createElement(SlideFoto, { ins: { logo, grade }, foto: extras[k].foto, legenda: extras[k].legenda, i: 2 + k, total })));
  }
  return r;
}

async function gerarBase(modelo: Modelo, e: EntradaSocial, ov: Overrides, extras: ExtraSlide[]): Promise<Slides> {
  const [logo, grade] = await Promise.all([logoDataUri(128), gradeDataUri()]);
  // Troca do slide 1 = nova capa do post inteiro (capa, fundo desfocado, arte do jogo grátis).
  const t1 = ov.trocas?.["1"];
  const capaSrc = t1?.src ?? e.capa?.src;
  const focoCapa = t1 ? (t1.foco ?? "auto") : ov.focos?.["1"];
  const capaOpts = focoCapa ? { foco: focoCapa } : {};

  if (modelo === "N") {
    const capa = await imagemDataUri(capaSrc, 1080, 760, capaOpts);
    if (!capa) throw new Error("sem capa utilizável");
    return { jpegs: [await renderizar(createElement(ModeloNoticia, { e, ins: { logo, grade, capa } }))] };
  }

  if (modelo === "P1") {
    if (!e.gratis) throw new Error("sem dados do jogo grátis");
    const arteSrc = t1?.src ?? e.gratis.arte ?? e.capa?.src ?? null;
    const [arte, fundo] = await Promise.all([imagemDataUri(arteSrc, 948, 476, capaOpts), imagemDataUri(arteSrc, 1080, 1350, { blur: 30 })]);
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
  const capa = await imagemDataUri(capaSrc, 952, 536, capaOpts);
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
    const troca = ov.trocas?.[String(i + 2)];
    // Imagem do dono entra inteira (só recortada pelo foco), sem zoom; senão a do trecho ou um recorte da matéria.
    const propria = troca ? troca.src : pontos[i].imagem;
    const focoPonto = ov.focos?.[String(i + 2)];
    if (troca) {
      imagens.push(await imagemDataUri(troca.src, 952, 600, { foco: troca.foco ?? "auto" }));
      continue;
    }
    // Alinhamento manual da imagem original do trecho (sem zoom); sem ele, o recorte com zoom de sempre.
    imagens.push(propria && focoPonto ? await imagemDataUri(propria, 952, 600, { foco: focoPonto }) : propria ? await imagemDataUri(propria, 952, 600) : pool.length ? await imagemDataUri(pool[i % pool.length], 952, 600, variacoes[i % variacoes.length]) : null);
  }
  // Review e guia: slides de dados ganham a capa desfocada e escurecida de fundo (mais chamativo que só texto).
  const fundo = modelo === "C-artigo" ? null : await imagemDataUri(capaSrc, 1080, 1350, { blur: 26 });
  const slides = slidesCarrossel(modelo, e, { logo, logoGrande, grade, capa, fundo, imagens }, pontos, extras);
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
