// Recortes da capa em outras proporções para o Google Discover e os dados estruturados (docs/crescimento.md, D4):
// GET /media-crop/4x3/2026/11/<nome>.webp e /media-crop/1x1/... a partir do arquivo original em MEDIA_DIR.
// Feito na hora com sharp (recorte centrado, sem ampliar a imagem) e guardado em cache pelo navegador/CDN por 1 ano:
// o nome do arquivo original nunca é reaproveitado.
import { join } from "node:path";
import sharp from "sharp";
import type { Route } from "./+types/media-crop";
import { mediaDir } from "../../server-paths.mjs";

const RATIOS: Record<string, [number, number]> = { "4x3": [4, 3], "1x1": [1, 1] };
const FILE = /^\d{4}\/\d{2}\/[a-z0-9][a-z0-9-]*\.webp$/;

export async function loader({ params }: Route.LoaderArgs) {
  const ratio = RATIOS[params.ratio ?? ""];
  const rel = String(params["*"] ?? "");
  if (!ratio || !FILE.test(rel)) return new Response("Not Found", { status: 404 });
  try {
    const input = sharp(join(mediaDir(), rel));
    const { width = 0, height = 0 } = await input.metadata();
    if (!width || !height) return new Response("Not Found", { status: 404 });
    const [rw, rh] = ratio;
    // Maior região centrada com a proporção pedida, sem ampliar.
    let w = width;
    let h = Math.round((width * rh) / rw);
    if (h > height) {
      h = height;
      w = Math.round((height * rw) / rh);
    }
    const left = Math.floor((width - w) / 2);
    const top = Math.floor((height - h) / 2);
    const out = await input
      .extract({ left, top, width: w, height: h })
      .resize({ width: Math.min(w, 1200), withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return new Response(new Uint8Array(out), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
