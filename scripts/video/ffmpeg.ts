// Montagem do vídeo com ffmpeg: clipes com Ken Burns (zoompan) ligados por transições animadas (xfade), moldura com a marca,
// cartão de abertura que entra deslizando e sai com fade, barra de progresso, legenda ASS queimada e só a narração no áudio.
// Aqui só se monta o comando; quem roda é o gerador (app/video/gerador.server.ts).

export const FPS = 30;
/** Duração de cada transição (s). */
export const TRANSICAO = 0.35;
const TRANSICOES = ["slideleft", "circleopen", "wipeup", "slideright", "zoomin", "radial", "wipeleft", "smoothleft"];

export interface Clip {
  /** Arquivo da imagem (tela cheia, já enquadrada). */
  img: string;
  /** Início na linha do tempo do vídeo e duração "nominal" (até o início do próximo clipe). */
  ini: number;
  dur: number;
  /** Imagem inteira com fundo desfocado: zoom bem mais leve, para não cortar as bordas. */
  suave: boolean;
}

export interface PlanoMontagem {
  clips: Clip[];
  fechamento: { ini: number; dur: number };
  total: number;
  fimAbertura: number;
  /** Nomes dos arquivos na pasta de trabalho. */
  arq: { moldura: string; abertura: string; fechamento: string; audio: string; legenda: string; saida: string };
  /** Servidor compartilhado: preset mais rápido e 2 threads. */
  leve?: boolean;
}

/** Movimentos em ordem de revezamento: zoom in, panorâmica →, zoom out, panorâmica ↓ (versão suave para imagem inteira). */
export function movimento(i: number, quadros: number, suave = false): { z: string; x: string; y: string } {
  const N = Math.max(1, quadros);
  const cx = "iw/2-(iw/zoom/2)";
  const cy = "ih/2-(ih/zoom/2)";
  const g = suave ? 0.05 : 0.1; // quanto o zoom varia
  const fixo = suave ? "1.05" : "1.12";
  switch (i % 4) {
    case 0:
      return { z: `1+${g}*on/${N}`, x: cx, y: cy };
    case 1:
      return { z: fixo, x: `(iw-iw/zoom)*on/${N}`, y: cy };
    case 2:
      return { z: `${1 + g}-${g}*on/${N}`, x: cx, y: cy };
    default:
      return { z: fixo, x: cx, y: `(ih-ih/zoom)*on/${N}` };
  }
}

const s3 = (n: number) => n.toFixed(3);

/** Argumentos do ffmpeg (a pasta de trabalho é o cwd; o filtergraph vai em arquivo para fugir de aspas). */
export function montar(plano: PlanoMontagem): { args: string[]; filtro: string } {
  const { clips, fechamento, total, fimAbertura, arq } = plano;
  // Servidor compartilhado: o limite de processos/threads da conta é baixo ("pthread_create failed"). Cada entrada e cada filtro
  // usam 1 thread só (o padrão do ffmpeg é 1 por núcleo, por entrada).
  const t1 = plano.leve ? ["-threads", "1"] : [];
  const args: string[] = ["-y", "-hide_banner", "-loglevel", "warning", ...(plano.leve ? ["-filter_threads", "1", "-filter_complex_threads", "1"] : [])];
  const partes: string[] = [];
  const rotulos: string[] = [];
  let idx = 0;
  clips.forEach((c, k) => {
    const dur = c.dur + TRANSICAO; // sobra para a transição para o próximo clipe
    args.push(...t1, "-loop", "1", "-framerate", String(FPS), "-t", s3(dur), "-i", c.img);
    const m = movimento(k, Math.round(dur * FPS), c.suave);
    partes.push(`[${idx}:v]zoompan=z='${m.z}':x='${m.x}':y='${m.y}':d=1:s=1080x1920:fps=${FPS},setsar=1,format=yuv420p,settb=AVTB[c${k}]`);
    rotulos.push(`[c${k}]`);
    idx++;
  });
  args.push(...t1, "-loop", "1", "-framerate", String(FPS), "-t", s3(fechamento.dur), "-i", arq.fechamento);
  partes.push(`[${idx}:v]scale=1080:1920,setsar=1,fps=${FPS},format=yuv420p,settb=AVTB[cf]`);
  rotulos.push("[cf]");
  idx++;
  // Encadeia as transições: a k-ésima começa no início do clipe k.
  const inicios = [...clips.map((c) => c.ini), fechamento.ini];
  let atual = rotulos[0];
  for (let k = 1; k < rotulos.length; k++) {
    const saida = k === rotulos.length - 1 ? "[base]" : `[x${k}]`;
    const nome = k === rotulos.length - 1 ? "fade" : TRANSICOES[(k - 1) % TRANSICOES.length];
    partes.push(`${atual}${rotulos[k]}xfade=transition=${nome}:duration=${s3(TRANSICAO)}:offset=${s3(inicios[k])}${saida}`);
    atual = saida;
  }
  if (rotulos.length === 1) partes.push(`${atual}null[base]`);
  const iMold = idx++;
  args.push(...t1, "-loop", "1", "-framerate", String(FPS), "-t", s3(total), "-i", arq.moldura);
  const iAbert = idx++;
  args.push(...t1, "-loop", "1", "-framerate", String(FPS), "-t", s3(total), "-i", arq.abertura);
  const iBarra = idx++;
  args.push(...t1, "-f", "lavfi", "-t", s3(total), "-i", `color=c=0xc8ff2e:s=1080x8:r=${FPS}`);
  const iAudio = idx++;
  args.push(...t1, "-i", arq.audio);

  partes.push(`[${iMold}:v]format=rgba[mold]`);
  partes.push(`[${iAbert}:v]format=rgba,fade=t=out:st=${s3(Math.max(0, fimAbertura - 0.3))}:d=0.3:alpha=1[abert]`);
  partes.push(`[base][mold]overlay=0:0:enable='lt(t,${s3(fechamento.ini)})'[v1]`);
  // Cartão de abertura: entra deslizando pela esquerda (desacelerando) e some com fade no fim do gancho.
  partes.push(`[v1][abert]overlay=x='-1080*pow(1-min(t/0.45,1),2)':y=0:eval=frame:enable='lt(t,${s3(fimAbertura)})'[v2]`);
  // Barra de progresso (abaixo da zona do topo do app).
  partes.push(`[v2][${iBarra}:v]overlay=x='-w+w*t/${s3(total)}':y=226:eval=frame:enable='lt(t,${s3(fechamento.ini)})'[v3]`);
  partes.push(`[v3]subtitles=${arq.legenda}:fontsdir=fonts,format=yuv420p[vout]`);
  partes.push(`[${iAudio}:a]loudnorm=I=-14:TP=-1.5:LRA=11,apad=pad_dur=2[aout]`);
  const filtro = partes.join(";\n");
  args.push(
    "-filter_complex_script", "filtro.txt",
    "-map", "[vout]", "-map", "[aout]",
    "-t", s3(total),
    "-c:v", "libx264", "-preset", plano.leve ? "veryfast" : "medium", ...(plano.leve ? ["-threads", "1", "-x264-params", "threads=1:lookahead-threads=1:sliced-threads=0"] : []), "-crf", "21", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
    "-movflags", "+faststart",
    arq.saida,
  );
  return { args, filtro };
}
