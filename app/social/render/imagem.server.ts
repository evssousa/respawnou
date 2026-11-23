// Imagens da arte: local (/media/...) ou remota, recortadas no tamanho final e entregues como data URI (o satori não
// baixa nada sozinho e não deve receber JPEG enorme).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { mediaDir } from "../../../server-paths.mjs";
import { SOCIAL } from "../config";

async function bytes(src: string): Promise<Buffer | null> {
  try {
    if (src.startsWith("/media/")) {
      const rel = src.slice("/media/".length);
      if (!/^[\w./-]+$/.test(rel) || rel.includes("..")) return null;
      return await readFile(join(mediaDir(), rel));
    }
    const url = src.startsWith("http") ? src : `${SOCIAL.baseUrl}${src}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { "User-Agent": `${SOCIAL.site}/social` } });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Recorta (cover) para w×h e devolve data URI JPEG. Falhou: null (o modelo desenha um quadro sem imagem). */
export async function imagemDataUri(src: string | null | undefined, w: number, h: number, opts: { blur?: number; posicao?: string; zoom?: number; ancora?: "centre" | "west" | "east" | "north" | "south" } = {}): Promise<string | null> {
  if (!src) return null;
  const b = await bytes(src);
  if (!b) return null;
  try {
    let p: ReturnType<typeof sharp>;
    if (opts.zoom && opts.zoom > 1) {
      // Zoom: amplia o recorte e pega a região escolhida (esquerda, direita, topo, base ou centro): cada slide mostra um pedaço diferente.
      const W = Math.round(w * opts.zoom);
      const H = Math.round(h * opts.zoom);
      const grande = await sharp(b).resize(W, H, { fit: "cover" }).toBuffer();
      const a = opts.ancora ?? "centre";
      const left = a === "west" ? 0 : a === "east" ? W - w : Math.floor((W - w) / 2);
      const top = a === "north" ? 0 : a === "south" ? H - h : Math.floor((H - h) / 2);
      p = sharp(grande).extract({ left, top, width: w, height: h });
    } else p = sharp(b).resize(w, h, { fit: "cover", position: opts.posicao ?? "centre" });
    if (opts.blur) p = p.blur(opts.blur);
    const out = await p.jpeg({ quality: 84 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

let logoCache: string | undefined;
/** Logo do site (PNG quadrada) redimensionada, em data URI. */
export async function logoDataUri(tamanho = 128): Promise<string> {
  if (logoCache) return logoCache;
  const b = await readFile(join(process.cwd(), SOCIAL.logo));
  const out = await sharp(b).resize(tamanho, tamanho).png().toBuffer();
  logoCache = `data:image/png;base64,${out.toString("base64")}`;
  return logoCache;
}

/** Grade fina do fundo (linhas de 1 px a cada 54 px), gerada uma vez, como data URI PNG. */
let gradeCache: string | undefined;
export async function gradeDataUri(w = 1080, h = 1350): Promise<string> {
  if (gradeCache) return gradeCache;
  let linhas = "";
  for (let x = 0; x <= w; x += 54) linhas += `<rect x="${x}" y="0" width="1" height="${h}" fill="#1c241a" fill-opacity="0.6"/>`;
  for (let y = 0; y <= h; y += 54) linhas += `<rect x="0" y="${y}" width="${w}" height="1" fill="#1c241a" fill-opacity="0.6"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${linhas}</svg>`;
  const out = await sharp(Buffer.from(svg)).png().toBuffer();
  gradeCache = `data:image/png;base64,${out.toString("base64")}`;
  return gradeCache;
}
