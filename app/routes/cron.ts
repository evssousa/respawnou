// Rotas do robô, chamadas pelo Cron Job da Hostinger:
//   GET /api/cron/coletar?token=...   lê os feeds e enche a fila de pautas
//   GET /api/cron/publicar?token=...  publica 1 matéria (respeita horário, limite e intervalo)
// Parâmetros extras de publicar: dry=1 (gera sem gravar), force=1 (ignora horário/limite).
// Sem CRON_TOKEN configurado ou com token errado, responde 404 (a rota "não existe").
import { timingSafeEqual } from "node:crypto";
import type { Route } from "./+types/cron";
import { hasDatabase } from "~/lib/db.server";
import { collect, publish } from "~/lib/robot/robot.server";

function authorized(request: Request) {
  const expected = process.env.CRON_TOKEN;
  if (!expected || expected.length < 24) return false;
  const url = new URL(request.url);
  const given = request.headers.get("x-cron-token") ?? url.searchParams.get("token") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const notFound = () => new Response("Not Found", { status: 404 });

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!authorized(request) || !hasDatabase()) return notFound();
  const url = new URL(request.url);
  const flag = (k: string) => url.searchParams.get(k) === "1";

  let result;
  if (params.job === "coletar") result = await collect();
  else if (params.job === "publicar") result = await publish({ dry: flag("dry"), force: flag("force") });
  else return notFound();

  return Response.json(result, {
    status: result.status === "error" ? 500 : 200,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
