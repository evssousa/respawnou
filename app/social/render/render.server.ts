// JSX → satori → SVG → sharp → JPEG (o Instagram só aceita JPEG). Um slide por vez; sem navegador.
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import type { ReactElement } from "react";
import satori from "satori";
import sharp from "sharp";
import { mediaDir } from "../../../server-paths.mjs";
import { fontes } from "./fontes.server";

export const LARGURA = 1080;
export const ALTURA = 1350;

export const ALTURA_STORY = 1920;

/** Renderiza um slide (padrão 1080×1350; Story 1080×1920) e devolve os bytes do JPEG. */
export async function renderizar(elemento: ReactElement, tamanho: { largura?: number; altura?: number } = {}): Promise<Buffer> {
  const svg = await satori(elemento, { width: tamanho.largura ?? LARGURA, height: tamanho.altura ?? ALTURA, fonts: await fontes() });
  return sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer();
}

/** Grava o JPEG em MEDIA_DIR/social/AAAA/MM/ e devolve o caminho público (/media/social/...). O nome muda a cada geração. */
export async function salvar(jpeg: Buffer, socialId: number, n: number, prefixo = "s"): Promise<string> {
  const d = new Date();
  const dir = `social/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const nome = `${prefixo}${socialId}-${n}-${createHash("sha1").update(jpeg).digest("hex").slice(0, 8)}.jpg`;
  await mkdir(join(mediaDir(), dir), { recursive: true });
  await writeFile(join(mediaDir(), dir, nome), jpeg);
  return `/media/${dir}/${nome}`;
}

/** Igual a `renderizar`, mas devolve PNG (mantém a transparência: para sobrepor no vídeo). */
export async function renderizarPng(elemento: ReactElement, tamanho: { largura?: number; altura?: number } = {}): Promise<Buffer> {
  const svg = await satori(elemento, { width: tamanho.largura ?? LARGURA, height: tamanho.altura ?? ALTURA, fonts: await fontes() });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
