// GET /admin/videos/cartao/:id?tipo=preco&item=0 — miniatura (PNG) do cartão de dados com os fatos congelados do vídeo. Só admin.
import type { Route } from "./+types/videos-cartao";
import { requireAdmin } from "~/lib/admin/auth.server";
import type { TipoCartao } from "~/video/cartoes";
import { obterJob } from "~/video/fila.server";
import { gerarCartao } from "~/video/render/cartao.server";

const TIPOS: TipoCartao[] = ["preco", "lancamento", "nota", "requisitos", "gratis", "plataformas"];

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const job = await obterJob(Number(params.id));
  const q = new URL(request.url).searchParams;
  const tipo = q.get("tipo") as TipoCartao;
  if (!job || !job.facts || !TIPOS.includes(tipo)) return new Response("Sem prévia", { status: 404 });
  const c = await gerarCartao(tipo, job.facts as never, Number(q.get("item")) || 0);
  if (!c) return new Response("Sem dado para este cartão", { status: 422 });
  return new Response(new Uint8Array(c.png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=60" } });
}
