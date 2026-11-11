// /ads.txt: declara quem pode vender anúncios no site. Só existe com ADSENSE_CLIENT configurado.
import { adsenseClient } from "~/lib/ads";

export function loader() {
  const client = adsenseClient();
  if (!client) return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  // f08c47fec0942fa0 é o ID fixo do Google na Trustworthy Accountability Group (TAG).
  const body = `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
