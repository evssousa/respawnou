// Gera os cartões de dados com fatos de exemplo (nome longo, preço sem dígito, nota baixa, 6 plataformas...) e uma "folha" com cada
// um sobre uma imagem na posição real (x 24, y 560), para conferir de uma vez.
// Rodar da raiz: npx tsx --tsconfig tsconfig.json scripts/video/testes/cartoes-render.ts [pasta-de-saida]
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import type { FatosVideo, TipoCartao } from "~/video/cartoes";
import { gerarCartao } from "~/video/render/cartao.server";

const saida = resolve(process.argv[2] ?? "C:/Users/evsli/AppData/Local/Temp/cartoes-teste");
await mkdir(saida, { recursive: true });

const base: FatosVideo = {
  jogo: "The Legend of Zelda: Ocarina of Time Remake Definitive Edition",
  preco: "R$ 249,90",
  lancamento: { data: "28/11", diaSemana: "SEXTA", ano: 2027 },
  plataformas: ["PC", "PS", "XBOX", "SWITCH", "MOBILE", "EXTRA"],
  nota: { valor: 8.7, veiculos: 12, veredito: "Elogiado pela direção de arte e pelo combate, criticado pela duração curta do modo história" },
  requisitos: [
    { rotulo: "Placa de vídeo", minimo: "NVIDIA GeForce GTX 1060 com 6 GB de memória" },
    { rotulo: "Processador", minimo: "Intel Core i5-8400" },
    { rotulo: "Memória RAM", minimo: "16 GB" },
  ],
  gratis: [{ nome: "Hades II: Edição Completa com Todas as Expansões", loja: "Epic Games Store", ate: "QUI, 27/11, ÀS 13H", precoNormal: "R$ 89,99" }],
};
const casos: [string, TipoCartao, FatosVideo][] = [
  ["preco", "preco", base],
  ["preco-gratuito", "preco", { ...base, preco: "GRATUITO" }],
  ["lancamento", "lancamento", base],
  ["nota", "nota", base],
  ["nota-baixa", "nota", { ...base, nota: { valor: 4.9, veiculos: 1 } }],
  ["requisitos", "requisitos", base],
  ["gratis", "gratis", base],
  ["plataformas", "plataformas", base],
];
const fundo = await sharp({ create: { width: 1080, height: 1920, channels: 3, background: "#2a6f97" } }).jpeg().toBuffer();
const camadas: { input: Buffer; left: number; top: number }[] = [];
let y = 40;
for (const [nome, tipo, f] of casos) {
  const c = await gerarCartao(tipo, f);
  if (!c) {
    console.log(nome, "→ sem cartão");
    continue;
  }
  await writeFile(join(saida, `${nome}.png`), c.png);
  console.log(nome.padEnd(16), `${c.largura}x${c.altura}`);
  // folha: todos empilhados em x 24 (uma única folha só cabe uns 5; os demais vão para outra)
  if (y + c.altura < 1900) {
    camadas.push({ input: c.png, left: 24, top: y });
    y += c.altura - 60;
  }
}
await sharp(fundo).composite(camadas).jpeg({ quality: 90 }).toFile(join(saida, "folha.jpg"));
// ausência de dado: nenhum cartão
console.log("sem nota →", await gerarCartao("nota", { ...base, nota: null }));
console.log("1 requisito →", await gerarCartao("requisitos", { requisitos: [{ rotulo: "Memória", minimo: "8 GB" }] }));
console.log("saída:", saida);
