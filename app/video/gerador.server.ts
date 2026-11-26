// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Gerador do vídeo (voz + imagens + ffmpeg): usado pelo worker do GitHub Actions e, no modo "servidor", pelo próprio site.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { basename, join } from "node:path";
import { mediaDir } from "../../server-paths.mjs";
import { MARCA } from "~/marca";
import sharp from "sharp";
import { recortarComFoco } from "~/social/render/imagem.server";
import { type FatosVideo, planoCartoes } from "./cartoes";
import { VIDEO } from "./config";
import type { Roteiro } from "./roteiro";
import { gerarCartao } from "./render/cartao.server";
import { gerarQuadros } from "./render/quadros.server";
import { type Alinhamento, gerarAss, palavrasDoAlinhamento, segmentos } from "../../scripts/video/ass";
import { alinhamentoFalso, sintetizar } from "../../scripts/video/elevenlabs";
import { type ItemPronuncia, montarFala, remapear, semTags } from "../../scripts/video/falar";
import { type Clip, comandoClipeVideo, instantesTransicao, montar, type PlanoMontagem, TRANSICAO } from "../../scripts/video/ffmpeg";
import { comandoCorteTopo, comandoJuntarTopo, comandoJuntarTopoRecodificando, DIVIDIDO, gruposBaixo, quadrosDosCortes } from "../../scripts/video/dividido";
import { type EnquadramentoTopo, enquadramentoTopoValido, layoutDoRoteiro } from "./layout";
import { comandoEfeitos, filtrarEventos, somDoCartao } from "../../scripts/video/efeitos";
import { comandoTrilha, estiloDoVideo } from "../../scripts/video/musica";
import { comandoCortes, ehVideoSrc, escolherTrechos, FRACAO_MAX_VIDEO, lerCortes, lerDuracao, TRECHO_MAX_S } from "../../scripts/video/videoclip";

export interface PacoteVideo {
  id: number;
  titulo: string;
  secao: string;
  roteiro: Roteiro;
  /** `focoBaixo`: enquadramento da imagem na metade de baixo da tela dividida (9:8); `focoTopo`: como o vídeo de cima preenche a metade. */
  imagens: { src: string; url: string; foco: string; alt?: string; focoBaixo?: string; focoTopo?: string }[];
  capa?: number;
  voz: string;
  modelo: string;
  velocidade: number;
  estabilidade?: number;
  /** Estilo fixo da trilha (séries têm identidade sonora própria). */
  trilha?: string;
  estilo?: number;
  /** Efeitos sonoros nos cartões (padrão ligado). */
  efeitos?: boolean;
  /** Volume da música de fundo (ver VIDEO.musica); padrão média. */
  musica?: "baixa" | "media" | "alta";
  falado: string;
  /** Dicionário de pronúncia (base + do dono). Presente = o gerador converte a tela em fala (números por extenso, pausas) e remapeia a legenda. */
  pronuncia?: ItemPronuncia[];
  /** Termos para destacar em verde na legenda (destaques do roteiro, nome do jogo...). */
  termos?: string[];
  /** Fatos da matéria (cartões de dados). */
  fatos?: FatosVideo | null;
  pausa?: number;
  fechamento: string;
  pergunta?: string | null;
  cta: string;
}

export interface OpcoesGerador {
  /** Caminho do ffmpeg (padrão: variável FFMPEG, o ffmpeg-static do projeto ou "ffmpeg" do sistema). */
  ffmpeg?: string;
  /** "leve" (servidor compartilhado): imagens 1620×2880, preset veryfast, 2 threads. "alta": 2160×3840, preset medium. */
  qualidade?: "leve" | "alta";
  /** Voz falsa (teste, sem gastar créditos). */
  vozFalsa?: boolean;
  chaveElevenLabs?: string;
  /** Chamado ao começar cada fase ("voz", "imagens", "quadros", "trilha", "montagem", "capa"): serve para medir o tempo de cada uma. */
  fase?: (nome: string) => void;
  /** Andamento de 0 a 100 com o nome da etapa (o painel mostra a barra). */
  progresso?: (pct: number, rotulo: string) => void;
  /** Pasta onde a voz já gerada fica guardada (a prévia "Ouvir a narração" e a geração do vídeo usam a mesma, sem gastar créditos de novo). */
  cacheVoz?: string;
  /** Devolve true quando o dono cancelou: o ffmpeg em andamento é encerrado e a geração para. */
  cancelado?: () => boolean;
}

export async function caminhoFfmpeg(): Promise<string> {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    const m = (await import("ffmpeg-static")) as { default?: string | null };
    if (m.default) return m.default;
  } catch {
    /* sem ffmpeg-static */
  }
  return "ffmpeg";
}

/**
 * Roda o ffmpeg. Na hospedagem compartilhada o limite de processos/threads da conta às vezes estoura por um instante
 * ("pthread_create() failed: Resource temporarily unavailable"): espera e tenta de novo (até 6 vezes, 5 s a mais a cada vez).
 */
interface ExtraRodar {
  /** Duração total (s) do arquivo de saída: liga o `-progress` do ffmpeg e chama `onFracao` de 0 a 1. */
  total?: number;
  onFracao?: (f: number) => void;
}

/** Cancelamento do vídeo que está sendo gerado agora (a geração roda um por vez). */
let cancelamentoAtual: (() => boolean) | null = null;
export const ERRO_CANCELADO = "geração cancelada";

async function rodar(cmd: string, args: string[], cwd: string, extra: ExtraRodar = {}): Promise<string> {
  if (cancelamentoAtual?.()) throw new Error(ERRO_CANCELADO);
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await rodarUma(cmd, args, cwd, extra);
    } catch (e) {
      const m = String((e as Error)?.message ?? e);
      if (cancelamentoAtual?.() || /geração cancelada/.test(m)) throw new Error(ERRO_CANCELADO);
      if (tentativa >= 6 || !/pthread_create|Resource temporarily unavailable|Cannot allocate memory|EAGAIN/i.test(m)) throw e;
      await new Promise((r) => setTimeout(r, 5000 * tentativa));
    }
  }
}

/** Sem nenhum sinal de vida do ffmpeg por tanto tempo, ele é encerrado (travado) e o vídeo falha com mensagem clara. */
const SEM_SINAL_MS = 6 * 60_000;
const TETO_MS = 45 * 60_000;

function rodarUma(cmd: string, args: string[], cwd: string, extra: ExtraRodar = {}): Promise<string> {
  return new Promise((ok, erro) => {
    const comProgresso = !!extra.total && extra.total > 0;
    const p = spawn(cmd, comProgresso ? ["-progress", "pipe:1", "-nostats", ...args] : args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    let acabou = false;
    let motivo = "";
    let ultimo = Date.now();
    const inicio = Date.now();
    const vigia = setInterval(() => {
      if (cancelamentoAtual?.()) {
        motivo = ERRO_CANCELADO;
        p.kill("SIGKILL");
        return;
      }
      // Com `-progress` o ffmpeg dá sinal de vida a cada segundo: parado por 6 min = travou. Sem ele, só vale o teto de 15 min.
      const parado = comProgresso && Date.now() - ultimo > SEM_SINAL_MS;
      const demais = Date.now() - inicio > (comProgresso ? TETO_MS : 15 * 60_000);
      if (parado || demais) {
        motivo = parado ? "travou (sem andar por 6 minutos)" : "demorou demais e foi encerrado";
        p.kill("SIGKILL");
      }
    }, 1000);
    p.stderr.on("data", (d) => {
      err += String(d);
      if (!comProgresso) ultimo = Date.now();
    });
    p.stdout.on("data", (d) => {
      ultimo = Date.now();
      if (!comProgresso) return;
      const m = [...String(d).matchAll(/out_time_(?:us|ms)=(\d+)/g)].pop();
      if (m) extra.onFracao?.(Math.max(0, Math.min(1, Number(m[1]) / 1e6 / extra.total!)));
    });
    p.on("error", (e) => {
      clearInterval(vigia);
      if (!acabou) {
        acabou = true;
        erro(e);
      }
    });
    p.on("close", (c) => {
      clearInterval(vigia);
      if (acabou) return;
      acabou = true;
      if (c === 0) return ok(err);
      if (motivo === ERRO_CANCELADO) return erro(new Error(ERRO_CANCELADO));
      if (motivo) return erro(new Error(`${cmd} ${motivo}`));
      // O ffmpeg enche o log de avisos inofensivos ("deprecated pixel format"): tira esses para o erro de verdade aparecer.
      const util = err.split(String.fromCharCode(10)).filter((l) => l.trim() && !/deprecated pixel format|Guessed Channel Layout/.test(l)).join(" | ");
      erro(new Error(`${cmd} saiu com ${c}: ${util.slice(-900)}`));
    });
  });
}

const POSICAO: Record<string, string | number> = { auto: sharp.strategy.attention, centre: "centre", north: "north", south: "south", west: "west", east: "east" };

async function baixar(url: string): Promise<Buffer> {
  // Só no teste local (scripts/video/teste-local.ts): imagem do disco. Fora dele, file:// continua proibido (as URLs vêm do banco).
  if (process.env.VIDEO_TESTE === "1" && url.startsWith("file://")) return readFile(fileURLToPath(url));
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": MARCA.video.userAgent } });
  if (!r.ok) throw new Error(`imagem ${url} → HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Vídeo enviado fica no disco do próprio site: copia direto (baixar 80 MB pela internet estourava o tempo e a memória). */
async function copiarVideo(p: PacoteVideo, origem: number, destino: string): Promise<void> {
  const srcLocal = p.imagens[origem].src;
  if (/^\/media\/[\w./-]+$/.test(srcLocal) && !srcLocal.includes("..")) await copyFile(join(mediaDir(), srcLocal.slice("/media/".length)), destino).catch(async () => writeFile(destino, await baixar(p.imagens[origem].url)));
  else await writeFile(destino, await baixar(p.imagens[origem].url));
}

/**
 * Enquadra uma imagem em 9:16. Imagem larga (16:9): inteira no centro sobre ela mesma desfocada (não corta personagem nas
 * bordas); vertical/quadrada: recorte pelo foco (ou pela parte mais chamativa). Foco "inteira" força o primeiro modo.
 * É a mesma regra do vídeo e da prévia da capa.
 */
export async function enquadrarVertical(buf: Buffer, w: number, h: number, foco: string, qualidade = 90): Promise<{ jpeg: Buffer; inteira: boolean }> {
  const meta = await sharp(buf).metadata();
  const larga = (meta.width ?? 1) / (meta.height ?? 1) >= 1.25;
  void larga;
  const inteira = foco === "inteira";
  const cor = (b: Buffer) => sharp(b).linear(1.07, -128 * 0.07).modulate({ saturation: 1.22 }).jpeg({ quality: qualidade }).toBuffer();
  if (inteira) {
    const fundo = await sharp(buf).rotate().resize(w, h, { fit: "cover", position: sharp.strategy.attention }).blur(40).modulate({ brightness: 0.5 }).jpeg({ quality: 85 }).toBuffer();
    const frente = await sharp(buf).rotate().resize(w, h, { fit: "inside" }).toBuffer();
    return { jpeg: await cor(await sharp(fundo).composite([{ input: frente, gravity: "centre" }]).jpeg({ quality: 95 }).toBuffer()), inteira };
  }
  return { jpeg: await cor(await recortarComFoco(buf, w, h, foco)), inteira };
}

/** Texto que vai para a voz e o mapa de volta para o texto da tela (pronúncia, números por extenso, pausas). */
export function textoDaFala(p: PacoteVideo) {
  const fala = p.pronuncia ? montarFala([p.roteiro.gancho, ...p.roteiro.cenas.map((c) => c.fala), p.fechamento], p.pronuncia, p.pausa ?? 0) : null;
  return { fala, falado: fala ? fala.falado : p.falado };
}

/** Identifica uma fala: mesmo texto, mesma voz e mesmos ajustes = mesmo áudio. */
export const chaveDaVoz = (p: PacoteVideo, falado: string) =>
  createHash("sha1").update(JSON.stringify([falado, p.voz, p.modelo, p.velocidade, p.estabilidade ?? null, p.estilo ?? null])).digest("hex").slice(0, 20);

export interface ParteVoz {
  /** Texto falado desta parte (gancho, uma cena ou o fechamento). */
  falado: string;
  mp3: Buffer;
  /** Tempos de cada caractere, a partir do começo desta parte. */
  alinhamento: Alinhamento;
  /** Duração do mp3 (s). */
  dur: number;
  chave: string;
  deCache: boolean;
}

/** O mp3 da ElevenLabs é CBR de 128 kbps: a duração sai do tamanho do arquivo (sem abrir o ffmpeg). */
const duracaoDoMp3 = (mp3: Buffer) => (mp3.length * 8) / 128_000;

/**
 * A voz é gerada POR PARTE (gancho, cada cena, fechamento): cada parte tem cache próprio (`<chave>.mp3` + `<chave>.json`), então
 * mudar o texto de uma cena gera só a voz dela. A prévia "Ouvir a narração" e a geração do vídeo usam esse mesmo cache: o que o dono
 * ouviu é o que entra no vídeo e nenhum crédito é gasto duas vezes. A entonação continua natural: a ElevenLabs recebe o texto da
 * parte anterior e da seguinte como contexto.
 */
export async function vozPorPartes(p: PacoteVideo, fala: ReturnType<typeof textoDaFala>["fala"], o: { chave?: string; cacheDir?: string }): Promise<ParteVoz[]> {
  const falados = fala ? fala.falados : [p.falado];
  const chaveApi = o.chave ?? process.env.ELEVENLABS_API_KEY;
  const out: ParteVoz[] = [];
  for (const [i, falado] of falados.entries()) {
    const chave = chaveDaVoz(p, falado);
    if (o.cacheDir) {
      try {
        const [mp3, json] = await Promise.all([readFile(join(o.cacheDir, `${chave}.mp3`)), readFile(join(o.cacheDir, `${chave}.json`), "utf8")]);
        out.push({ falado, mp3, alinhamento: JSON.parse(json) as Alinhamento, dur: duracaoDoMp3(mp3), chave, deCache: true });
        continue;
      } catch {
        /* não está no cache: gera */
      }
    }
    if (!chaveApi) throw new Error("ELEVENLABS_API_KEY ausente");
    if (!p.voz) throw new Error("nenhuma voz configurada para esta editoria (painel /admin/videos)");
    const sint = await sintetizar({ chave: chaveApi, voz: p.voz, modelo: p.modelo, velocidade: p.velocidade, estabilidade: p.estabilidade, estilo: p.estilo, texto: falado, antes: falados[i - 1]?.slice(-300), depois: falados[i + 1]?.slice(0, 300) });
    if (o.cacheDir) {
      await mkdir(o.cacheDir, { recursive: true });
      await writeFile(join(o.cacheDir, `${chave}.mp3`), sint.mp3);
      await writeFile(join(o.cacheDir, `${chave}.json`), JSON.stringify(sint.alinhamento));
    }
    out.push({ falado, mp3: sint.mp3, alinhamento: sint.alinhamento, dur: duracaoDoMp3(sint.mp3), chave, deCache: false });
  }
  return out;
}

/** Pausa entre as partes (s): o fôlego de uma frase para a outra. */
const PAUSA_ENTRE_PARTES = 0.12;

/** Junta as partes num `voz.mp3` só (com uma pausa curta entre elas) e devolve o alinhamento do conjunto, no formato de uma voz única. */
export async function juntarVozes(partes: ParteVoz[], dir: string, ff: string, saida = "voz.mp3"): Promise<Alinhamento> {
  const alin: Alinhamento = { characters: [], character_start_times_seconds: [], character_end_times_seconds: [] };
  let deslocamento = 0;
  const linhas: string[] = [];
  if (partes.length > 1) await rodar(ff, ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", `anullsrc=r=44100:cl=mono`, "-t", String(PAUSA_ENTRE_PARTES), "-c:a", "libmp3lame", "-b:a", "128k", "pausa.mp3"], dir);
  for (const [i, parte] of partes.entries()) {
    await writeFile(join(dir, `voz_p${i}.mp3`), parte.mp3);
    if (i > 0) {
      linhas.push("file 'pausa.mp3'");
      alin.characters.push(" ");
      alin.character_start_times_seconds.push(deslocamento);
      alin.character_end_times_seconds.push(deslocamento + PAUSA_ENTRE_PARTES);
      deslocamento += PAUSA_ENTRE_PARTES;
    }
    linhas.push(`file 'voz_p${i}.mp3'`);
    const a = parte.alinhamento;
    a.characters.forEach((ch, k) => {
      alin.characters.push(ch);
      alin.character_start_times_seconds.push((a.character_start_times_seconds[k] ?? 0) + deslocamento);
      alin.character_end_times_seconds.push((a.character_end_times_seconds[k] ?? 0) + deslocamento);
    });
    deslocamento += parte.dur;
  }
  await writeFile(join(dir, "voz_lista.txt"), linhas.join(String.fromCharCode(10)));
  await rodar(ff, ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "voz_lista.txt", "-af", "aresample=44100,aformat=channel_layouts=mono", "-c:a", "libmp3lame", "-b:a", "128k", saida], dir);
  return alin;
}

/** Palavras com tempo e segmentos (abertura, cenas, fechamento) a partir do alinhamento da voz. */
export function analisarVoz(p: PacoteVideo, fala: ReturnType<typeof textoDaFala>["fala"], alin: Alinhamento) {
  let palavras = palavrasDoAlinhamento(alin);
  const textos = fala ? fala.partes.map((x) => x.tela) : null;
  const volta = fala && textos ? remapear(semTags(palavras), fala.mapa, textos.flat()) : null;
  if (fala && !volta) console.warn("[video] as palavras da voz não bateram com o texto da tela: legenda com as palavras faladas");
  let seg: ReturnType<typeof segmentos>;
  let nG: number;
  let nCenas: number;
  if (fala && volta && textos) {
    palavras = volta;
    nG = textos[0].length;
    const nF = textos.slice(1, -1).map((t) => t.length);
    nCenas = nF.reduce((a, b) => a + b, 0);
    seg = segmentos(palavras, nG, nF, textos[textos.length - 1].length);
  } else {
    if (fala) palavras = semTags(palavras);
    const falas = p.roteiro.cenas.map((c) => c.fala.replace(/[.!?…]+$/, ""));
    seg = segmentos(palavras, p.roteiro.gancho.replace(/[.!?…]+$/, ""), falas, p.fechamento.replace(/[.!?…]+$/, ""));
    // 2) Legenda: só as palavras das cenas
    nG = p.roteiro.gancho.replace(/[.!?…]+$/, "").trim().split(/\s+/).length;
    nCenas = falas.reduce((a, f) => a + f.trim().split(/\s+/).length, 0);
  }
  return { palavras, seg, nG, nCenas, textos, volta };
}

export async function gerarVideo(p: PacoteVideo, dir: string, o: OpcoesGerador = {}): Promise<{ mp4: string; capa: Buffer; chars: number; duracao: number }> {
  cancelamentoAtual = o.cancelado ?? null;
  try {
    return await gerarVideoInterno(p, dir, o);
  } finally {
    cancelamentoAtual = null;
  }
}

async function gerarVideoInterno(p: PacoteVideo, dir: string, o: OpcoesGerador): Promise<{ mp4: string; capa: Buffer; chars: number; duracao: number }> {
  const ff = o.ffmpeg ?? (await caminhoFfmpeg());
  const leve = o.qualidade === "leve";
  // libvips (sharp) cria uma thread por núcleo: no servidor compartilhado limita a 1 para sobrar espaço no limite da conta.
  if (leve) sharp.concurrency(1);
  // 0) Texto falado: o roteiro vem escrito para a tela (algarismos); a conversão para a fala e o mapa de volta ficam aqui.
  const { fala, falado } = textoDaFala(p);
  // 1) Voz (ou voz falsa de teste). Voz igual à de uma prévia já ouvida vem do cache (sem gastar créditos).
  o.fase?.("voz");
  o.progresso?.(2, "Voz");
  let alin: Alinhamento;
  const audio = "voz.mp3";
  if (o.vozFalsa) {
    alin = alinhamentoFalso(falado);
    const dur = alin.character_end_times_seconds[alin.character_end_times_seconds.length - 1];
    await rodar(ff, ["-y", "-hide_banner", "-loglevel", "warning", "-f", "lavfi", "-i", `sine=frequency=220:duration=${dur.toFixed(2)}`, "-c:a", "libmp3lame", audio], dir);
  } else {
    const partesVoz = await vozPorPartes(p, fala, { chave: o.chaveElevenLabs, cacheDir: o.cacheVoz });
    alin = await juntarVozes(partesVoz, dir, ff, audio);
  }
  const analise = analisarVoz(p, fala, alin);
  const { palavras, seg, nG, nCenas } = analise;
  await mkdir(join(dir, "fonts"), { recursive: true });
  const ttf = MARCA.fontes.legenda.ttf;
  await copyFile(join(process.cwd(), ttf), join(dir, "fonts", basename(ttf)));

  // Tela dividida (vídeo enviado em cima, imagem embaixo). Sem vídeo legível, segue em tela cheia.
  const lay = layoutDoRoteiro(p.roteiro, p.imagens);
  if (lay.modo === "dividido") {
    const r = await gerarDividido({ p, dir, o, ff, leve, topo: lay.topo, analise, fala, falado, audio });
    if (r) return r;
  }

  o.fase?.("imagens");
  o.progresso?.(10, "Imagens");
  // 3) Plano de clipes. Abertura + cena 1 viram um clipe só (o cartão de título fica por cima do gancho). Cada cena mostra SEMPRE a
  //    imagem escolhida para ela (voz e imagem combinam). Cena longa vira cortes de ~4 s na mesma imagem, alternando o quadro
  //    aberto com uma aproximação (punch-in) para dar ritmo sem trocar de assunto.
  const ehVideo = (i: number) => ehVideoSrc(p.imagens[i]?.src ?? "");
  // A matéria tem vídeo (trailer) e nenhuma cena o escolheu: a cena do meio passa a usá-lo.
  const iVideo = p.imagens.findIndex((x) => ehVideoSrc(x.src));
  const escolhaDaCena = p.roteiro.cenas.map((c) => c.imagem);
  // `videoAutomatico`: o servidor pôs o vídeo numa cena por conta própria (então vale o teto de participação); se o dono escolheu
  // vídeo nas cenas, o que ele escolheu vale inteiro.
  const videoAutomatico = iVideo >= 0 && !escolhaDaCena.some(ehVideo) && escolhaDaCena.length >= 2;
  if (videoAutomatico) escolhaDaCena[Math.floor(escolhaDaCena.length / 2)] = iVideo;
  const usaveis = p.imagens.map((x, i) => (x.url && !x.url.startsWith("arte:") && !x.url.startsWith("yt:") && !ehVideoSrc(x.src) ? i : -1)).filter((i) => i >= 0);
  if (!usaveis.length) throw new Error("nenhuma imagem utilizável");
  const cenasSeg = seg.segs.filter((x) => x.tipo === "cena").map((x) => ({ ...x }));
  if (cenasSeg.length) cenasSeg[0].ini = 0;
  const plano: { img: number; ini: number; dur: number; punch: boolean; video: boolean; ss: number; ssManual?: number }[] = [];
  let anterior = -1;
  for (const c of cenasSeg) {
    const dur = c.fim - c.ini;
    let img = escolhaDaCena[c.cena] ?? 0;
    // A imagem escolhida para a capa vale para a abertura (1ª cena), desde que seja uma imagem (não um vídeo).
    if (plano.length === 0 && p.capa != null && !ehVideo(p.capa)) img = p.capa;
    const video = ehVideo(img) && !!p.imagens[img]?.url;
    if (!video && !usaveis.includes(img)) img = usaveis.find((i) => i !== anterior) ?? usaveis[0];
    const partes = video ? Math.max(1, Math.ceil(dur / TRECHO_MAX_S)) : Math.max(1, Math.min(3, Math.round(dur / 4.2)));
    for (let k = 0; k < partes; k++) plano.push({ img, ini: c.ini + (dur / partes) * k, dur: dur / partes, punch: !video && (k % 2 === 1 || (k === 0 && img === anterior)), video, ss: 0, ssManual: video && typeof p.roteiro.cenas[c.cena]?.ss === "number" ? p.roteiro.cenas[c.cena].ss! + (dur / partes) * k : undefined });
    anterior = img;
  }

  // 3b) Trechos de vídeo (material enviado pelo dono): corta em pontos de corte de cena, com teto de duração por trecho e de
  //     participação no vídeo final. Trecho que não couber vira imagem. O áudio original nunca entra (só a narração).
  const imagemReserva = (de: number) => usaveis.find((i) => i !== de) ?? usaveis[0];
  const fundirEmImagem = (it: (typeof plano)[number]) => {
    it.video = false;
    it.img = imagemReserva(plano[plano.indexOf(it) - 1]?.img ?? -1);
    it.punch = true;
  };
  let segundosVideo = 0;
  for (const it of plano) {
    if (!it.video) continue;
    if (videoAutomatico && segundosVideo + it.dur > seg.total * FRACAO_MAX_VIDEO) fundirEmImagem(it);
    else segundosVideo += it.dur;
  }
  const arquivosVideo = new Map<number, string>();
  const creditoDe = new Map<number, string>();
  for (const origem of new Set(plano.filter((x) => x.video).map((x) => x.img))) {
    const itens = plano.filter((x) => x.video && x.img === origem);
    const nome = `video${origem}.mp4`;
    // Vídeo enviado pelo dono (arquivo em /media). Se não der para ler, as cenas dele viram imagens.
    try {
      await copiarVideo(p, origem, join(dir, nome));
    } catch (err) {
      console.warn("[video] não consegui ler o vídeo enviado:", String((err as Error)?.message ?? err));
      itens.forEach(fundirEmImagem);
      continue;
    }
    const info = await rodar(ff, comandoCortes(nome), dir).catch(() => "");
    const duracaoVideo = lerDuracao(info);
    const trechos = escolherTrechos(duracaoVideo, lerCortes(info), itens.map((x) => x.dur));
    itens.forEach((it, k) => {
      // Ponto de partida escolhido pelo dono no painel: vale no lugar da escolha automática (sempre dentro do vídeo).
      if (it.ssManual != null && duracaoVideo > it.dur + 0.3) {
        it.ss = Number(Math.max(0, Math.min(it.ssManual, duracaoVideo - it.dur - 0.2)).toFixed(2));
        return;
      }
      const t = trechos[k];
      if (!t || t.dur < Math.min(1.2, it.dur)) {
        console.warn(`[video] trecho de vídeo da cena sem ponto de corte utilizável (vídeo de ${duracaoVideo.toFixed(0)} s): usando imagem`);
        return fundirEmImagem(it);
      }
      it.ss = t.ss;
    });
    arquivosVideo.set(origem, nome);
  }

  // 4) Imagens enquadradas para 9:16. Imagem larga (16:9): inteira no centro, sobre ela mesma desfocada (não corta personagem nas
  //    bordas); vertical/quadrada: recorte pelo foco (ou pela parte mais chamativa). Foco "inteira" força o primeiro modo.
  const LARG = leve ? 1620 : 2160;
  const ALT = leve ? 2880 : 3840;
  const prep = new Map<number, { nome: string; suave: boolean; fixo: boolean; pan?: { x0: number; x1: number }; capaArq?: string }>();
  const preparar = async (indice: number) => {
    const feito = prep.get(indice);
    if (feito) return feito;
    const img = p.imagens[indice];
    const buf = await baixar(img.url);
    const foco = img.foco || "auto";
    const nome = `cena${indice}.jpg`;
    const { jpeg, inteira } = await enquadrarVertical(buf, LARG, ALT, foco);
    await writeFile(join(dir, nome), jpeg);
    // Imagem larga no automático: preenche a tela (recorte pela parte mais chamativa) e a câmera desliza para o lado, mostrando mais da cena.
    let pan: { x0: number; x1: number } | undefined;
    let capaArq: string | undefined;
    const meta = await sharp(buf).metadata();
    if (foco === "auto" && (meta.width ?? 1) / (meta.height ?? 1) >= 1.25) {
      const grande = await sharp(buf).rotate().resize({ height: 1920 }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
      const att = await sharp(buf).rotate().resize(1080, 1920, { fit: "cover", position: sharp.strategy.attention }).toBuffer({ resolveWithObject: true });
      const x0 = Math.abs(att.info.cropOffsetLeft ?? 0);
      const folgaDir = grande.info.width - 1080 - x0;
      const dir_ = folgaDir >= x0 ? 1 : -1;
      const curso = Math.min(Math.max(dir_ === 1 ? folgaDir : x0, 0), 560);
      if (curso >= 80) {
        await writeFile(join(dir, `cena${indice}_pan.jpg`), await sharp(grande.data).linear(1.07, -128 * 0.07).modulate({ saturation: 1.22 }).jpeg({ quality: 90 }).toBuffer());
        capaArq = nome; // o quadro 9:16 já gravado serve para a capa
        pan = { x0, x1: x0 + dir_ * curso };
      }
    }
    // Alinhamento manual ou recorte escolhido pelo dono: a câmera só respira no centro, para o enquadramento dele aparecer como ele deixou.
    const r = { nome: pan ? `cena${indice}_pan.jpg` : nome, suave: inteira, fixo: !inteira && foco !== "auto", pan, capaArq };
    prep.set(indice, r);
    return r;
  };
  const clips: Clip[] = [];
  let capaDoPrimeiro = "";
  const creditos: { ini: number; fim: number; texto: string }[] = [];
  for (const c of plano) {
    if (c.video) {
      clips.push({ img: "", ini: c.ini, dur: c.dur, suave: true, video: { arquivo: arquivosVideo.get(c.img)!, ss: c.ss } });
      creditos.push({ ini: c.ini, fim: c.ini + c.dur, texto: creditoDe.get(c.img) ?? (p.imagens[c.img].alt || "Vídeo: material de divulgação") });
      continue;
    }
    const x = await preparar(c.img);
    // Clipes seguidos da mesma imagem alternam o sentido do deslize (o primeiro sempre parte do quadro da capa).
    const volta = x.pan && clips.length > 0 && clips.length % 2 === 1;
    clips.push({ img: x.nome, ini: c.ini, dur: c.dur, suave: x.suave, fixo: x.fixo, punch: c.punch && !x.suave && !x.pan, pan: x.pan && (volta ? { x0: x.pan.x1, x1: x.pan.x0 } : x.pan) });
    if (clips.length === 1) capaDoPrimeiro = x.capaArq ?? x.nome;
  }

  await writeFile(join(dir, "legenda.ass"), gerarAss(palavras.slice(nG, nG + nCenas), { creditos, cores: { texto: MARCA.cores.texto, destaque: MARCA.cores.destaque, contorno: MARCA.cores.fundo, alerta: MARCA.cores.alerta }, fonte: MARCA.fontes.legenda.familia, termos: p.termos }));

  o.fase?.("quadros");
  o.progresso?.(22, "Cartões e quadros");
  // 5) Quadros (marca, abertura, fechamento) e montagem
  const q = await gerarQuadros({ titulo: p.titulo, secao: p.secao, cta: p.cta, pergunta: p.pergunta ?? null });
  await sharp(q.moldura).extract({ left: 0, top: 0, width: 1080, height: 420 }).toFile(join(dir, "moldura_topo.png"));
  await sharp(q.moldura).extract({ left: 0, top: 1100, width: 1080, height: 820 }).toFile(join(dir, "moldura_base.png"));
  await sharp(q.abertura).extract({ left: 0, top: 940, width: 1080, height: 580 }).toFile(join(dir, "abertura.png"));
  await writeFile(join(dir, "fechamento.png"), q.fechamento);
  const fimAbertura = seg.segs.find((x) => x.tipo === "abertura")?.fim ?? 3;
  o.fase?.("trilha");
  o.progresso?.(26, "Música e efeitos");
  // Trilha: música sintetizada (sem direitos autorais) + whoosh em cada transição.
  const estilo = estiloDoVideo(p.id, p.trilha);
  const fechIni = seg.inicioFechamento;
  await rodar(ff, comandoTrilha(estilo, seg.total, instantesTransicao(clips, fechIni), "trilha.wav", leve), dir);
  const cartoes = await cartoesDoVideo(p, analise, fala, fimAbertura, dir);
  const efeitos = await efeitosDoVideo(p, cartoes, seg.total, ff, leve, dir);
  // Cada trecho de vídeo é preparado antes, sozinho (1 processo por vez); a montagem só lê o resultado.
  const comVideo = clips.map((c, k) => (c.video ? k : -1)).filter((k) => k >= 0);
  for (const [n, k] of comVideo.entries()) {
    const c = clips[k];
    const pronto = `clipe${k}.mp4`;
    o.progresso?.(32 + (6 * n) / comVideo.length, `Trecho de vídeo ${n + 1} de ${comVideo.length}`);
    await rodar(ff, comandoClipeVideo(c, pronto, leve), dir, { total: c.dur + 1, onFracao: (f) => o.progresso?.(32 + (6 * (n + f)) / comVideo.length, `Trecho de vídeo ${n + 1} de ${comVideo.length}`) });
    c.video!.pronto = pronto;
  }
  const planoMontagem = {
    cartoes,
    efeitos,
    corBarra: MARCA.cores.destaque,
    trilha: { arquivo: "trilha.wav", bpm: estilo.bpm, volume: VIDEO.musica[p.musica ?? "media"].volume, razao: VIDEO.musica[p.musica ?? "media"].razao },
    leve,
    clips,
    fechamento: { ini: seg.inicioFechamento, dur: Math.max(0.5, seg.total - seg.inicioFechamento) },
    total: seg.total,
    fimAbertura,
    arq: { molduraTopo: "moldura_topo.png", molduraBase: "moldura_base.png", abertura: "abertura.png", fechamento: "fechamento.png", audio, legenda: "legenda.ass", saida: "saida.mp4" },
  };
  o.fase?.("montagem");
  await montarPassadas(planoMontagem, ff, dir, o);

  o.fase?.("capa");
  o.progresso?.(97, "Capa");
  // 6) Capa: 1º quadro com moldura e cartão de abertura por cima
  if (clips[0].video) await rodar(ff, ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(clips[0].video.ss), "-i", clips[0].video.arquivo, "-frames:v", "1", "capa0.jpg"], dir);
  const base = await sharp(join(dir, clips[0].video ? "capa0.jpg" : capaDoPrimeiro)).resize(1080, 1920, { fit: "cover" }).toBuffer();
  const capa = await sharp(base).composite([{ input: q.moldura }, { input: q.abertura }]).jpeg({ quality: 88 }).toBuffer();
  return { mp4: join(dir, "saida.mp4"), capa, chars: falado.length, duracao: seg.total };
}

type Analise = ReturnType<typeof analisarVoz>;
type Fala = ReturnType<typeof textoDaFala>["fala"];
type Cartoes = { arquivo: string; ini: number; fim: number; tipo: string; y: number }[];
type Resultado = { mp4: string; capa: Buffer; chars: number; duracao: number };

/** Cartões de dados (só no caminho novo, em que as palavras da tela estão mapeadas): PNG por cartão e o plano de tempo. */
async function cartoesDoVideo(p: PacoteVideo, a: Analise, fala: Fala, fimAbertura: number, dir: string): Promise<Cartoes> {
  const cartoes: Cartoes = [];
  const { textos, volta, palavras, seg } = a;
  if (!(fala && volta && textos && p.fatos)) return cartoes;
  let pos = textos[0].length;
  const porCena = seg.segs
    .filter((x) => x.tipo === "cena")
    .map((x) => {
      const n = textos[1 + x.cena]?.length ?? 0;
      const palavrasCena = palavras.slice(pos, pos + n);
      pos += n;
      return { ini: x.ini, fim: x.fim, palavras: palavrasCena };
    });
  // a 1ª cena começa em 0 (junto com a abertura); o plano respeita fimAbertura
  for (const c of planoCartoes(porCena, p.roteiro, p.fatos, fimAbertura)) {
    const r = await gerarCartao(c.tipo, p.fatos, c.item ?? 0);
    if (!r) continue;
    const arquivo = `cartao_${cartoes.length}.png`;
    await writeFile(join(dir, arquivo), r.png);
    cartoes.push({ arquivo, ini: c.ini, fim: c.fim, tipo: c.tipo, y: c.y });
  }
  return cartoes;
}

/** Efeitos sonoros: um por cartão, no instante em que ele entra (intervalo mínimo de 1,5 s). */
async function efeitosDoVideo(p: PacoteVideo, cartoes: Cartoes, total: number, ff: string, leve: boolean, dir: string): Promise<{ arquivo: string; volume: number } | undefined> {
  const eventos = filtrarEventos(cartoes.map((c) => ({ t: c.ini, tipo: somDoCartao(c.tipo) })));
  if (p.efeitos === false || !eventos.length) return undefined;
  try {
    await rodar(ff, comandoEfeitos(eventos, total, "efeitos.wav", leve), dir);
    return { arquivo: "efeitos.wav", volume: VIDEO.efeitos.volume };
  } catch (err) {
    console.warn("[video] efeitos sonoros não saíram (o vídeo segue sem eles):", String((err as Error)?.message ?? err).slice(0, 120));
    return undefined;
  }
}

/** Servidor com poucos recursos: duas passadas, cada uma com metade das entradas (cada entrada do ffmpeg usa threads). */
async function montarPassadas(plano: PlanoMontagem, ff: string, dir: string, o: OpcoesGerador): Promise<void> {
  const duas = !!plano.leve;
  for (const etapa of duas ? ([1, 2] as const) : ([0] as const)) {
    const { args, filtro } = montar({ ...plano, etapa: etapa || undefined });
    await writeFile(join(dir, "filtro.txt"), filtro);
    const [de, ate] = !duas ? [38, 95] : etapa === 1 ? [38, 66] : [66, 95];
    const rotulo = !duas ? "Montando o vídeo" : etapa === 1 ? "Montando as cenas" : "Acabamento (moldura, cartões, legenda e áudio)";
    o.progresso?.(de, rotulo);
    await rodar(ff, args, dir, { total: plano.total, onFracao: (f) => o.progresso?.(de + (ate - de) * f, rotulo) });
  }
}

/**
 * Tela dividida: em cima o vídeo enviado (cortes de até 4,5 s desde o quadro 0, sem o áudio original), embaixo a imagem da capa ou
 * a escolhida para cada cena (respiração lenta, troca com fade), legenda na divisa (com o gancho), sem cartão de título.
 * Devolve `null` se o vídeo não puder ser lido (o gerador segue em tela cheia).
 */
async function gerarDividido(c: { p: PacoteVideo; dir: string; o: OpcoesGerador; ff: string; leve: boolean; topo: number; analise: Analise; fala: Fala; falado: string; audio: string }): Promise<Resultado | null> {
  const { p, dir, o, ff, leve, analise, fala } = c;
  const { palavras, seg, nG, nCenas } = analise;
  const item = p.imagens[c.topo];
  const ext = (/\.(mp4|webm|mov)$/i.exec(item.src)?.[1] ?? "mp4").toLowerCase();
  const nomeVideo = `video_topo.${ext}`;
  o.progresso?.(10, "Vídeo de cima");
  try {
    await copiarVideo(p, c.topo, join(dir, nomeVideo));
  } catch (err) {
    console.warn("[video] tela dividida sem vídeo legível: gerando em tela cheia:", String((err as Error)?.message ?? err).slice(0, 160));
    return null;
  }
  const info = await rodar(ff, comandoCortes(nomeVideo), dir).catch(() => "");
  const duracaoVideo = lerDuracao(info);
  const cenasSeg = seg.segs.filter((x) => x.tipo === "cena").map((x) => ({ ...x }));
  if (duracaoVideo < 4 || !cenasSeg.length) {
    console.warn("[video] tela dividida sem vídeo legível: gerando em tela cheia");
    return null;
  }
  cenasSeg[0].ini = 0;

  // 1) Plano de cima: cortes de até 4,5 s por cena; o ponto de partida escolhido no painel vale para o 1º corte da cena.
  const cortes: { ini: number; dur: number; ssManual?: number }[] = [];
  for (const s of cenasSeg) {
    const dur = s.fim - s.ini;
    const partes = Math.max(1, Math.ceil(dur / TRECHO_MAX_S));
    const ssCena = p.roteiro.cenas[s.cena]?.ss;
    for (let k = 0; k < partes; k++) cortes.push({ ini: s.ini + (dur / partes) * k, dur: dur / partes, ssManual: typeof ssCena === "number" ? ssCena + (dur / partes) * k : undefined });
  }
  const trechos = escolherTrechos(duracaoVideo, lerCortes(info), cortes.map((x) => x.dur));
  const pontos = cortes.map((x, k) => (x.ssManual != null && duracaoVideo > x.dur + 0.3 ? Number(Math.max(0, Math.min(x.ssManual, duracaoVideo - x.dur - 0.2)).toFixed(2)) : (trechos[k]?.ss ?? 0)));
  const fimCenas = seg.inicioFechamento + TRANSICAO / 2;
  const quadros = quadrosDosCortes(cortes, fimCenas);
  const enq: EnquadramentoTopo = enquadramentoTopoValido(item.focoTopo) ? item.focoTopo : "centre";

  // 2) Prepara cada corte sozinho (1 processo por vez) e junta sem recodificar.
  o.fase?.("imagens");
  for (let k = 0; k < cortes.length; k++) {
    o.progresso?.(10 + (14 * k) / cortes.length, `Vídeo de cima: corte ${k + 1} de ${cortes.length}`);
    await rodar(ff, comandoCorteTopo({ arquivo: nomeVideo, ss: pontos[k], quadros: quadros[k], enquadramento: enq, saida: `topo_${k}.mp4`, leve }), dir);
  }
  await writeFile(join(dir, "topo_lista.txt"), cortes.map((_, k) => `file 'topo_${k}.mp4'`).join(String.fromCharCode(10)));
  try {
    await rodar(ff, comandoJuntarTopo("topo_lista.txt", "topo.mp4"), dir);
  } catch (err) {
    console.warn("[video] juntar o vídeo de cima sem recodificar falhou; recodificando:", String((err as Error)?.message ?? err).slice(0, 160));
    await rodar(ff, comandoJuntarTopoRecodificando("topo_lista.txt", "topo.mp4", leve), dir);
  }

  // 3) Plano de baixo: a imagem da capa (ou a 1ª utilizável) e, por cena, a escolhida pelo dono.
  o.progresso?.(24, "Imagens de baixo");
  const usavel = (i: number | null | undefined): i is number => {
    const x = i == null ? undefined : p.imagens[i];
    return !!x && !!x.url && !x.url.startsWith("arte:") && !x.url.startsWith("yt:") && !ehVideoSrc(x.src);
  };
  const usaveis = p.imagens.map((_, i) => i).filter(usavel);
  if (!usaveis.length) throw new Error("nenhuma imagem utilizável");
  const padrao = usavel(p.capa) ? p.capa : usaveis[0];
  const grupos = gruposBaixo(
    cenasSeg.map((s) => {
      const b = p.roteiro.cenas[s.cena]?.baixo;
      return { ini: s.ini, fim: s.fim, baixo: usavel(b) ? b : padrao };
    }),
  );
  for (const i of new Set([padrao, ...grupos.map((g) => g.img)])) {
    const img = p.imagens[i];
    const { jpeg } = await enquadrarVertical(await baixar(img.url), DIVIDIDO.prepBaixo.w, DIVIDIDO.prepBaixo.h, img.focoBaixo || "auto");
    await writeFile(join(dir, `baixo${i}.jpg`), jpeg);
  }

  // 4) Legenda na divisa, já com o gancho (não há cartão de título); crédito do vídeo o tempo todo.
  const credito = item.alt || "Vídeo: material de divulgação";
  await writeFile(
    join(dir, "legenda.ass"),
    gerarAss(palavras.slice(0, nG + nCenas), { posicao: "meio", creditos: [{ ini: 0, fim: seg.inicioFechamento, texto: credito }], cores: { texto: MARCA.cores.texto, destaque: MARCA.cores.destaque, contorno: MARCA.cores.fundo, alerta: MARCA.cores.alerta }, fonte: MARCA.fontes.legenda.familia, termos: p.termos }),
  );

  // 5) Quadros: moldura, divisória, fechamento (sem abertura).
  o.fase?.("quadros");
  o.progresso?.(26, "Cartões e quadros");
  const q = await gerarQuadros({ titulo: p.titulo, secao: p.secao, cta: p.cta, pergunta: p.pergunta ?? null, dividido: true });
  await sharp(q.moldura).extract({ left: 0, top: 0, width: 1080, height: 420 }).toFile(join(dir, "moldura_topo.png"));
  await sharp(q.moldura).extract({ left: 0, top: 1100, width: 1080, height: 820 }).toFile(join(dir, "moldura_base.png"));
  await writeFile(join(dir, "divisoria.png"), q.divisoria!);
  await writeFile(join(dir, "fechamento.png"), q.fechamento);
  const fimAbertura = seg.segs.find((x) => x.tipo === "abertura")?.fim ?? 3;

  // 6) Trilha (whoosh só nas trocas da imagem de baixo e no fechamento), cartões sobre a metade de baixo, efeitos.
  o.fase?.("trilha");
  o.progresso?.(30, "Música e efeitos");
  const estilo = estiloDoVideo(p.id, p.trilha);
  await rodar(ff, comandoTrilha(estilo, seg.total, [...grupos.slice(1).map((g) => g.ini), seg.inicioFechamento], "trilha.wav", leve), dir);
  const cartoes = (await cartoesDoVideo(p, analise, fala, fimAbertura, dir)).map((x) => ({ ...x, y: DIVIDIDO.cartaoY }));
  const efeitos = await efeitosDoVideo(p, cartoes, seg.total, ff, leve, dir);

  // 7) Montagem (as mesmas 2 passadas).
  o.fase?.("montagem");
  await montarPassadas(
    {
      clips: [],
      dividido: { topo: "topo.mp4", fimCenas, baixo: grupos.map((g) => ({ img: `baixo${g.img}.jpg`, ini: g.ini, dur: g.dur })) },
      semAbertura: true,
      divisoria: "divisoria.png",
      cartoes,
      efeitos,
      corBarra: MARCA.cores.destaque,
      trilha: { arquivo: "trilha.wav", bpm: estilo.bpm, volume: VIDEO.musica[p.musica ?? "media"].volume, razao: VIDEO.musica[p.musica ?? "media"].razao },
      leve,
      fechamento: { ini: seg.inicioFechamento, dur: Math.max(0.5, seg.total - seg.inicioFechamento) },
      total: seg.total,
      fimAbertura,
      arq: { molduraTopo: "moldura_topo.png", molduraBase: "moldura_base.png", abertura: "abertura.png", fechamento: "fechamento.png", audio: c.audio, legenda: "legenda.ass", saida: "saida.mp4" },
    },
    ff,
    dir,
    o,
  );

  // 8) Capa: NÃO dividida (pedido do dono). A imagem da capa em tela cheia (enquadramento 9:16 dela) + moldura + cartão de título,
  //    igual à capa da tela cheia.
  o.fase?.("capa");
  o.progresso?.(97, "Capa");
  const imgCapa = p.imagens[padrao];
  const { jpeg: fundoCapa } = await enquadrarVertical(await baixar(imgCapa.url), 1080, 1920, imgCapa.foco || "auto");
  const capa = await sharp(fundoCapa).composite([{ input: q.moldura }, { input: q.abertura }]).jpeg({ quality: 88 }).toBuffer();
  return { mp4: join(dir, "saida.mp4"), capa, chars: c.falado.length, duracao: seg.total };
}
