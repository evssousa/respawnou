// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// GET /admin/videos/capa/:id?img=3&foco=30,60 — prévia da primeira tela do vídeo (imagem enquadrada + moldura + cartão de título),
// montada com a mesma regra do gerador. Só admin. Não grava nada.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { Route } from "./+types/videos-capa";
import { requireAdmin } from "~/lib/admin/auth.server";
import { SOCIAL } from "~/social/config";
import { foco as focoValido } from "~/social/core/overrides";
import { VIDEO } from "~/video/config";
import { obterJob } from "~/video/fila.server";
import { rotuloDaSerie } from "~/video/series.server";
import { enquadrarVertical } from "~/video/gerador.server";
import { gerarQuadros } from "~/video/render/quadros.server";
import { mediaDir } from "../../../server-paths.mjs";

async function lerImagem(src: string): Promise<Buffer> {
  if (/^\/media\/[\w./-]+$/.test(src) && !src.includes("..")) return readFile(join(mediaDir(), src.slice("/media/".length)));
  const url = src.startsWith("http") ? src : `${SOCIAL.baseUrl}${src}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`imagem → HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const id = Number(params.id);
  const job = await obterJob(id);
  if (!job) return new Response("Vídeo não encontrado", { status: 404 });
  const q = new URL(request.url).searchParams;
  // O índice vai no caminho (e não só na query): a CDN da hospedagem pode ignorar a query e devolver sempre a primeira prévia.
  const indice = Number(params.img ?? q.get("img"));
  const alvo = Number.isInteger(indice) && indice >= 0 ? indice : Number(job.focus["_capa"] ?? job.script?.cenas[0]?.imagem ?? 0);
  const item = job.images[alvo];
  if (!item || item.src.startsWith("arte:") || item.src.startsWith("yt:") || /\.(mp4|webm)$/i.test(item.src)) return new Response("Essa opção não é uma imagem.", { status: 422 });
  const pedido = q.get("foco");
  const foco = pedido === "inteira" ? "inteira" : pedido ? focoValido(pedido) : String(job.focus[String(alvo)] ?? "auto");
  const cab = { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store, max-age=0", "CDN-Cache-Control": "no-store", Vary: "Cookie" };
  const secao = () => rotuloDaSerie(job.serie ?? "") || (SOCIAL.rotuloSecao[job.secao_post] ?? job.secao_post.toUpperCase());
  if (q.get("layout") === "dividido") {
    // Tela dividida: a 1ª tela do vídeo (quadro do vídeo mais próximo do ponto escolhido em cima, imagem 9:8 embaixo, divisória;
    // sem título, como no vídeo). A capa do Reel é a prévia sem `layout` (tela cheia).
    try {
      const pb = q.get("focob");
      const focoB = pb === "inteira" ? "inteira" : pb ? focoValido(pb) : String(job.focus[`b:${alvo}`] ?? "auto");
      const baixo = (await enquadrarVertical(await lerImagem(item.src), 1080, 960, focoB, 82)).jpeg;
      const iv = Number(q.get("topo"));
      const video = Number.isInteger(iv) ? job.images[iv] : undefined;
      const ss = Number(q.get("ss"));
      const trechos = video?.trechos ?? [];
      const quadro = q.get("ss") && Number.isFinite(ss) ? trechos.reduce<(typeof trechos)[number] | undefined>((a, t) => (!a || Math.abs(t.ss - ss) < Math.abs(a.ss - ss) ? t : a), undefined) : trechos[0];
      const inteiro = q.get("focot") === "inteira";
      let cima: Buffer;
      if (quadro) {
        const b = await lerImagem(quadro.thumb);
        cima = inteiro ? (await enquadrarVertical(b, 1080, 960, "inteira", 82)).jpeg : await sharp(b).resize(1080, 960, { fit: "cover", position: q.get("focot") === "west" ? "west" : q.get("focot") === "east" ? "east" : "centre" }).jpeg({ quality: 82 }).toBuffer();
      } else {
        const svg = Buffer.from(`<svg width="1080" height="960"><rect width="1080" height="960" fill="#111611"/><text x="540" y="500" font-size="96" fill="#8a9787" text-anchor="middle" font-family="sans-serif">VÍDEO</text></svg>`);
        cima = await sharp(svg).jpeg({ quality: 82 }).toBuffer();
      }
      const quadros = await gerarQuadros({ titulo: job.titulo_post, secao: secao(), cta: VIDEO.ctaCartao, dividido: true });
      const cheio = await sharp({ create: { width: 1080, height: 1920, channels: 3, background: "#060807" } })
        .composite([{ input: cima, top: 0, left: 0 }, { input: baixo, top: 960, left: 0 }, { input: quadros.moldura, top: 0, left: 0 }, { input: quadros.divisoria!, top: 880, left: 0 }])
        .jpeg({ quality: 88 })
        .toBuffer();
      const out = await sharp(cheio).resize(540, 960).jpeg({ quality: 82 }).toBuffer();
      return new Response(new Uint8Array(out), { headers: cab });
    } catch (err) {
      console.warn("[video] prévia dividida falhou:", String((err as Error)?.message ?? err));
      return new Response(`Não gerou: ${String((err as Error)?.message ?? err)}`, { status: 422 });
    }
  }
  try {
    const { jpeg } = await enquadrarVertical(await lerImagem(item.src), 1080, 1920, foco, 82);
    const quadros = await gerarQuadros({ titulo: job.titulo_post, secao: rotuloDaSerie(job.serie ?? "") || (SOCIAL.rotuloSecao[job.secao_post] ?? job.secao_post.toUpperCase()), cta: VIDEO.ctaCartao });
    // Compõe em tamanho cheio e só depois reduz (o sharp redimensiona a base ANTES de sobrepor as camadas).
    const cheio = await sharp(jpeg).composite([{ input: quadros.moldura }, { input: quadros.abertura }]).jpeg({ quality: 88 }).toBuffer();
    const out = await sharp(cheio).resize(540, 960).jpeg({ quality: 82 }).toBuffer();
    return new Response(new Uint8Array(out), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store, max-age=0", "CDN-Cache-Control": "no-store", Vary: "Cookie" } });
  } catch (err) {
    console.warn("[video] prévia da capa falhou:", String((err as Error)?.message ?? err));
    return new Response(`Não gerou: ${String((err as Error)?.message ?? err)}`, { status: 422 });
  }
}
