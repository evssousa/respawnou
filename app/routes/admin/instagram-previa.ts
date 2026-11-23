// GET /admin/instagram/previa/:id?s=1&modelo=N — gera na hora (sem gravar) o slide pedido da matéria. Só admin.
// ?info=1 devolve { slides, modelo, legenda } em JSON. As artes ficam 5 min em memória, para passar os slides sem gerar tudo de novo.
import type { Route } from "./+types/instagram-previa";
import { requireAdmin } from "~/lib/admin/auth.server";
import { montarLegenda } from "~/social/core/legenda";
import { gerarSlides, gerarStory } from "~/social/render/slides.server";
import { escolherModelo, lerEntrada } from "~/social/site.server";
import type { Modelo } from "~/social/tipos";

const MODELOS: Modelo[] = ["N", "C-artigo", "C-review", "C-guia", "P1", "P2", "S"];
const cache = new Map<string, { at: number; jpegs: Buffer[]; legenda: string; modelo: Modelo }>();

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const url = new URL(request.url);
  const id = Number(params.id);
  const pedido = url.searchParams.get("modelo") as Modelo | null;
  const story = url.searchParams.get("formato") === "story";
  const chave = `${id}:${pedido ?? ""}:${story ? "st" : "f"}`;
  let item = cache.get(chave);
  if (!item || Date.now() - item.at > 5 * 60_000) {
    const e = await lerEntrada(id);
    if (!e) return new Response("Matéria não encontrada", { status: 404 });
    const modelo = pedido && MODELOS.includes(pedido) ? pedido : escolherModelo(e);
    try {
      if (story) {
        const jpeg = await gerarStory(modelo, e, { noFeed: false });
        item = { at: Date.now(), jpegs: [jpeg], legenda: "", modelo };
      } else {
        const { jpegs, pontos } = await gerarSlides(modelo, e);
        if (pontos) e.pontos = pontos;
        item = { at: Date.now(), jpegs, legenda: montarLegenda(e, modelo), modelo };
      }
      if (cache.size > 30) cache.clear();
      cache.set(chave, item);
    } catch (err) {
      return new Response(`Não gerou: ${String((err as Error)?.message ?? err)}`, { status: 422 });
    }
  }
  if (url.searchParams.get("info") === "1") return Response.json({ slides: item.jpegs.length, modelo: item.modelo, legenda: item.legenda }, { headers: { "Cache-Control": "no-store" } });
  const n = Math.min(Math.max(1, Number(url.searchParams.get("s")) || 1), item.jpegs.length);
  return new Response(new Uint8Array(item.jpegs[n - 1]), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });
}
