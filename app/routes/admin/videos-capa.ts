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
  const indice = Number(q.get("img"));
  const alvo = Number.isInteger(indice) && indice >= 0 ? indice : Number(job.focus["_capa"] ?? job.script?.cenas[0]?.imagem ?? 0);
  const item = job.images[alvo];
  if (!item || item.src.startsWith("arte:") || item.src.startsWith("yt:") || /\.(mp4|webm)$/i.test(item.src)) return new Response("Essa opção não é uma imagem.", { status: 422 });
  const pedido = q.get("foco");
  const foco = pedido === "inteira" ? "inteira" : pedido ? focoValido(pedido) : String(job.focus[String(alvo)] ?? "auto");
  try {
    const { jpeg } = await enquadrarVertical(await lerImagem(item.src), 1080, 1920, foco, 82);
    const quadros = await gerarQuadros({ titulo: job.titulo_post, secao: rotuloDaSerie(job.serie ?? "") || (SOCIAL.rotuloSecao[job.secao_post] ?? job.secao_post.toUpperCase()), cta: VIDEO.ctaCartao });
    // Compõe em tamanho cheio e só depois reduz (o sharp redimensiona a base ANTES de sobrepor as camadas).
    const cheio = await sharp(jpeg).composite([{ input: quadros.moldura }, { input: quadros.abertura }]).jpeg({ quality: 88 }).toBuffer();
    const out = await sharp(cheio).resize(540, 960).jpeg({ quality: 82 }).toBuffer();
    return new Response(new Uint8Array(out), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.warn("[video] prévia da capa falhou:", String((err as Error)?.message ?? err));
    return new Response(`Não gerou: ${String((err as Error)?.message ?? err)}`, { status: 422 });
  }
}
