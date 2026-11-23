// POST /api/video/:id/pronto (multipart: video mp4, capa jpg, chars, duracao) e POST /api/video/:id/falhou (JSON { erro }).
import type { Route } from "./+types/api-video-job";
import { workerAutorizado } from "~/video/auth.server";
import { concluir, falhar } from "~/video/fila.server";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
const MAX_VIDEO = 60 * 1024 * 1024;

export async function loader() {
  return new Response("Use POST", { status: 405, headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  if (!workerAutorizado(request)) return new Response("Não autorizado", { status: 401, headers });
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return new Response("Id inválido", { status: 400, headers });
  if (params.acao === "falhou") {
    const corpo = (await request.json().catch(() => ({}))) as { erro?: string };
    await falhar(id, String(corpo.erro ?? "falha no gerador"));
    return Response.json({ ok: true }, { headers });
  }
  if (params.acao === "pronto") {
    const f = await request.formData();
    const video = f.get("video");
    const capa = f.get("capa");
    if (!(video instanceof File) || !(capa instanceof File) || !video.size || !capa.size) return new Response("Faltam video e capa", { status: 400, headers });
    if (video.size > MAX_VIDEO) return new Response("Vídeo grande demais", { status: 413, headers });
    await concluir(id, { video: Buffer.from(await video.arrayBuffer()), capa: Buffer.from(await capa.arrayBuffer()), chars: Number(f.get("chars")) || 0, duracao: Number(f.get("duracao")) || 0 });
    return Response.json({ ok: true }, { headers });
  }
  return new Response("Não encontrado", { status: 404, headers });
}
