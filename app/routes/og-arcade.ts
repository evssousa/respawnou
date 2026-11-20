// Imagem de compartilhamento de cada jogo do Arcade: GET /og/arcade/<slug>.png (1200x630).
// Montada na hora com sharp a partir de um SVG (nome, linha de busca e a miniatura do jogo) e guardada na memória.
// Fica fora de /arcade/ de propósito: o script de anúncios não pode ser carregado em nenhum endereço de jogo.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import type { Route } from "./+types/og-arcade";
import { ArcadeThumb } from "~/components/ArcadeThumb";
import { arcadeGame } from "~/lib/arcade";
import { ARCADE_SEO } from "~/lib/arcade-seo.server";

const cache = new Map<string, Buffer>();
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Quebra o nome em linhas de até `max` letras (o sharp não quebra texto sozinho). */
function wrap(text: string, max: number) {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if (cur && (cur + " " + w).length > max) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

async function render(slug: string): Promise<Buffer | null> {
  const game = arcadeGame(slug);
  if (!game) return null;
  const line = ARCADE_SEO[slug]?.h1Line ?? game.tagline;
  // A miniatura do jogo (SVG do catálogo) entra do lado direito, em 560x315.
  const thumb = renderToStaticMarkup(createElement(ArcadeThumb, { slug })).replace("<svg ", '<svg x="590" y="150" width="560" height="315" ');
  const name = wrap(game.name.toUpperCase(), 11);
  const nameSvg = name.map((l, i) => `<text x="64" y="${230 + i * 92}" font-family="Impact, 'Arial Black', sans-serif" font-size="86" fill="#eef3ea">${esc(l)}</text>`).join("");
  const lineY = 230 + name.length * 92 - 20;
  const lineSvg = wrap(line, 26)
    .map((l, i) => `<text x="64" y="${lineY + 40 + i * 34}" font-family="'Courier New', monospace" font-weight="bold" font-size="26" fill="#c8ff2e">${esc(l)}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#060807"/>
<rect x="578" y="138" width="584" height="339" fill="none" stroke="#243022" stroke-width="2"/>
${thumb}
${nameSvg}
${lineSvg}
<text x="64" y="580" font-family="'Courier New', monospace" font-weight="bold" font-size="22" fill="#8a9787">RESPAWNOU · ARCADE · GRÁTIS NO NAVEGADOR</text>
<rect y="622" width="1200" height="8" fill="#c8ff2e"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function loader({ params }: Route.LoaderArgs) {
  const slug = (params.file ?? "").replace(/\.png$/, "");
  let png = cache.get(slug) ?? null;
  if (!png) {
    png = await render(slug).catch((e) => {
      console.error(`[og-arcade] ${slug}: ${String(e?.message ?? e).slice(0, 100)}`);
      return null;
    });
    if (png) cache.set(slug, png);
  }
  if (!png) return new Response("Not Found", { status: 404 });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
}
