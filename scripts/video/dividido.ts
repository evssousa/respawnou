// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Tela dividida: vídeo enviado em cima (1080×960), imagem da matéria embaixo (1080×960), legenda na divisa. Funções puras:
// geometria, planos de tempo e os comandos/filtros do ffmpeg. Quem roda é o gerador (app/video/gerador.server.ts).

export const DIVIDIDO = {
  topo: { y: 0, w: 1080, h: 960 },
  baixo: { y: 960, w: 1080, h: 960 },
  /** Imagem de baixo preparada maior que a saída (1,5×) para o zoom lento não "tremer". */
  prepBaixo: { w: 1620, h: 1440 },
  divisoria: { y: 880, h: 160 },
  cartaoY: 1060,
  creditoY: 312,
  /** Zoom da respiração da imagem de baixo (1 → 1 + zoomBaixo, alternando o sentido por troca). */
  zoomBaixo: 0.05,
};

const FPS = 30;
const T = 0.35; // = TRANSICAO de ffmpeg.ts
const s3 = (n: number) => n.toFixed(3);

/**
 * Quadros de cada corte a partir das bordas arredondadas (sem deriva): a soma é exatamente round(fim*30). Mínimo 1 por corte.
 */
export function quadrosDosCortes(cortes: { ini: number }[], fim: number): number[] {
  const bordas = [...cortes.map((c) => Math.round(c.ini * FPS)), Math.round(fim * FPS)];
  const q: number[] = [];
  let atual = bordas[0];
  for (let k = 0; k < cortes.length; k++) {
    const restantes = cortes.length - k - 1;
    // garante pelo menos 1 quadro para este e para cada um dos seguintes
    const prox = Math.min(Math.max(bordas[k + 1], atual + 1), bordas[bordas.length - 1] - restantes);
    q.push(Math.max(1, prox - atual));
    atual += q[k];
  }
  return q;
}

/** Junta cenas seguidas com a mesma imagem de baixo; o 1º grupo começa em 0. */
export function gruposBaixo(cenas: { ini: number; fim: number; baixo: number }[]): { img: number; ini: number; dur: number }[] {
  const out: { img: number; ini: number; dur: number }[] = [];
  for (const c of cenas) {
    const ult = out[out.length - 1];
    if (ult && ult.img === c.baixo) ult.dur = c.fim - ult.ini;
    else out.push({ img: c.baixo, ini: out.length ? c.ini : 0, dur: c.fim - (out.length ? c.ini : 0) });
  }
  return out;
}

export type EnquadramentoTopo = "centre" | "west" | "east" | "inteira";

/**
 * Prepara UM corte do vídeo de cima em 1080×960, 30 fps, sem áudio. Todos os cortes usam exatamente os mesmos parâmetros de
 * saída (é o que permite juntar com `-c copy`). Se o arquivo acabar antes, congela o último quadro.
 */
export function comandoCorteTopo(o: { arquivo: string; ss: number; quadros: number; enquadramento: EnquadramentoTopo; saida: string; leve: boolean }): string[] {
  const { w, h } = DIVIDIDO.topo;
  const fim = `eq=contrast=1.07:saturation=1.22,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=5`;
  let filtro: string;
  if (o.enquadramento === "inteira") {
    filtro =
      `fps=${FPS},split=2[a][b];[a]scale=${w / 10}:${h / 10}:force_original_aspect_ratio=increase,crop=${w / 10}:${h / 10},boxblur=3:1,scale=${w}:${h},eq=brightness=-0.12[f];` +
      `[b]scale=${w}:${h}:force_original_aspect_ratio=decrease[g];[f][g]overlay=(W-w)/2:(H-h)/2,${fim}`;
  } else {
    const x = o.enquadramento === "west" ? "0" : o.enquadramento === "east" ? "iw-ow" : "(iw-ow)/2";
    filtro = `fps=${FPS},scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:${x}:(ih-oh)/2,${fim}`;
  }
  const t1 = o.leve ? ["-threads", "1", "-filter_threads", "1"] : [];
  return [
    "-y", "-hide_banner", "-loglevel", "error", ...t1,
    "-ss", s3(o.ss), "-i", o.arquivo, "-an", "-vf", filtro,
    "-frames:v", String(Math.max(1, o.quadros)),
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), "-g", String(FPS),
    ...(o.leve ? ["-x264-params", "threads=1:lookahead-threads=1:sliced-threads=0"] : []),
    o.saida,
  ];
}

/** Junta os cortes de cima sem recodificar. */
export const comandoJuntarTopo = (lista: string, saida: string): string[] => ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", saida];

/** Plano B (concat falhou): junta recodificando. */
export const comandoJuntarTopoRecodificando = (lista: string, saida: string, leve: boolean): string[] => [
  "-y", "-hide_banner", "-loglevel", "error", ...(leve ? ["-threads", "1"] : []), "-f", "concat", "-safe", "0", "-i", lista,
  "-c:v", "libx264", "-preset", "ultrafast", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), saida,
];

/**
 * Filtro da passada 1 no modo dividido: topo.mp4 (já pronto) em cima, imagens de baixo com respiração lenta (fade entre elas)
 * embaixo, `vstack`, e o fechamento em tela cheia com fade. Saída `[base]`.
 */
export function filtroPassada1Dividida(o: { topo: string; fimCenas: number; baixo: { img: string; ini: number; dur: number }[]; fechamento: { arquivo: string; ini: number; dur: number } }): string {
  const { w, h } = DIVIDIDO.baixo;
  const g = DIVIDIDO.zoomBaixo;
  const partes: string[] = [];
  const qCenas = Math.max(1, Math.round(o.fimCenas * FPS));
  partes.push(`movie=${o.topo},setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p,setsar=1,trim=end_frame=${qCenas},settb=AVTB[top]`);
  o.baixo.forEach((b, k) => {
    const ultimo = k === o.baixo.length - 1;
    // Cada xfade "come" T da soma: os do meio duram dur + T; o último vai até fimCenas (+T/2 se houve xfade antes dele).
    const Q = Math.max(1, ultimo ? Math.round((o.fimCenas - b.ini + (k > 0 ? T / 2 : 0)) * FPS) : Math.round((b.dur + T) * FPS));
    const z = k % 2 ? `${1 + g}-${g}*on/${Q}` : `1+${g}*on/${Q}`;
    partes.push(`movie=${b.img},zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Q}:s=${w}x${h}:fps=${FPS},setsar=1,format=yuv420p,settb=AVTB[b${k}]`);
  });
  if (o.baixo.length === 1) partes.push(`[b0]null[bot]`);
  else {
    let atual = "[b0]";
    for (let k = 1; k < o.baixo.length; k++) {
      const saida = k === o.baixo.length - 1 ? "[bot]" : `[bx${k}]`;
      partes.push(`${atual}[b${k}]xfade=transition=fade:duration=${s3(T)}:offset=${s3(Math.max(0, o.baixo[k].ini - T / 2))}${saida}`);
      atual = saida;
    }
  }
  partes.push(`[top][bot]vstack=inputs=2,settb=AVTB[cenas]`);
  const qFech = Math.max(1, Math.round((o.fechamento.dur + T / 2) * FPS));
  partes.push(`movie=${o.fechamento.arquivo},scale=1080:1920,setsar=1,format=yuv420p,loop=loop=${qFech - 1}:size=1,setpts=N/${FPS}/TB,fps=${FPS},settb=AVTB[cf]`);
  partes.push(`[cenas][cf]xfade=transition=fade:duration=${s3(T)}:offset=${s3(Math.max(0, o.fechamento.ini - T / 2))}[base]`);
  return partes.join(";\n");
}
