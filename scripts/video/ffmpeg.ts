// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Montagem do vídeo com ffmpeg: clipes com Ken Burns (zoompan) ligados por transições animadas (xfade), moldura com a marca,
// cartão de abertura que entra deslizando e sai com fade, barra de progresso, legenda ASS queimada e só a narração no áudio.
// Aqui só se monta o comando; quem roda é o gerador (app/video/gerador.server.ts).
import { filtroPassada1Dividida } from "./dividido";

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
  video?: { arquivo: string; ss: number; /** Clipe já preparado por `comandoClipeVideo` (1080×1920, 30 fps): entra pelo filtro `movie`, sem entrada extra do ffmpeg. */ pronto?: string };
  /** Corte de aproximação (zoom forte e centrado) para dar ritmo quando a mesma imagem segue na tela. */
  punch?: boolean;
}

export interface PlanoMontagem {
  clips: Clip[];
  fechamento: { ini: number; dur: number };
  total: number;
  fimAbertura: number;
  /** Nomes dos arquivos na pasta de trabalho. */
  arq: { molduraTopo: string; molduraBase: string; abertura: string; fechamento: string; audio: string; legenda: string; saida: string };
  /** Servidor compartilhado: preset mais rápido e 2 threads. */
  leve?: boolean;
  /** Montagem em duas passadas (poucos threads): 1 = só as cenas e transições (grava `base.mp4`); 2 = moldura, cartões, legenda e áudio sobre `base.mp4`. Sem isso, tudo de uma vez. */
  etapa?: 1 | 2;
  /** Cartões de dados: PNG pequeno (932 px de largura) que sobe e some no intervalo dado (segundos do vídeo). */
  cartoes?: { arquivo: string; ini: number; fim: number; y?: number }[];
  /** Cor da barra de progresso, "#rrggbb" (cor de destaque da marca). */
  corBarra?: string;
  /** Trilha pronta (música + whooshes, ver musica.ts) e o andamento dela, para a imagem pulsar no ritmo. */
  trilha?: { arquivo: string; bpm: number; /** volume da música (0 a 1; padrão 0,3) */ volume?: number; /** razão do sidechain: quanto a música abaixa na fala (padrão 9) */ razao?: number };
  /** Efeitos sonoros dos cartões (efeitos.wav): somam depois do abaixamento da música, com volume próprio. */
  efeitos?: { arquivo: string; volume: number };
  /** Tela dividida: o topo já vem pronto (topo.mp4, 1080×960) e as imagens de baixo (1620×1440) entram com zoom lento. */
  dividido?: { topo: string; fimCenas: number; baixo: { img: string; ini: number; dur: number }[] };
  /** Sem o cartão de abertura (o vídeo começa já com as cenas). */
  semAbertura?: boolean;
  /** PNG 1080×160 sobreposto em y 880 até o fechamento (faixa da divisa). */
  divisoria?: string;
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

/**
 * Prepara UM trecho de vídeo (material enviado pelo dono) em arquivo próprio, 1080×1920 a 30 fps: ele mesmo desfocado ao fundo (o
 * borrão é feito num quadro minúsculo e ampliado: bem mais barato) e inteiro no centro. Roda sozinho, uma entrada só, antes da
 * montagem (a hospedagem libera poucos processos por vez). Se o trecho acabar antes, congela o último quadro.
 */
export function comandoClipeVideo(c: Clip, saida: string, leve = true): string[] {
  const dur = c.dur + TRANSICAO;
  const v = c.video!;
  const filtro =
    `fps=${FPS},split=2[va][vb];[va]scale=108:192:force_original_aspect_ratio=increase,crop=108:192,boxblur=3:1,scale=1080:1920,eq=brightness=-0.12[vf];` +
    `[vb]scale=1080:1920:force_original_aspect_ratio=decrease[vg];[vf][vg]overlay=(W-w)/2:(H-h)/2,eq=contrast=1.07:saturation=1.22,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=3,trim=duration=${s3(dur)},setpts=PTS-STARTPTS`;
  return [
    "-y", "-hide_banner", "-loglevel", "error", ...(leve ? ["-threads", "1", "-filter_threads", "1", "-filter_complex_threads", "1"] : []),
    "-ss", s3(v.ss), "-t", s3(dur), "-i", v.arquivo, "-an", "-vf", filtro,
    "-c:v", "libx264", "-preset", "ultrafast", ...(leve ? ["-threads", "1", "-x264-params", "threads=1:lookahead-threads=1:sliced-threads=0"] : []), "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), saida,
  ];
}

/** Argumentos do ffmpeg (a pasta de trabalho é o cwd; o filtergraph vai em arquivo para fugir de aspas). */
export function montar(plano: PlanoMontagem): { args: string[]; filtro: string } {
  const { clips, fechamento, total, fimAbertura, arq } = plano;
  // Servidor compartilhado: o limite de processos/threads da conta é baixo ("pthread_create failed"). Cada entrada e cada filtro
  // usam 1 thread só (o padrão do ffmpeg é 1 por núcleo, por entrada).
  const etapa = plano.etapa ?? 0;
  const t1 = plano.leve ? ["-threads", "1"] : [];
  const args: string[] = ["-y", "-hide_banner", "-loglevel", "error", ...(plano.leve ? ["-filter_threads", "1", "-filter_complex_threads", "1"] : [])];
  const partes: string[] = [];
  const rotulos: string[] = [];
  let idx = 0;
  // Tela dividida: o filtro das cenas é outro (topo pronto + imagens de baixo + vstack + fechamento).
  if (etapa !== 2 && plano.dividido) partes.push(filtroPassada1Dividida({ ...plano.dividido, fechamento: { arquivo: arq.fechamento, ini: fechamento.ini, dur: fechamento.dur } }));
  if (etapa !== 2 && !plano.dividido) clips.forEach((c, k) => {
    // A transição fica centrada na fronteira da fala: o clipe começa T/2 antes do seu início e sobra T/2 depois do fim.
    const dur = c.dur + TRANSICAO;
    if (c.video?.pronto) {
      partes.push(`movie=${c.video.pronto},setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p,setsar=1,settb=AVTB[c${k}]`);
      rotulos.push(`[c${k}]`);
      return;
    }
    if (c.video) {
      // Trecho de vídeo: tela cheia com ele mesmo desfocado ao fundo (não corta os lados); se acabar antes, congela o último quadro.
      args.push(...t1, "-ss", s3(c.video.ss), "-t", s3(dur), "-i", c.video.arquivo);
      partes.push(
        `[${idx}:v]fps=${FPS},split=2[va${k}][vb${k}];[va${k}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:3,eq=brightness=-0.12[vf${k}];` +
          `[vb${k}]scale=1080:1920:force_original_aspect_ratio=decrease[vg${k}];[vf${k}][vg${k}]overlay=(W-w)/2:(H-h)/2,eq=contrast=1.07:saturation=1.22,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=3,trim=duration=${s3(dur)},setpts=PTS-STARTPTS,settb=AVTB[c${k}]`,
      );
      rotulos.push(`[c${k}]`);
      idx++;
      return;
    }
    // A imagem é lida UMA vez (1 quadro) e o filtro gera os quadros do clipe; antes o ffmpeg decodificava o JPEG a cada quadro.
    const quadros = Math.max(1, Math.round(dur * FPS));
    const fonte = `movie=${c.img}`;
    if (c.pan) {
      // Deslizar suave (começa e termina devagar) de x0 a x1; `t` é o tempo do próprio clipe.
      const u = `min(t/${s3(dur)},1)`;
      partes.push(`${fonte},loop=loop=${quadros - 1}:size=1,setpts=N/${FPS}/TB,crop=1080:1920:x='${c.pan.x0}+(${c.pan.x1}-${c.pan.x0})*(1-cos(PI*${u}))/2':y=0,setsar=1,fps=${FPS},format=yuv420p,settb=AVTB[c${k}]`);
      rotulos.push(`[c${k}]`);
      return;
    }
    const m = movimento(k, quadros, c.suave, c.punch ? "punch" : c.fixo ? "fixo" : "livre");
    partes.push(`${fonte},zoompan=z='${m.z}':x='${m.x}':y='${m.y}':d=${quadros}:s=1080x1920:fps=${FPS},setsar=1,format=yuv420p,settb=AVTB[c${k}]`);
    rotulos.push(`[c${k}]`);
  });
  if (etapa !== 2 && !plano.dividido) {
  const qFech = Math.max(1, Math.round((fechamento.dur + TRANSICAO / 2) * FPS));
  partes.push(`movie=${arq.fechamento},scale=1080:1920,setsar=1,format=yuv420p,loop=loop=${qFech - 1}:size=1,setpts=N/${FPS}/TB,fps=${FPS},settb=AVTB[cf]`);
  rotulos.push("[cf]");
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
  }
  if (etapa === 1) {
    // Passada 1: só as cenas; vídeo quase sem compressão (rápido) para a passada 2 reler.
    return {
      args: [...args, "-filter_complex_script", "filtro.txt", "-map", "[base]", "-t", s3(total), "-an", "-c:v", "libx264", "-preset", "ultrafast", ...(plano.leve ? ["-threads", "1", "-x264-params", "threads=1:lookahead-threads=1:sliced-threads=0"] : []), "-crf", "14", "-pix_fmt", "yuv420p", "-r", String(FPS), "base.mp4"],
      filtro: partes.join(";\n"),
    };
  }
  if (etapa === 2) {
    args.push(...t1, "-i", "base.mp4");
    partes.push(`[${idx++}:v]null[base]`);
  }
  // Moldura e abertura: só as faixas que têm algo (topo 0–420, base 1100–1920, abertura 940–1520), lidas uma vez (1 quadro) e
  // repetidas pelo overlay; antes eram PNGs de tela cheia decodificados a cada quadro durante o vídeo inteiro.
  const iAudio = idx++;
  args.push(...t1, "-i", arq.audio);
  const iTrilha = plano.trilha ? idx++ : -1;
  if (plano.trilha) args.push(...t1, "-i", plano.trilha.arquivo);
  const iEfeitos = plano.trilha && plano.efeitos ? idx++ : -1;
  if (plano.trilha && plano.efeitos) args.push(...t1, "-i", plano.efeitos.arquivo);

  partes.push(`movie=${arq.molduraTopo},format=yuva420p[mtopo]`);
  partes.push(`movie=${arq.molduraBase},format=yuva420p[mbase]`);
  const qAbert = Math.max(1, Math.round(fimAbertura * FPS));
  if (!plano.semAbertura) partes.push(`movie=${arq.abertura},format=yuva420p,loop=loop=${qAbert - 1}:size=1,setpts=N/${FPS}/TB,fade=t=out:st=${s3(Math.max(0, fimAbertura - 0.3))}:d=0.3:alpha=1[abert]`);
  // Cor mais viva, vinheta e um pulso de brilho a cada batida da trilha (só durante as cenas).
  const B = plano.trilha ? 60 / plano.trilha.bpm : 0;
  const pulso = plano.trilha ? `:brightness='0.035*exp(-7*mod(t,${s3(B)}))'` : "";
  // Contraste e saturação já vêm aplicados nas imagens (sharp, uma vez só); aqui fica só o pulso, que é barato (só a luminância).
  partes.push(pulso ? `[base]eq=${pulso.slice(1)}:eval=frame[grade]` : `[base]null[grade]`);
  partes.push(`[grade][mtopo]overlay=0:0:enable='lt(t,${s3(fechamento.ini)})':eof_action=repeat[v0]`);
  partes.push(`[v0][mbase]overlay=0:1100:enable='lt(t,${s3(fechamento.ini)})':eof_action=repeat[v1]`);
  // Cartões de dados (um por vez): sobem 48 px desacelerando em 0,3 s com fade de entrada e saem com fade de 0,2 s. Ficam abaixo
  // da abertura e da legenda (a legenda é sempre a última camada).
  let camada = "v1";
  // Tela dividida: faixa da divisa por cima das molduras e abaixo dos cartões e da legenda.
  if (plano.divisoria) {
    partes.push(`movie=${plano.divisoria},format=yuva420p[div]`);
    partes.push(`[v1][div]overlay=0:880:enable='lt(t,${s3(fechamento.ini)})':eof_action=repeat[v1d]`);
    camada = "v1d";
  }
  (plano.cartoes ?? []).forEach((c, k) => {
    const q = Math.max(1, Math.round(c.fim * FPS));
    partes.push(`movie=${c.arquivo},format=yuva420p,loop=loop=${q - 1}:size=1,setpts=N/${FPS}/TB,fade=t=in:st=${s3(c.ini)}:d=0.25:alpha=1,fade=t=out:st=${s3(Math.max(c.ini, c.fim - 0.2))}:d=0.2:alpha=1[ct${k}]`);
    partes.push(`[${camada}][ct${k}]overlay=x=24:y='${c.y ?? 560}+48*pow(1-min(max((t-${s3(c.ini)})/0.3,0),1),3)':eval=frame:enable='between(t,${s3(c.ini)},${s3(c.fim)})':eof_action=pass[vc${k}]`);
    camada = `vc${k}`;
  });
  // Cartão de abertura: entra deslizando pela esquerda (desacelerando) e some com fade no fim do gancho.
  if (plano.semAbertura) partes.push(`[${camada}]null[v2]`);
  else partes.push(`[${camada}][abert]overlay=x='-1080*pow(1-min(t/0.45,1),2)':y=940:eval=frame:enable='lt(t,${s3(fimAbertura)})':eof_action=pass[v2]`);
  // Barra de progresso (abaixo da zona do topo do app).
  partes.push(`color=c=0x${(plano.corBarra ?? "#c8ff2e").replace("#", "")}:s=1080x8:r=${FPS}:d=${s3(total)}[barra];[v2][barra]overlay=x='-w+w*t/${s3(total)}':y=226:eval=frame:enable='lt(t,${s3(fechamento.ini)})'[v3]`);
  partes.push(`[v3]subtitles=${arq.legenda}:fontsdir=fonts,format=yuv420p[vout]`);
  if (plano.trilha) {
    // Voz normalizada; a música fica baixa e abaixa mais ainda quando alguém fala (sidechain), depois soma e limita.
    partes.push(`[${iAudio}:a]loudnorm=I=-14:TP=-1.5:LRA=11,apad=pad_dur=2,asplit=2[vz1][vz2]`);
    partes.push(`[${iTrilha}:a]volume=${(plano.trilha!.volume ?? 0.3).toFixed(2)},apad=pad_dur=3[mus]`);
    partes.push(`[mus][vz2]sidechaincompress=threshold=0.02:ratio=${plano.trilha!.razao ?? 9}:attack=15:release=450[duck]`);
    if (plano.efeitos) {
      partes.push(`[${iEfeitos}:a]volume=${plano.efeitos.volume}[efx]`);
      partes.push(`[vz1][duck][efx]amix=inputs=3:duration=first:dropout_transition=0,volume=3,alimiter=limit=0.95[aout]`);
    } else partes.push(`[vz1][duck]amix=inputs=2:duration=first:dropout_transition=0,volume=2,alimiter=limit=0.95[aout]`);
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
