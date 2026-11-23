// Montagem do vídeo com ffmpeg: Ken Burns por cena (zoompan sobre imagem 2160×3840), moldura e cartão de abertura por cima,
// fechamento, legenda ASS queimada e só a narração no áudio (normalizada). Aqui só se monta o comando; quem roda é o worker.
import type { Segmento } from "./ass";

export const FPS = 30;

export interface PlanoMontagem {
  segs: Segmento[];
  /** Arquivo de imagem (2160×3840) de cada segmento `abertura`/`cena`, na ordem dos segmentos (o fechamento não tem). */
  imagens: string[];
  total: number;
  fimAbertura: number;
  inicioFechamento: number;
  /** Nomes dos arquivos na pasta de trabalho. */
  arq: { moldura: string; abertura: string; fechamento: string; audio: string; legenda: string; saida: string };
  /** Servidor compartilhado: preset mais rápido e 2 threads. */
  leve?: boolean;
}

/** Movimentos em ordem de revezamento: zoom in, panorâmica →, zoom out, panorâmica ↓. */
export function movimento(i: number, quadros: number): { z: string; x: string; y: string } {
  const N = Math.max(1, quadros);
  const cx = "iw/2-(iw/zoom/2)";
  const cy = "ih/2-(ih/zoom/2)";
  switch (i % 4) {
    case 0:
      return { z: `1+0.10*on/${N}`, x: cx, y: cy };
    case 1:
      return { z: "1.12", x: `(iw-iw/zoom)*on/${N}`, y: cy };
    case 2:
      return { z: `1.10-0.10*on/${N}`, x: cx, y: cy };
    default:
      return { z: "1.12", x: cx, y: `(ih-ih/zoom)*on/${N}` };
  }
}

const seg3 = (n: number) => n.toFixed(3);

/** Argumentos do ffmpeg (a pasta de trabalho é o cwd; o filtergraph vai em arquivo para fugir de aspas). */
export function montar(plano: PlanoMontagem): { args: string[]; filtro: string } {
  const { segs, imagens, total, fimAbertura, inicioFechamento, arq } = plano;
  const args: string[] = ["-y", "-hide_banner", "-loglevel", "warning"];
  const nomes: string[] = [];
  let idx = 0;
  const partes: string[] = [];
  let ordem = 0;
  for (const s of segs) {
    if (s.tipo === "fechamento") continue;
    const dur = Math.max(0.1, s.fim - s.ini);
    args.push("-loop", "1", "-framerate", String(FPS), "-t", seg3(dur), "-i", imagens[ordem]);
    const m = movimento(ordem, Math.round(dur * FPS));
    partes.push(`[${idx}:v]zoompan=z='${m.z}':x='${m.x}':y='${m.y}':d=1:s=1080x1920:fps=${FPS},setsar=1,format=yuv420p[s${idx}]`);
    nomes.push(`[s${idx}]`);
    idx++;
    ordem++;
  }
  const fech = segs.find((s) => s.tipo === "fechamento");
  if (fech) {
    args.push("-loop", "1", "-framerate", String(FPS), "-t", seg3(Math.max(0.1, fech.fim - fech.ini)), "-i", arq.fechamento);
    partes.push(`[${idx}:v]scale=1080:1920,setsar=1,format=yuv420p[s${idx}]`);
    nomes.push(`[s${idx}]`);
    idx++;
  }
  const iMold = idx++;
  args.push("-loop", "1", "-framerate", String(FPS), "-t", seg3(total), "-i", arq.moldura);
  const iAbert = idx++;
  args.push("-loop", "1", "-framerate", String(FPS), "-t", seg3(total), "-i", arq.abertura);
  const iAudio = idx++;
  args.push("-i", arq.audio);
  partes.push(`${nomes.join("")}concat=n=${nomes.length}:v=1:a=0[base]`);
  partes.push(`[${iMold}:v]format=rgba[mold]`);
  partes.push(`[${iAbert}:v]format=rgba[abert]`);
  partes.push(`[base][mold]overlay=0:0:enable='lt(t,${seg3(inicioFechamento)})'[v1]`);
  partes.push(`[v1][abert]overlay=0:0:enable='lt(t,${seg3(fimAbertura)})'[v2]`);
  partes.push(`[v2]subtitles=${arq.legenda}:fontsdir=fonts,format=yuv420p[vout]`);
  partes.push(`[${iAudio}:a]loudnorm=I=-14:TP=-1.5:LRA=11,apad=pad_dur=2[aout]`);
  const filtro = partes.join(";\n");
  args.push(
    "-filter_complex_script", "filtro.txt",
    "-map", "[vout]", "-map", "[aout]",
    "-t", seg3(total),
    "-c:v", "libx264", "-preset", plano.leve ? "veryfast" : "medium", ...(plano.leve ? ["-threads", "2"] : []), "-crf", "21", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
    "-movflags", "+faststart",
    arq.saida,
  );
  return { args, filtro };
}
