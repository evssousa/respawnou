// GET /admin/instagram/previa/:id?s=1&modelo=N — gera na hora (sem gravar) o slide pedido da matéria. Só admin.
import type { Route } from "./+types/instagram-previa";
import { requireAdmin } from "~/lib/admin/auth.server";
import { gerarSlides } from "~/social/render/slides.server";
import { escolherModelo, lerEntrada } from "~/social/site.server";
import type { Modelo } from "~/social/tipos";

const MODELOS: Modelo[] = ["N", "C-artigo", "C-review", "C-guia", "P1", "P2", "S"];

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const url = new URL(request.url);
  const e = await lerEntrada(Number(params.id));
  if (!e) return new Response("Matéria não encontrada", { status: 404 });
  const pedido = url.searchParams.get("modelo") as Modelo | null;
  const modelo = pedido && MODELOS.includes(pedido) ? pedido : escolherModelo(e);
  try {
    const { jpegs } = await gerarSlides(modelo, e);
    const n = Math.min(Math.max(1, Number(url.searchParams.get("s")) || 1), jpegs.length);
    return new Response(new Uint8Array(jpegs[n - 1]), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } });
  } catch (err) {
    return new Response(`Não gerou: ${String((err as Error)?.message ?? err)}`, { status: 422 });
  }
}
