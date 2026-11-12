// Envio de imagem pelo painel (capa ou corpo de matéria). Só POST, só admin, só imagem até 10 MB.
// A imagem vira WebP (até 1600 px) em /media, igual às baixadas pelo robô. Responde { src, width, height }.
import type { Route } from "./+types/upload";
import { requireAdmin } from "~/lib/admin/auth.server";
import { storeUpload } from "~/lib/robot/media.server";
import { slugify } from "~/lib/robot/text";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export async function loader() {
  return new Response("Use POST", { status: 405 });
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Imagem maior que 10 MB." }, { status: 413 });
  if (!TYPES.includes(file.type)) return Response.json({ error: "Formato não aceito (use JPG, PNG, WebP, AVIF ou GIF)." }, { status: 415 });
  const name = slugify(String(form.get("name") ?? file.name.replace(/\.[a-z0-9]+$/i, "")), 60) || "imagem";
  const stored = await storeUpload(Buffer.from(await file.arrayBuffer()), file.type, `painel-${name}`);
  if (!stored) return Response.json({ error: "Não deu para ler a imagem." }, { status: 422 });
  return Response.json(stored);
}
