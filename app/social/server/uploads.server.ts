// Imagens enviadas pelo dono para os slides (frente C): valida, normaliza com sharp e grava em MEDIA_DIR/social/uploads/AAAA/MM.
import { createHash } from "node:crypto";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp, { type Metadata } from "sharp";
import { mediaDir } from "../../../server-paths.mjs";
import { lerOverrides } from "../core/overrides";
import { query } from "../db";

const MAX_BYTES = 10 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MIN_LADO = 600;

export class ErroUpload extends Error {}

/** Valida, normaliza (EXIF, até 2160 px, JPEG 88) e grava. Devolve o endereço público e um aviso se a imagem for pequena. */
export async function salvarUpload(socialId: number, file: File): Promise<{ src: string; largura: number; altura: number; aviso?: string }> {
  if (!file.size) throw new ErroUpload("Nenhum arquivo enviado.");
  if (file.size > MAX_BYTES) throw new ErroUpload("Imagem maior que 10 MB.");
  if (!TIPOS.includes(file.type)) throw new ErroUpload("Formato não aceito: use JPG, PNG, WebP ou AVIF (GIF não serve).");
  const buf = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    throw new ErroUpload("Não deu para ler a imagem.");
  }
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (Math.min(w, h) < MIN_LADO) throw new ErroUpload(`Imagem pequena demais (${w}×${h}): o menor lado precisa ter pelo menos ${MIN_LADO} px.`);
  const out = await sharp(buf).rotate().resize({ width: 2160, height: 2160, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const d = new Date();
  const dir = `social/uploads/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const nome = `u${socialId}-${createHash("sha1").update(out.data).digest("hex").slice(0, 8)}.jpg`;
  await mkdir(join(mediaDir(), dir), { recursive: true });
  await writeFile(join(mediaDir(), dir, nome), out.data);
  const largura = out.info.width;
  return { src: `/media/${dir}/${nome}`, largura, altura: out.info.height, ...(Math.max(w, h) < 1080 ? { aviso: `A imagem tem ${w}×${h} px; no Instagram pode ficar borrada.` } : {}) };
}

/** Apaga uploads com mais de 60 dias que nenhum item ainda na fila usa. */
export async function limparUploads(): Promise<void> {
  const raiz = join(mediaDir(), "social", "uploads");
  const limite = Date.now() - 60 * 86400_000;
  try {
    const linhas = await query<{ overrides: unknown }>("SELECT overrides FROM social_posts WHERE overrides IS NOT NULL AND status IN ('pending','preview','failed')");
    const usados = new Set<string>();
    for (const l of linhas) {
      const ov = lerOverrides(l.overrides);
      for (const t of Object.values(ov.trocas ?? {})) usados.add(t.src);
      for (const x of ov.extras ?? []) usados.add(x.src);
    }
    for (const ano of (await readdir(raiz)).filter((x) => /^\d{4}$/.test(x)))
      for (const mes of (await readdir(join(raiz, ano))).filter((x) => /^\d{2}$/.test(x)))
        for (const f of await readdir(join(raiz, ano, mes))) {
          const p = join(raiz, ano, mes, f);
          try {
            if ((await stat(p)).mtimeMs < limite && !usados.has(`/media/social/uploads/${ano}/${mes}/${f}`)) await rm(p, { force: true });
          } catch {
            /* segue */
          }
        }
  } catch {
    /* pasta ainda não existe */
  }
}
