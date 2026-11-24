// Teste local do gerador de vídeo, sem gastar crédito (voz falsa) e sem rede. Gera imagens de teste, monta um vídeo curto ou longo,
// mede o tempo de cada fase e extrai quadros para conferir. Rodar da raiz do projeto:
//   VIDEO_TESTE=1 npx tsx scripts/video/teste-local.ts --perfil longo --manter
//   (PowerShell: $env:VIDEO_TESTE=1; npx tsx scripts/video/teste-local.ts --perfil longo --manter)
// Opções: --perfil curto|longo (padrão curto) · --saida <pasta> · --manter (não apaga a pasta de trabalho)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { MARCA } from "~/marca";
import { VIDEO } from "~/video/config";
import type { CenaRoteiro } from "~/video/roteiro";
import { caminhoFfmpeg, gerarVideo, type PacoteVideo } from "~/video/gerador.server";

process.env.VIDEO_TESTE = "1";
const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const perfil = arg("perfil") === "longo" ? "longo" : "curto";
const manter = process.argv.includes("--manter");
const FIX = resolve("scripts/video/fixtures");

async function imagens(): Promise<string[]> {
  await mkdir(FIX, { recursive: true });
  const cores = ["#7b2cbf", "#1d6fa5", "#2a9d5c", "#c1121f", "#e07a00", "#3a3a8c"];
  const out: string[] = [];
  for (let i = 0; i < 8; i++) {
    const vertical = i >= 6;
    const [w, h] = vertical ? [1080, 1350] : [1920, 1080];
    const arq = join(FIX, `img${i}.jpg`);
    if (!existsSync(arq)) {
      const marcas = vertical
        ? `<text x="40" y="700" font-size="320" fill="white" font-family="sans-serif">${i}</text>`
        : [100, 900, 1600].map((x, k) => `<text x="${x}" y="620" font-size="300" fill="${k === 1 ? "yellow" : "white"}" font-family="sans-serif">${"ABC"[k]}${i}</text>`).join("");
      const svg = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="none"/>${marcas}</svg>`);
      await sharp({ create: { width: w, height: h, channels: 3, background: cores[i % cores.length] } }).composite([{ input: svg }]).jpeg({ quality: 85 }).toFile(arq);
    }
    out.push(pathToFileURL(arq).href);
  }
  return out;
}

const FALA = "Esta cena explica mais um ponto da matéria com calma, citando detalhes importantes para quem joga e quer entender cada passo";

function pacote(urls: string[]): PacoteVideo {
  const n = perfil === "longo" ? 10 : 4;
  // As primeiras cenas usam algarismos, sigla e data de propósito: o gerador converte para a fala e remapeia a legenda.
  const ESPECIAIS = ["GTA 6 chega em 28/11 no PS5 e no Xbox.", "Sai por R$ 249,90 e tem nota 8,7 da crítica.", "A RTX 4060 roda em 100% do tempo a 60 quadros?"];
  // --serie top5|gratis|semana: cenas de lista com cartão de ranking, grátis ou dia (item por cena).
  const serie = arg("serie");
  const CARTAO = ["lancamento", "preco", "plataformas", "gratis"] as const;
  const tipoSerie = (serie === "top5" ? "ranking" : serie === "gratis" ? "gratis" : serie === "semana" ? "dia" : null) as "ranking" | "gratis" | "dia" | null;
  const nSerie = serie === "top5" ? 5 : serie === "gratis" ? 3 : serie === "semana" ? 3 : n;
  const cenas: CenaRoteiro[] = Array.from({ length: tipoSerie ? nSerie : n }, (_, i) => ({
    fala: tipoSerie ? `${i + 1}. ${FALA} ${i + 1}` : (ESPECIAIS[i] ?? `${FALA} ${i + 1}`),
    imagem: i % urls.length,
    ...(tipoSerie ? { cartao: tipoSerie, item: i } : CARTAO[i] ? { cartao: CARTAO[i] } : {}),
  }));
  const gancho = "Olha só esta novidade que muda tudo";
  // --pergunta: fechamento com pergunta (voz e cartão de fechamento novo).
  const pergunta = process.argv.includes("--pergunta") ? "Você pagaria R$ 349 nele?" : null;
  const fechamento = pergunta ? `${pergunta} ${VIDEO.fechamentoPergunta}` : VIDEO.fechamento;
  const falado = [gancho, ...cenas.map((c) => c.fala), fechamento].map((t) => t.replace(/[.!?…]+$/, "")).join(". ") + ".";
  return {
    id: 7,
    titulo: "Teste local do gerador de vídeo",
    secao: serie ? (MARCA.video.series[serie === "semana" ? "lancamentos-semana" : serie === "gratis" ? "gratis-semana" : serie]?.rotulo ?? "SÉRIE") : "NOTÍCIAS",
    roteiro: { gancho, cenas, titulo_curto: "TESTE" },
    imagens: urls.map((u, i) => ({ src: `/teste/${i}.jpg`, url: u, foco: "auto" })),
    voz: "x",
    modelo: "m",
    velocidade: 1,
    falado,
    pronuncia: MARCA.video.pronunciaBase,
    pausa: VIDEO.voz.pausaAntesNumero,
    termos: ["GTA 6", "Xbox"],
    trilha: serie ? MARCA.video.series[serie === "semana" ? "lancamentos-semana" : serie === "gratis" ? "gratis-semana" : serie]?.trilha : undefined,
    fatos: {
      ranking: ["Elden Ring", "Hades II", "Balatro", "Hollow Knight: Silksong", "Astro Bot"].map((titulo, i) => ({ titulo, posicao: `#${5 - i}` })),
      dias: [
        { rotulo: "SEG", data: "30/11", jogos: ["Jogo X", "Jogo Y"] },
        { rotulo: "QUI", data: "03/12", jogos: ["Jogo Z", "Jogo W", "Jogo V", "Jogo U", "Jogo T"] },
        { rotulo: "SEX", data: "04/12", jogos: ["Jogo K"] },
      ],
      jogo: "GTA 6",
      preco: "R$ 249,90",
      lancamento: { data: "28/11", diaSemana: "SEXTA", ano: 2026 },
      plataformas: ["PC", "PS", "XBOX"],
      nota: { valor: 8.7, veiculos: 12, veredito: "Elogiado pela direção de arte" },
      gratis: [{ nome: "Hades II", loja: "Epic Games Store", ate: "QUI, 27/11, ÀS 13H", precoNormal: "R$ 89,99" }],
    },
    fechamento,
    pergunta,
    cta: "MATÉRIA COMPLETA: LINK NO PERFIL",
  };
}

const base = arg("saida") ? resolve(arg("saida")!) : await mkdtemp(join(tmpdir(), "video-teste-"));
await mkdir(base, { recursive: true });
const tempos: [string, number][] = [];
let fase = "início";
let t0 = Date.now();
const marca = (proxima: string) => {
  tempos.push([fase, (Date.now() - t0) / 1000]);
  fase = proxima;
  t0 = Date.now();
};
const total0 = Date.now();
const r = await gerarVideo(pacote(await imagens()), base, { qualidade: "leve", vozFalsa: true, fase: marca });
marca("fim");
await writeFile(join(base, "capa.jpg"), r.capa);
console.log(`\nperfil ${perfil}: ${r.duracao.toFixed(1)} s de vídeo em ${((Date.now() - total0) / 1000).toFixed(1)} s`);
for (const [n, s] of tempos.slice(1)) console.log(`  ${n.padEnd(10)} ${s.toFixed(1)} s`);
const ff = await caminhoFfmpeg();
const info = spawnSync(ff, ["-hide_banner", "-i", r.mp4], { encoding: "utf8" }).stderr;
console.log(info.split("\n").filter((l) => /Duration|Video:|Audio:/.test(l)).map((l) => "  " + l.trim()).join("\n"));
for (const s of [1, 5, r.duracao / 2, Math.max(0, r.duracao - 1)]) spawnSync(ff, ["-y", "-loglevel", "error", "-ss", s.toFixed(2), "-i", r.mp4, "-frames:v", "1", join(base, `quadro_${s.toFixed(0)}s.png`)]);
console.log(`\nMP4 e quadros em: ${base}`);
if (!manter) console.log("(use --manter para não apagar; a pasta está em tmp e some sozinha)");
else void rm;
