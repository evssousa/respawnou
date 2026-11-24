// Gerador do vídeo (voz + imagens + ffmpeg): usado pelo worker do GitHub Actions e, no modo "servidor", pelo próprio site.
import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { basename, join } from "node:path";
import { MARCA } from "~/marca";
import sharp from "sharp";
import { recortarComFoco } from "~/social/render/imagem.server";
import { gerarQuadros } from "./render/quadros.server";
import { gerarAss, palavrasDoAlinhamento, segmentos } from "../../scripts/video/ass";
import { alinhamentoFalso, sintetizar } from "../../scripts/video/elevenlabs";
import { type Clip, instantesTransicao, montar } from "../../scripts/video/ffmpeg";
import { comandoTrilha, estiloDoVideo } from "../../scripts/video/musica";
import { comandoCortes, ehVideoSrc, escolherTrechos, FRACAO_MAX_VIDEO, lerCortes, lerDuracao, TRECHO_MAX_S } from "../../scripts/video/videoclip";

export interface PacoteVideo {
  id: number;
  titulo: string;
  secao: string;
  roteiro: { gancho: string; cenas: { fala: string; imagem: number }[]; titulo_curto: string };
  imagens: { src: string; url: string; foco: string; alt?: string }[];
  capa?: number;
  voz: string;
  modelo: string;
  velocidade: number;
  falado: string;
  fechamento: string;
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
  // Só no teste local (scripts/video/teste-local.ts): imagem do disco. Fora dele, file:// continua proibido (as URLs vêm do banco).
  if (process.env.VIDEO_TESTE === "1" && url.startsWith("file://")) return readFile(fileURLToPath(url));
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": MARCA.video.userAgent } });
  if (!r.ok) throw new Error(`imagem ${url} → HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
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
  if (inteira) {
    const fundo = await sharp(buf).rotate().resize(w, h, { fit: "cover", position: sharp.strategy.attention }).blur(40).modulate({ brightness: 0.5 }).jpeg({ quality: 85 }).toBuffer();
    const frente = await sharp(buf).rotate().resize(w, h, { fit: "inside" }).toBuffer();
    return { jpeg: await sharp(fundo).composite([{ input: frente, gravity: "centre" }]).jpeg({ quality: qualidade }).toBuffer(), inteira };
  }
  return { jpeg: await sharp(await recortarComFoco(buf, w, h, foco)).jpeg({ quality: qualidade }).toBuffer(), inteira };
}

export async function gerarVideo(p: PacoteVideo, dir: string, o: OpcoesGerador = {}): Promise<{ mp4: string; capa: Buffer; chars: number; duracao: number }> {
  const ff = o.ffmpeg ?? (await caminhoFfmpeg());
  const leve = o.qualidade === "leve";
  // libvips (sharp) cria uma thread por núcleo: no servidor compartilhado limita a 1 para sobrar espaço no limite da conta.
  if (leve) sharp.concurrency(1);
  // 1) Voz (ou voz falsa de teste)
  o.fase?.("voz");
  let alin;
  let audio = "voz.mp3";
  if (o.vozFalsa) {
    alin = alinhamentoFalso(p.falado);
    const dur = alin.character_end_times_seconds[alin.character_end_times_seconds.length - 1];
    await rodar(ff, ["-y", "-hide_banner", "-loglevel", "warning", "-f", "lavfi", "-i", `sine=frequency=220:duration=${dur.toFixed(2)}`, "-c:a", "libmp3lame", audio], dir);
  } else {
    const chave = o.chaveElevenLabs ?? process.env.ELEVENLABS_API_KEY;
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
  await mkdir(join(dir, "fonts"), { recursive: true });
  const ttf = MARCA.fontes.legenda.ttf;
  await copyFile(join(process.cwd(), ttf), join(dir, "fonts", basename(ttf)));

  o.fase?.("imagens");
  // 3) Plano de clipes. Abertura + cena 1 viram um clipe só (o cartão de título fica por cima do gancho). Cada cena mostra SEMPRE a
  //    imagem escolhida para ela (voz e imagem combinam). Cena longa vira cortes de ~4 s na mesma imagem, alternando o quadro
  //    aberto com uma aproximação (punch-in) para dar ritmo sem trocar de assunto.
  const ehVideo = (i: number) => ehVideoSrc(p.imagens[i]?.src ?? "");
  // A matéria tem vídeo (trailer) e nenhuma cena o escolheu: a cena do meio passa a usá-lo.
  const iVideo = p.imagens.findIndex((x) => ehVideoSrc(x.src));
  const escolhaDaCena = p.roteiro.cenas.map((c) => c.imagem);
  if (iVideo >= 0 && !escolhaDaCena.some(ehVideo) && escolhaDaCena.length >= 2) escolhaDaCena[Math.floor(escolhaDaCena.length / 2)] = iVideo;
  const usaveis = p.imagens.map((x, i) => (x.url && !x.url.startsWith("arte:") && !x.url.startsWith("yt:") && !ehVideoSrc(x.src) ? i : -1)).filter((i) => i >= 0);
  if (!usaveis.length) throw new Error("nenhuma imagem utilizável");
  const cenasSeg = seg.segs.filter((x) => x.tipo === "cena").map((x) => ({ ...x }));
  if (cenasSeg.length) cenasSeg[0].ini = 0;
  const plano: { img: number; ini: number; dur: number; punch: boolean; video: boolean; ss: number }[] = [];
  let anterior = -1;
  for (const c of cenasSeg) {
    const dur = c.fim - c.ini;
    let img = escolhaDaCena[c.cena] ?? 0;
    // A imagem escolhida para a capa vale para a abertura (1ª cena), desde que seja uma imagem (não um vídeo).
    if (plano.length === 0 && p.capa != null && !ehVideo(p.capa)) img = p.capa;
    const video = ehVideo(img) && !!p.imagens[img]?.url;
    if (!video && !usaveis.includes(img)) img = usaveis.find((i) => i !== anterior) ?? usaveis[0];
    const partes = video ? Math.max(1, Math.min(4, Math.ceil(dur / TRECHO_MAX_S))) : Math.max(1, Math.min(3, Math.round(dur / 4.2)));
    for (let k = 0; k < partes; k++) plano.push({ img, ini: c.ini + (dur / partes) * k, dur: dur / partes, punch: !video && (k % 2 === 1 || (k === 0 && img === anterior)), video, ss: 0 });
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
    if (segundosVideo + it.dur > seg.total * FRACAO_MAX_VIDEO) fundirEmImagem(it);
    else segundosVideo += it.dur;
  }
  const arquivosVideo = new Map<number, string>();
  const creditoDe = new Map<number, string>();
  for (const origem of new Set(plano.filter((x) => x.video).map((x) => x.img))) {
    const itens = plano.filter((x) => x.video && x.img === origem);
    const nome = `video${origem}.mp4`;
    // Vídeo enviado pelo dono (arquivo em /media). Se não der para ler, as cenas dele viram imagens.
    try {
      await writeFile(join(dir, nome), await baixar(p.imagens[origem].url));
    } catch (err) {
      console.warn("[video] não consegui ler o vídeo enviado:", String((err as Error)?.message ?? err));
      itens.forEach(fundirEmImagem);
      continue;
    }
    const info = await rodar(ff, comandoCortes(nome), dir).catch(() => "");
    const trechos = escolherTrechos(lerDuracao(info), lerCortes(info), itens.map((x) => x.dur));
    itens.forEach((it, k) => {
      const t = trechos[k];
      if (!t || t.dur < it.dur * 0.6) return fundirEmImagem(it);
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
        await writeFile(join(dir, `cena${indice}_pan.jpg`), grande.data);
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

  await writeFile(join(dir, "legenda.ass"), gerarAss(palavras.slice(nG, nG + nCenas), { creditos, cores: { texto: MARCA.cores.texto, destaque: MARCA.cores.destaque, contorno: MARCA.cores.fundo }, fonte: MARCA.fontes.legenda.familia }));

  o.fase?.("quadros");
  // 5) Quadros (marca, abertura, fechamento) e montagem
  const q = await gerarQuadros({ titulo: p.titulo, secao: p.secao, cta: p.cta });
  await writeFile(join(dir, "moldura.png"), q.moldura);
  await writeFile(join(dir, "abertura.png"), q.abertura);
  await writeFile(join(dir, "fechamento.png"), q.fechamento);
  const fimAbertura = seg.segs.find((x) => x.tipo === "abertura")?.fim ?? 3;
  o.fase?.("trilha");
  // Trilha: música sintetizada (sem direitos autorais) + whoosh em cada transição.
  const estilo = estiloDoVideo(p.id);
  const fechIni = seg.inicioFechamento;
  await rodar(ff, comandoTrilha(estilo, seg.total, instantesTransicao(clips, fechIni), "trilha.wav", leve), dir);
  const { args, filtro } = montar({
    corBarra: MARCA.cores.destaque,
    trilha: { arquivo: "trilha.wav", bpm: estilo.bpm },
    leve,
    clips,
    fechamento: { ini: seg.inicioFechamento, dur: Math.max(0.5, seg.total - seg.inicioFechamento) },
    total: seg.total,
    fimAbertura,
    arq: { moldura: "moldura.png", abertura: "abertura.png", fechamento: "fechamento.png", audio, legenda: "legenda.ass", saida: "saida.mp4" },
  });
  await writeFile(join(dir, "filtro.txt"), filtro);
  o.fase?.("montagem");
  try {
    await rodar(ff, args, dir);
  } catch (err) {
    // Limite de processos/threads da hospedagem estourou no meio: espera um pouco e tenta uma vez de novo.
    if (!/pthread_create|Resource temporarily unavailable/i.test(String((err as Error)?.message ?? err))) throw err;
    await new Promise((ok) => setTimeout(ok, 20_000));
    await rodar(ff, args, dir);
  }

  o.fase?.("capa");
  // 6) Capa: 1º quadro com moldura e cartão de abertura por cima
  if (clips[0].video) await rodar(ff, ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(clips[0].video.ss), "-i", clips[0].video.arquivo, "-frames:v", "1", "capa0.jpg"], dir);
  const base = await sharp(join(dir, clips[0].video ? "capa0.jpg" : capaDoPrimeiro)).resize(1080, 1920, { fit: "cover" }).toBuffer();
  const capa = await sharp(base).composite([{ input: q.moldura }, { input: q.abertura }]).jpeg({ quality: 88 }).toBuffer();
  return { mp4: join(dir, "saida.mp4"), capa, chars: p.falado.length, duracao: seg.total };
}
