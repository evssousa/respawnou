// Resumo das visitas para o Escritório Claude (painel local do dono, http://localhost:4747).
//   GET /api/escritorio/visitas   com o cabeçalho x-cron-token
// Só números agregados (hoje, ontem, 7 e 30 dias), nada pessoal. Sem CRON_TOKEN configurado ou com token
// errado, responde 404 (a rota "não existe"). O mesmo arquivo existe nos outros sites.
import { timingSafeEqual } from "node:crypto";
import type { Route } from "./+types/api.escritorio";
import { diaBrasilia } from "~/visitas/core/dia";
import { cartoes } from "~/visitas/server/consultas.server";

function authorized(request: Request) {
  const expected = process.env.CRON_TOKEN;
  if (!expected || expected.length < 24) return false;
  const a = Buffer.from(request.headers.get("x-cron-token") ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!authorized(request) || params.what !== "visitas") return new Response("Not Found", { status: 404 });
  try {
    const c = await cartoes(diaBrasilia());
    return Response.json({ dia: diaBrasilia(), hoje: c.hoje, ontem: c.ontem, d7: c.d7, d30: c.d30 }, { headers });
  } catch {
    return Response.json({ erro: "sem banco" }, { status: 503, headers });
  }
}
