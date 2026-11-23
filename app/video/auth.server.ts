// Autenticação do worker de vídeo (GitHub Actions): cabeçalho Authorization: Bearer VIDEO_WORKER_SECRET, comparado em tempo constante.
import { timingSafeEqual } from "node:crypto";

export function workerAutorizado(request: Request): boolean {
  const esperado = process.env.VIDEO_WORKER_SECRET;
  if (!esperado || esperado.length < 32) return false;
  const dado = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(dado);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
