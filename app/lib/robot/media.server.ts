// Imagens próprias: o robô baixa a capa e as imagens do corpo, confere o tamanho, converte para
// WebP (até 1600 px) e guarda em MEDIA_DIR (servido em /media). Mesma ideia do Anime Profile
// (worker/localize.ts): a matéria não depende do site de origem (hotlink) para ter imagem.
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mediaDir } from "../../../server-paths.mjs";
import { imageCandidates, type MediaImage } from "./media.ts";
import { USER_AGENT } from "./rss.server.ts";

const MAX_BYTES = 15 * 1024 * 1024;
export const COVER_MIN_W = 1200; // prévia grande do Google Discover
export const COVER_FALLBACK_MIN_W = 800;
export const BODY_MIN_W = 600;
const OUT_W = 1600;

export interface ProbedImage {
  url: string;
  alt?: string;
  source?: string;
  width: number;
  height: number;
  hash: string;
  buf: Buffer;
  type: string;
}

type SharpFn = (input: Buffer) => {
  metadata: () => Promise<{ width?: number; height?: number; pages?: number }>;
  rotate: () => ReturnType<SharpFn>;
  resize: (o: { width: number; withoutEnlargement: boolean }) => ReturnType<SharpFn>;
  webp: (o: { quality: number }) => ReturnType<SharpFn>;
  toBuffer: (o: { resolveWithObject: true }) => Promise<{ data: Buffer; info: { width: number; height: number } }>;
};

let sharpPromise: Promise<SharpFn | null> | undefined;
/** sharp é opcional: sem ele, a imagem é guardada no formato original. */
function loadSharp() {
  sharpPromise ??= import("sharp").then((m) => (m.default ?? m) as unknown as SharpFn).catch(() => null);
  return sharpPromise;
}

async function download(url: string): Promise<{ buf: Buffer; type: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/avif,image/webp,image/*,*/*;q=0.8", Referer: `${new URL(url).origin}/` },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!res.ok || !type.startsWith("image/") || /svg|gif/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 4096 || buf.length > MAX_BYTES) return null;
    return { buf, type };
  } catch {
    return null;
  }
}

/** Largura e altura lidas do cabeçalho do arquivo (PNG, JPEG, WebP), sem depender do sharp. */
export function sniffSize(b: Buffer): { width: number; height: number } | null {
  if (b.length < 30) return null;
  if (b[0] === 0x89 && b[1] === 0x50) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const fourcc = b.toString("ascii", 12, 16);
    if (fourcc === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (fourcc === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (fourcc === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

/** Baixa a melhor versão disponível da imagem e mede. Null se nenhuma servir. */
export async function probeImage(img: MediaImage): Promise<ProbedImage | null> {
  for (const url of imageCandidates(img.url)) {
    const src = await download(url);
    if (!src) continue;
    const sharp = await loadSharp();
    let size = sniffSize(src.buf);
    if (sharp) {
      try {
        const meta = await sharp(src.buf).metadata();
        if ((meta.pages ?? 1) > 1) continue; // animada
        if (meta.width && meta.height) size = { width: meta.width, height: meta.height };
      } catch {
        continue;
      }
    }
    if (!size) continue;
    return { url, alt: img.alt, source: img.source, ...size, hash: createHash("sha1").update(src.buf).digest("hex"), buf: src.buf, type: src.type };
  }
  return null;
}

export interface ChosenMedia {
  cover: ProbedImage;
  body: ProbedImage[];
}

/**
 * Escolhe a capa (de preferência ≥ 1200 px e horizontal) e até `bodyLimit` imagens do corpo,
 * sem repetir o mesmo arquivo. Null quando não há capa utilizável: a pauta é descartada
 * (regra do Anime Profile: matéria sem imagem não sai).
 */
export async function chooseMedia(images: MediaImage[], bodyLimit = 3, maxProbes = 10): Promise<ChosenMedia | null> {
  const probed: ProbedImage[] = [];
  const hashes = new Set<string>();
  for (const img of images.slice(0, maxProbes)) {
    const p = await probeImage(img);
    if (!p || hashes.has(p.hash)) continue;
    hashes.add(p.hash);
    probed.push(p);
  }
  const landscape = (p: ProbedImage) => p.width / p.height >= 1.25 && p.width / p.height <= 2.5;
  const cover =
    probed.find((p) => p.width >= COVER_MIN_W && landscape(p)) ??
    probed.filter((p) => p.width >= COVER_FALLBACK_MIN_W && landscape(p)).sort((a, b) => b.width - a.width)[0];
  if (!cover) return null;
  const body = probed.filter((p) => p !== cover && p.width >= BODY_MIN_W && p.height >= 300).slice(0, bodyLimit);
  return { cover, body };
}

export interface StoredImage {
  src: string;
  width: number;
  height: number;
}

/** Converte para WebP (até 1600 px) e grava em MEDIA_DIR/AAAA/MM/<nome>.webp. */
export async function storeImage(img: ProbedImage, name: string): Promise<StoredImage> {
  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const sharp = await loadSharp();
  let data = img.buf;
  let ext = img.type.includes("png") ? "png" : img.type.includes("webp") ? "webp" : "jpg";
  let { width, height } = img;
  if (sharp) {
    const out = await sharp(img.buf).rotate().resize({ width: OUT_W, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    data = out.data;
    ext = "webp";
    ({ width, height } = out.info);
  }
  const file = `${name}-${img.hash.slice(0, 8)}.${ext}`;
  await mkdir(join(mediaDir(), dir), { recursive: true });
  await writeFile(join(mediaDir(), dir, file), data);
  return { src: `/media/${dir}/${file}`, width, height };
}
