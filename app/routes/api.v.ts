// Sinal de visita (POST /api/v): o navegador avisa que uma página abriu. Sem cookie, sem guardar IP. Sempre responde 204.
import type { Route } from "./+types/api.v";
import { registrar } from "~/visitas/server/coleta.server";

const headers = { "Cache-Control": "no-store" };

export function loader() {
  return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
}

export async function action({ request }: Route.ActionArgs) {
  try {
    await registrar(request);
  } catch (e) {
    // nunca devolve erro ao navegador (nem registra o corpo, o IP ou o user-agent)
    console.error(`[visitas] falha ao registrar: ${String((e as Error)?.message ?? e).slice(0, 120)}`);
  }
  return new Response(null, { status: 204, headers });
}
