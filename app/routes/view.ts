// Contador de visitas das matérias. A página da matéria avisa aqui (POST, depois de carregar no
// navegador), então robôs de busca e pré-carregamentos de link não contam. Ignora também:
// bots pelo user-agent, a mesma pessoa vendo a mesma matéria de novo em 30 min e o admin logado.
import { isbot } from "isbot";
import type { Route } from "./+types/view";
import { db } from "~/lib/db.server";

const WINDOW_MS = 30 * 60_000;
const seen = new Map<string, number>();

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
}

export async function loader() {
  return new Response(null, { status: 405 });
}

export async function action({ request }: Route.ActionArgs) {
  const done = new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (isbot(request.headers.get("user-agent") ?? "")) return done;
  if ((request.headers.get("cookie") ?? "").includes("__respawnou_admin=")) return done;
  // Só do próprio site.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return done;

  let path = "";
  try {
    path = String(((await request.json()) as { path?: string }).path ?? "");
  } catch {
    return done;
  }
  const m = path.match(/^\/([a-z]+)\/([a-z0-9-]{1,200})$/);
  if (!m) return done;

  const key = `${clientIp(request)} ${path}`;
  const now = Date.now();
  if (now - (seen.get(key) ?? 0) < WINDOW_MS) return done;
  seen.set(key, now);
  if (seen.size > 50_000) for (const [k, t] of seen) if (now - t > WINDOW_MS) seen.delete(k);

  await db().query("UPDATE posts SET views = views + 1 WHERE section = ? AND slug = ? AND status = 'published'", [m[1], m[2]]);
  return done;
}
