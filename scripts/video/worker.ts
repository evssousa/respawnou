// Worker de vídeo (GitHub Actions ou local): pede o próximo job aprovado ao site, gera voz + montagem e devolve o MP4.
// Uso: npx tsx scripts/video/worker.ts   (a partir da raiz do projeto)
// Env: SITE_URL, VIDEO_WORKER_SECRET, ELEVENLABS_API_KEY; opcionais: FFMPEG (caminho), FAKE_VOICE=1 (sem gastar créditos), DRY_OUT=pasta (não envia: guarda o resultado lá).
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { caminhoFfmpeg, gerarVideo, type PacoteVideo } from "../../app/video/gerador.server";

type Pacote = PacoteVideo;

const SITE = (process.env.SITE_URL ?? "").replace(/\/$/, "");
const SEGREDO = process.env.VIDEO_WORKER_SECRET ?? "";
const auth = { Authorization: `Bearer ${SEGREDO}` };

async function main() {
  if (!SITE || !SEGREDO) throw new Error("SITE_URL e VIDEO_WORKER_SECRET são obrigatórios");
  const r = await fetch(`${SITE}/api/video/proximo`, { headers: auth, signal: AbortSignal.timeout(30_000) });
  if (r.status === 204) return console.log("Nenhum vídeo aprovado na fila.");
  if (!r.ok) throw new Error(`/api/video/proximo → ${r.status}`);
  const p = (await r.json()) as Pacote;
  console.log(`Vídeo #${p.id}: ${p.titulo}`);
  const dir = await mkdtemp(join(tmpdir(), "video-"));
  try {
    const out = await gerarVideo(p, dir, { ffmpeg: await caminhoFfmpeg(), qualidade: "alta", vozFalsa: process.env.FAKE_VOICE === "1" });
    if (process.env.DRY_OUT) {
      await mkdir(process.env.DRY_OUT, { recursive: true });
      await copyFile(out.mp4, join(process.env.DRY_OUT, `v${p.id}.mp4`));
      await writeFile(join(process.env.DRY_OUT, `v${p.id}.jpg`), out.capa);
      return console.log(`Pronto (teste, não enviado): ${process.env.DRY_OUT}`);
    }
    const f = new FormData();
    f.set("video", new Blob([await readFile(out.mp4)], { type: "video/mp4" }), `v${p.id}.mp4`);
    f.set("capa", new Blob([new Uint8Array(out.capa)], { type: "image/jpeg" }), `v${p.id}.jpg`);
    f.set("chars", String(out.chars));
    f.set("duracao", String(out.duracao));
    const up = await fetch(`${SITE}/api/video/${p.id}/pronto`, { method: "POST", headers: auth, body: f, signal: AbortSignal.timeout(180_000) });
    if (!up.ok) throw new Error(`envio do vídeo → ${up.status} ${await up.text()}`);
    console.log("Enviado.");
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    console.error(msg);
    if (!process.env.DRY_OUT) await fetch(`${SITE}/api/video/${p.id}/falhou`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ erro: msg }) }).catch(() => undefined);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
