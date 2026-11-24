// Baixa o vídeo de um link (YouTube ou arquivo MP4/WebM direto) para usar em trechos curtos, sempre com crédito.
// Usa o yt-dlp (binário único, baixado na primeira vez para a pasta temporária do sistema e atualizado a cada 7 dias).
// O YouTube costuma bloquear downloads vindos de servidores: quando isso acontece, a mensagem pede o envio manual do arquivo.
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { caminhoFfmpeg } from "./gerador.server";

const WIN = process.platform === "win32";
const URL_BIN = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${WIN ? "yt-dlp.exe" : "yt-dlp_linux"}`;
const MAX_DURACAO_S = 25 * 60;
export const MAX_BYTES_LINK = 80 * 1024 * 1024;

export class ErroLink extends Error {}

const HOSTS_YOUTUBE = /^(www\.|m\.|music\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i;

/** Só YouTube ou arquivo de vídeo direto (https). Qualquer outra coisa é recusada. */
export function linkPermitido(entrada: string, liberarQualquer = false): URL {
  let u: URL;
  try {
    u = new URL(entrada.trim());
  } catch {
    throw new ErroLink("Link inválido.");
  }
  if (liberarQualquer) return u;
  if (u.protocol !== "https:") throw new ErroLink("Use um link https.");
  if (HOSTS_YOUTUBE.test(u.hostname) || /\.(mp4|webm)$/i.test(u.pathname)) return u;
  throw new ErroLink("Só aceito links do YouTube ou de um arquivo MP4/WebM direto.");
}

interface Comando {
  cmd: string;
  pre: string[];
}
let escolhido: Comando | null = null;

/** Pastas candidatas para guardar o programa: /tmp costuma ser "noexec" na hospedagem (EACCES), então a de casa vem primeiro. */
const PASTAS = () => [join(homedir(), "respawnou-bin"), join(process.cwd(), ".bin"), join(tmpdir(), "respawnou-bin")];

async function baixarArquivo(url: string, destino: string): Promise<void> {
  const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(120_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, Buffer.from(await r.arrayBuffer()));
}

const executa = (cmd: string, args: string[]) =>
  new Promise<boolean>((ok) => {
    const p = spawn(cmd, args, { stdio: "ignore" });
    const t = setTimeout(() => p.kill("SIGKILL"), 20_000);
    p.on("error", () => (clearTimeout(t), ok(false)));
    p.on("close", (c) => (clearTimeout(t), ok(c === 0)));
  });

async function arquivoValido(caminho: string): Promise<boolean> {
  try {
    const s = await stat(caminho);
    return s.size > 500_000 && Date.now() - s.mtimeMs < 14 * 86400_000;
  } catch {
    return false;
  }
}

/** Acha um jeito de executar o yt-dlp: binário único numa pasta que permita execução; se nenhuma permitir, o .pyz com python3. */
async function garantirBinario(): Promise<Comando> {
  if (escolhido) return escolhido;
  const falhas: string[] = [];
  for (const dir of PASTAS()) {
    const bin = join(dir, WIN ? "yt-dlp.exe" : "yt-dlp");
    try {
      if (!(await arquivoValido(bin))) {
        await baixarArquivo(URL_BIN, bin);
        if (!WIN) await chmod(bin, 0o755);
      }
      if (await executa(bin, ["--version"])) return (escolhido = { cmd: bin, pre: [] });
      falhas.push(`${dir}: não executa`);
    } catch (e) {
      falhas.push(`${dir}: ${String((e as Error).message)}`);
    }
  }
  if (!WIN) {
    for (const dir of PASTAS()) {
      const pyz = join(dir, "yt-dlp.pyz");
      try {
        if (!(await arquivoValido(pyz))) await baixarArquivo("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp", pyz);
        for (const py of ["python3", "python"]) if (await executa(py, [pyz, "--version"])) return (escolhido = { cmd: py, pre: [pyz] });
      } catch (e) {
        falhas.push(`${dir} (pyz): ${String((e as Error).message)}`);
      }
    }
  }
  console.warn("[video] yt-dlp indisponível:", falhas.join(" | "));
  throw new ErroLink("Não consegui preparar o programa de download no servidor (a hospedagem bloqueia a execução). Use o envio manual do arquivo.");
}

function rodar(bin: Comando, args: string[], timeoutMs: number): Promise<{ out: string; err: string }> {
  return new Promise((ok, erro) => {
    const p = spawn(bin.cmd, [...bin.pre, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const t = setTimeout(() => p.kill("SIGKILL"), timeoutMs);
    p.stdout.on("data", (d) => (out += String(d)));
    p.stderr.on("data", (d) => (err += String(d)));
    p.on("error", (e) => (clearTimeout(t), erro(e)));
    p.on("close", (c) => {
      clearTimeout(t);
      c === 0 ? ok({ out, err }) : erro(new ErroLink(traduzir(err || out)));
    });
  });
}

function traduzir(msg: string): string {
  if (/sign in to confirm|not a bot|HTTP Error 429|Too Many Requests/i.test(msg)) return "O YouTube bloqueou o download vindo do servidor. Baixe o vídeo no seu computador e use o envio manual do arquivo.";
  if (/Private video|members-only|age|Sign in/i.test(msg)) return "Esse vídeo é privado, restrito ou exige login. Use o envio manual do arquivo.";
  if (/Video unavailable|not available|removed/i.test(msg)) return "Vídeo indisponível.";
  if (/File is larger than max-filesize/i.test(msg)) return "O vídeo passa de 80 MB. Envie manualmente um trecho menor.";
  return `Não consegui baixar: ${msg.replace(/\s+/g, " ").trim().slice(-200)}`;
}

/** Baixa o vídeo (até 720p, 80 MB, 25 min) e devolve os bytes, o tipo e o crédito sugerido (canal + site). */
export async function baixarPorLink(entrada: string, liberarQualquer = false): Promise<{ buf: Buffer; tipo: "video/mp4" | "video/webm"; credito: string; titulo: string }> {
  const url = linkPermitido(entrada, liberarQualquer);
  const bin = await garantirBinario();
  const ff = await caminhoFfmpeg();
  const comuns = ["--no-playlist", "--no-warnings", "--no-progress", "--ffmpeg-location", ff];
  const meta = await rodar(bin, [...comuns, "-J", "--skip-download", url.href], 90_000);
  let info: { uploader?: string; channel?: string; title?: string; duration?: number; extractor_key?: string };
  try {
    info = JSON.parse(meta.out);
  } catch {
    throw new ErroLink("Não consegui ler as informações do vídeo.");
  }
  if (info.duration && info.duration > MAX_DURACAO_S) throw new ErroLink("O vídeo tem mais de 25 minutos. Envie manualmente só o trecho que interessa.");
  const dir = await mkdtemp(join(tmpdir(), "ytdl-"));
  try {
    await rodar(bin, [...comuns, "-f", "b[ext=mp4][height<=720]/b[height<=720]/b[ext=mp4]/b", "--max-filesize", String(MAX_BYTES_LINK), "-o", join(dir, "v.%(ext)s"), url.href], 5 * 60_000);
    const arq = (await readdir(dir)).find((f) => /^v\.(mp4|webm)$/i.test(f));
    if (!arq) throw new ErroLink("O download terminou sem gerar um arquivo MP4/WebM utilizável.");
    const buf = await readFile(join(dir, arq));
    const nome = (info.channel || info.uploader || "").trim();
    const site = /youtube/i.test(info.extractor_key ?? "") ? "YouTube" : url.hostname.replace(/^www\./, "");
    return { buf, tipo: /\.webm$/i.test(arq) ? "video/webm" : "video/mp4", credito: nome ? `${nome} (${site})` : site, titulo: info.title ?? "" };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
