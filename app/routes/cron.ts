// Rotas do robô, chamadas pelo Cron Job da Hostinger:
//   GET /api/cron/coletar?token=...   lê os feeds e enche a fila de pautas
//   GET /api/cron/publicar?token=...  publica 1 matéria (respeita horário, limite e intervalo)
//   GET /api/cron/status?token=...    últimas execuções (com o rascunho dos testes dry=1)
//   GET /api/cron/diag?token=...      testa os modelos do Gemini (resultado em /status)
// Parâmetros extras de publicar: dry=1 (gera sem gravar), force=1 (ignora horário/limite),
// refazer=<id do post> (reescreve um post do robô com as regras atuais, mesmo endereço).
//
// A CDN da Hostinger corta requisições com mais de ~1 min (devolve 307), e o Gemini pode levar
// mais que isso. Por isso coletar/publicar respondem 202 na hora e rodam em segundo plano;
// o resultado fica em cron_runs (veja /status). wait=1 espera o fim (uso local).
// Sem CRON_TOKEN configurado ou com token errado, responde 404 (a rota "não existe").
import { timingSafeEqual } from "node:crypto";
import type { Route } from "./+types/cron";
import { hasDatabase } from "~/lib/db.server";
import { collect, diag, publish, recentRuns, type JobResult } from "~/lib/robot/robot.server";

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
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!authorized(request) || !hasDatabase()) return notFound();
  const url = new URL(request.url);
  const flag = (k: string) => url.searchParams.get(k) === "1";

  if (params.job === "status") return Response.json(await recentRuns(Number(url.searchParams.get("n")) || 10), { headers });

  let job: () => Promise<JobResult>;
  if (params.job === "coletar") job = collect;
  else if (params.job === "diag") job = diag;
  else if (params.job === "publicar") job = () => publish({ dry: flag("dry"), force: flag("force"), redoPostId: Number(url.searchParams.get("refazer")) || undefined });
  else return notFound();

  if (!flag("wait")) {
    // runJob já captura e registra os erros; o catch é só uma rede de segurança.
    job().catch((err) => console.error(`[robô] ${params.job}:`, err));
    return Response.json({ status: "started", message: "Rodando em segundo plano; veja /api/cron/status." }, { status: 202, headers });
  }
  const result = await job();
  return Response.json(result, { status: result.status === "error" ? 500 : 200, headers });
}
