// GET /api/video/proximo: o worker pede o próximo vídeo aprovado (e o site o marca como "gerando"). 401 sem o segredo.
import type { Route } from "./+types/api-video-proximo";
import { workerAutorizado } from "~/video/auth.server";
import { proximo } from "~/video/fila.server";
import { hasDatabase } from "~/lib/db.server";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function loader({ request }: Route.LoaderArgs) {
  if (!workerAutorizado(request)) return new Response("Não autorizado", { status: 401, headers });
  if (!hasDatabase()) return new Response("Sem banco", { status: 503, headers });
  const pacote = await proximo();
  return pacote ? Response.json(pacote, { headers }) : new Response(null, { status: 204, headers });
}
