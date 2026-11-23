// Worker de vídeo (GitHub Actions ou local): pede o próximo job aprovado ao site, gera voz + montagem e devolve o MP4.
// Uso: npx tsx scripts/video/worker.ts   (a partir da raiz do projeto)
// Env: SITE_URL, VIDEO_WORKER_SECRET, ELEVENLABS_API_KEY; opcionais: FFMPEG (caminho), FAKE_VOICE=1 (sem gastar créditos), DRY_OUT=pasta (não envia: guarda o resultado lá).
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { gerarQuadros } from "../../app/video/render/quadros.server";
import { gerarAss, palavrasDoAlinhamento, segmentos } from "./ass";
import { alinhamentoFalso, sintetizar } from "./elevenlabs";
import { montar } from "./ffmpeg";

interface Pacote {
  id: number;
  titulo: string;
  secao: string;
  roteiro: { gancho: string; cenas: { fala: string; imagem: number }[]; titulo_curto: string };
  imagens: { src: string; url: string; foco: string }[];
  voz: string;
  modelo: string;
  velocidade: number;
  falado: string;
  fechamento: string;
  cta: string;
}

const SITE = (process.env.SITE_URL ?? "").replace(/\/$/, "");
const SEGREDO = process.env.VIDEO_WORKER_SECRET ?? "";
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const auth = { Authorization: `Bearer ${SEGREDO}` };

function rodar(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((ok, erro) => {
    const p = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += String(d)));
    p.on("error", erro);
    p.on("close", (c) => (c === 0 ? ok(err) : erro(new Error(`${cmd} saiu com ${c}: ${err.slice(-800)}`))));
  });
}

const POSICAO: Record<string, string | number> = { auto: sharp.strategy.attention, centre: "centre", north: "north", south: "south", west: "west", east: "east" };

async function baixar(url: string): Promise<Buffer> {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "respawnou-video" } });
  if (!r.ok) throw new Error(`imagem ${url} → HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function gerarVideo(p: Pacote, dir: string): Promise<{ mp4: string; capa: Buffer; chars: number; duracao: number }> {
  // 1) Voz (ou voz falsa de teste)
  let alin;
  let audio = "voz.mp3";
  if (process.env.FAKE_VOICE === "1") {
    alin = alinhamentoFalso(p.falado);
    const dur = alin.character_end_times_seconds[alin.character_end_times_seconds.length - 1];
    await rodar(FFMPEG, ["-y", "-hide_banner", "-loglevel", "warning", "-f", "lavfi", "-i", `sine=frequency=220:duration=${dur.toFixed(2)}`, "-c:a", "libmp3lame", audio], dir);
  } else {
    const chave = process.env.ELEVENLABS_API_KEY;
    if (!chave) throw new Error("ELEVENLABS_API_KEY ausente");
    if (!p.voz) throw new Error("nenhuma voz configurada para esta editoria (painel /admin/videos)");
    const s = await sintetizar({ chave, voz: p.voz, modelo: p.modelo, velocidade: p.velocidade, texto: p.falado });
    alin = s.alinhamento;
    await writeFile(join(dir, audio), s.mp3);
  }
  const palavras = palavrasDoAlinhamento(alin);
  const falas = p.roteiro.cenas.map((c) => c.fala.replace(/[.!?…]+$/, ""));
  const seg = segmentos(palavras, p.roteiro.gancho.replace(/[.!?…]+$/, ""), falas, p.fechamento.replace(/[.!?…]+$/, ""));

  // 2) Legenda: só as palavras das cenas
  const nG = p.roteiro.gancho.replace(/[.!?…]+$/, "").trim().split(/\s+/).length;
  const nCenas = falas.reduce((a, f) => a + f.trim().split(/\s+/).length, 0);
  await writeFile(join(dir, "legenda.ass"), gerarAss(palavras.slice(nG, nG + nCenas)));
  await mkdir(join(dir, "fonts"), { recursive: true });
  await copyFile(join(process.cwd(), "app/video/fonts/Anton-Regular.ttf"), join(dir, "fonts/Anton-Regular.ttf"));

  // 3) Imagens 2160×3840 por segmento (abertura usa a imagem da 1ª cena)
  const primeira = p.imagens.find((x) => x.url && !x.url.startsWith("arte:"));
  if (!primeira) throw new Error("nenhuma imagem utilizável");
  const cache = new Map<number, string>();
  const preparar = async (indice: number): Promise<string> => {
    if (cache.has(indice)) return cache.get(indice)!;
    const img = p.imagens[indice];
    const usa = img && img.url && !img.url.startsWith("arte:") ? img : primeira;
    const nome = `cena${indice}.jpg`;
    const buf = await baixar(usa.url);
    await sharp(buf).rotate().resize(2160, 3840, { fit: "cover", position: POSICAO[usa.foco] ?? sharp.strategy.attention }).jpeg({ quality: 90 }).toFile(join(dir, nome));
    cache.set(indice, nome);
    return nome;
  };
  const imagens: string[] = [];
  for (const s of seg.segs) if (s.tipo !== "fechamento") imagens.push(await preparar(p.roteiro.cenas[s.cena]?.imagem ?? 0));

  // 4) Quadros (marca, abertura, fechamento) e montagem
  const q = await gerarQuadros({ titulo: p.titulo, secao: p.secao, cta: p.cta });
  await writeFile(join(dir, "moldura.png"), q.moldura);
  await writeFile(join(dir, "abertura.png"), q.abertura);
  await writeFile(join(dir, "fechamento.png"), q.fechamento);
  const fimAbertura = seg.segs.find((s) => s.tipo === "abertura")?.fim ?? 3;
  const { args, filtro } = montar({ segs: seg.segs, imagens, total: seg.total, fimAbertura, inicioFechamento: seg.inicioFechamento, arq: { moldura: "moldura.png", abertura: "abertura.png", fechamento: "fechamento.png", audio, legenda: "legenda.ass", saida: "saida.mp4" } });
  await writeFile(join(dir, "filtro.txt"), filtro);
  await rodar(FFMPEG, args, dir);

  // 5) Capa: 1º quadro com moldura e cartão de abertura por cima
  const base = await sharp(join(dir, imagens[0])).resize(1080, 1920, { fit: "cover" }).toBuffer();
  const capa = await sharp(base).composite([{ input: q.moldura }, { input: q.abertura }]).jpeg({ quality: 88 }).toBuffer();
  return { mp4: join(dir, "saida.mp4"), capa, chars: p.falado.length, duracao: seg.total };
}

async function main() {
  if (!SITE || !SEGREDO) throw new Error("SITE_URL e VIDEO_WORKER_SECRET são obrigatórios");
  const r = await fetch(`${SITE}/api/video/proximo`, { headers: auth, signal: AbortSignal.timeout(30_000) });
  if (r.status === 204) return console.log("Nenhum vídeo aprovado na fila.");
  if (!r.ok) throw new Error(`/api/video/proximo → ${r.status}`);
  const p = (await r.json()) as Pacote;
  console.log(`Vídeo #${p.id}: ${p.titulo}`);
  const dir = await mkdtemp(join(tmpdir(), "video-"));
  try {
    const out = await gerarVideo(p, dir);
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
