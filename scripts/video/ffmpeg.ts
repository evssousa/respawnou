// Montagem do vídeo com ffmpeg: clipes com Ken Burns (zoompan) ligados por transições animadas (xfade), moldura com a marca,
// cartão de abertura que entra deslizando e sai com fade, barra de progresso, legenda ASS queimada e só a narração no áudio.
// Aqui só se monta o comando; quem roda é o gerador (app/video/gerador.server.ts).

export const FPS = 30;
/** Duração de cada transição (s). */
export const TRANSICAO = 0.35;
const TRANSICOES = ["slideleft", "circleopen", "fadewhite", "wipeup", "zoomin", "slideright", "radial", "smoothleft", "fadewhite", "wipeleft"];

export interface Clip {
  /** Arquivo da imagem (tela cheia, já enquadrada). */
  img: string;
  /** Início na linha do tempo do vídeo e duração "nominal" (até o início do próximo clipe). */
  ini: number;
  dur: number;
  /** Imagem inteira com fundo desfocado: zoom bem mais leve, para não cortar as bordas. */
  suave: boolean;
  /** O dono alinhou o enquadramento à mão (ou por preset): só zoom centrado, sem panorâmica, para manter o que ele escolheu. */
  fixo?: boolean;
  /** Imagem larga que preenche a tela: a imagem tem 1920 px de altura e a janela 1080×1920 desliza de x0 a x1 (px) durante o clipe. */
  pan?: { x0: number; x1: number };
  /** Trecho de vídeo (material enviado pelo dono) no lugar da imagem: arquivo na pasta de trabalho e instante inicial. */
  video?: { arquivo: string; ss: number };
  /** Corte de aproximação (zoom forte e centrado) para dar ritmo quando a mesma imagem segue na tela. */
  punch?: boolean;
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
  /** Cor da barra de progresso, "#rrggbb" (cor de destaque da marca). */
  corBarra?: string;
  /** Trilha pronta (música + whooshes, ver musica.ts) e o andamento dela, para a imagem pulsar no ritmo. */
  trilha?: { arquivo: string; bpm: number };
}

/** Instantes (s) em que cada transição está no meio: serve para posicionar os "whooshes" da trilha. */
export const instantesTransicao = (clips: Clip[], fechamentoIni: number): number[] => [...clips.slice(1).map((c) => c.ini), fechamentoIni];

/** Movimentos em ordem de revezamento: zoom in, panorâmica →, zoom out, panorâmica ↓ (versão suave para imagem inteira). */
export function movimento(i: number, quadros: number, suave = false, modo: "livre" | "fixo" | "punch" = "livre"): { z: string; x: string; y: string } {
  const N = Math.max(1, quadros);
  const cx = "iw/2-(iw/zoom/2)";
  const cy = "ih/2-(ih/zoom/2)";
  if (modo === "punch") return i % 2 ? { z: `1.34-0.08*on/${N}`, x: cx, y: cy } : { z: `1.22+0.12*on/${N}`, x: cx, y: cy };
  // Enquadramento escolhido pelo dono: respiração leve no centro, o recorte dele continua aparecendo quase inteiro.
  if (modo === "fixo") return i % 2 ? { z: `1.06-0.06*on/${N}`, x: cx, y: cy } : { z: `1+0.06*on/${N}`, x: cx, y: cy };
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
    // A transição fica centrada na fronteira da fala: o clipe começa T/2 antes do seu início e sobra T/2 depois do fim.
    const dur = c.dur + TRANSICAO;
    if (c.video) {
      // Trecho de vídeo: tela cheia com ele mesmo desfocado ao fundo (não corta os lados); se acabar antes, congela o último quadro.
      args.push(...t1, "-ss", s3(c.video.ss), "-t", s3(dur), "-i", c.video.arquivo);
      partes.push(
        `[${idx}:v]fps=${FPS},split=2[va${k}][vb${k}];[va${k}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:3,eq=brightness=-0.12[vf${k}];` +
          `[vb${k}]scale=1080:1920:force_original_aspect_ratio=decrease[vg${k}];[vf${k}][vg${k}]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=3,trim=duration=${s3(dur)},setpts=PTS-STARTPTS,settb=AVTB[c${k}]`,
      );
      rotulos.push(`[c${k}]`);
      idx++;
      return;
    }
    args.push(...t1, "-loop", "1", "-framerate", String(FPS), "-t", s3(dur), "-i", c.img);
    if (c.pan) {
      // Deslizar suave (começa e termina devagar) de x0 a x1; `t` é o tempo do próprio clipe.
      const u = `min(t/${s3(dur)},1)`;
      partes.push(`[${idx}:v]crop=1080:1920:x='${c.pan.x0}+(${c.pan.x1}-${c.pan.x0})*(1-cos(PI*${u}))/2':y=0,setsar=1,fps=${FPS},format=yuv420p,settb=AVTB[c${k}]`);
      rotulos.push(`[c${k}]`);
      idx++;
      return;
    }
    const m = movimento(k, Math.round(dur * FPS), c.suave, c.punch ? "punch" : c.fixo ? "fixo" : "livre");
    partes.push(`[${idx}:v]zoompan=z='${m.z}':x='${m.x}':y='${m.y}':d=1:s=1080x1920:fps=${FPS},setsar=1,format=yuv420p,settb=AVTB[c${k}]`);
    rotulos.push(`[c${k}]`);
    idx++;
  });
  args.push(...t1, "-loop", "1", "-framerate", String(FPS), "-t", s3(fechamento.dur + TRANSICAO / 2), "-i", arq.fechamento);
  partes.push(`[${idx}:v]scale=1080:1920,setsar=1,fps=${FPS},format=yuv420p,settb=AVTB[cf]`);
  rotulos.push("[cf]");
  idx++;
  // Encadeia as transições: a k-ésima começa no início do clipe k.
  const inicios = [...clips.map((c) => c.ini), fechamento.ini];
  let atual = rotulos[0];
  for (let k = 1; k < rotulos.length; k++) {
    const saida = k === rotulos.length - 1 ? "[base]" : `[x${k}]`;
    const nome = k === rotulos.length - 1 ? "fade" : TRANSICOES[(k - 1) % TRANSICOES.length];
    partes.push(`${atual}${rotulos[k]}xfade=transition=${nome}:duration=${s3(TRANSICAO)}:offset=${s3(Math.max(0, inicios[k] - TRANSICAO / 2))}${saida}`);
    atual = saida;
  }
  if (rotulos.length === 1) partes.push(`${atual}null[base]`);
  const iMold = idx++;
  args.push(...t1, "-loop", "1", "-framerate", String(FPS), "-t", s3(total), "-i", arq.moldura);
  const iAbert = idx++;
  args.push(...t1, "-loop", "1", "-framerate", String(FPS), "-t", s3(total), "-i", arq.abertura);
  const iBarra = idx++;
  args.push(...t1, "-f", "lavfi", "-t", s3(total), "-i", `color=c=0x${(plano.corBarra ?? "#c8ff2e").replace("#", "")}:s=1080x8:r=${FPS}`);
  const iAudio = idx++;
  args.push(...t1, "-i", arq.audio);
  const iTrilha = plano.trilha ? idx++ : -1;
  if (plano.trilha) args.push(...t1, "-i", plano.trilha.arquivo);

  partes.push(`[${iMold}:v]format=rgba[mold]`);
  partes.push(`[${iAbert}:v]format=rgba,fade=t=out:st=${s3(Math.max(0, fimAbertura - 0.3))}:d=0.3:alpha=1[abert]`);
  // Cor mais viva, vinheta e um pulso de brilho a cada batida da trilha (só durante as cenas).
  const B = plano.trilha ? 60 / plano.trilha.bpm : 0;
  const pulso = plano.trilha ? `:brightness='0.035*exp(-7*mod(t,${s3(B)}))'` : "";
  partes.push(`[base]eq=contrast=1.07:saturation=1.22${pulso}:eval=frame,vignette=angle=PI/5:eval=init[grade]`);
  partes.push(`[grade][mold]overlay=0:0:enable='lt(t,${s3(fechamento.ini)})'[v1]`);
  // Cartão de abertura: entra deslizando pela esquerda (desacelerando) e some com fade no fim do gancho.
  partes.push(`[v1][abert]overlay=x='-1080*pow(1-min(t/0.45,1),2)':y=0:eval=frame:enable='lt(t,${s3(fimAbertura)})'[v2]`);
  // Barra de progresso (abaixo da zona do topo do app).
  partes.push(`[v2][${iBarra}:v]overlay=x='-w+w*t/${s3(total)}':y=226:eval=frame:enable='lt(t,${s3(fechamento.ini)})'[v3]`);
  partes.push(`[v3]subtitles=${arq.legenda}:fontsdir=fonts,format=yuv420p[vout]`);
  if (plano.trilha) {
    // Voz normalizada; a música fica baixa e abaixa mais ainda quando alguém fala (sidechain), depois soma e limita.
    partes.push(`[${iAudio}:a]loudnorm=I=-14:TP=-1.5:LRA=11,apad=pad_dur=2,asplit=2[vz1][vz2]`);
    partes.push(`[${iTrilha}:a]volume=0.30,apad=pad_dur=3[mus]`);
    partes.push(`[mus][vz2]sidechaincompress=threshold=0.02:ratio=9:attack=15:release=450[duck]`);
    partes.push(`[vz1][duck]amix=inputs=2:duration=first:dropout_transition=0,volume=2,alimiter=limit=0.95[aout]`);
  } else partes.push(`[${iAudio}:a]loudnorm=I=-14:TP=-1.5:LRA=11,apad=pad_dur=2[aout]`);
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
