// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Teste puro da legenda: npx tsx scripts/video/testes/ass.teste.ts
import assert from "node:assert";
import { classificar, corAss, gerarAss, paginas } from "../ass";

assert.equal(corAss("#c8ff2e"), "&H002EFFC8&");
assert.equal(corAss("#eef3ea"), "&H00EAF3EE&");
const simples = gerarAss([{ texto: "Olá", ini: 0, fim: 0.5 }, { texto: "mundo", ini: 0.5, fim: 1 }]);
assert.ok(simples.includes("Style: Pal,Anton,92,&H00EAF3EE,&H00EAF3EE,&H00070806,"), "estilo da legenda igual ao de antes");
assert.ok(simples.includes("\\c&H002EFFC8&"), "palavra atual em verde-limão");
assert.ok(/Style: Pal,.*,1,6,0,2,64,164,480,1/.test(simples), "tela cheia: legenda embaixo como antes");
// tela dividida: legenda centrada na divisa, crédito no alto à esquerda
const meio = gerarAss([{ texto: "Olá", ini: 0, fim: 0.5 }], { posicao: "meio", creditos: [{ ini: 0, fim: 1, texto: "Vídeo: X" }] });
assert.ok(/Style: Pal,Anton,96,.*,1,7,0,5,64,64,0,1/.test(meio), "meio: alinhamento 5, 96 px, margens iguais (centrada)");
assert.ok(/Style: Cred,.*,1,3,0,7,64,48,312,1/.test(meio), "meio: crédito no alto à esquerda");
assert.ok(meio.includes("\\bord9") || meio.includes("\\bord7"), "meio: contorno mais grosso");
assert.ok(!meio.includes("\\bord6"));

// classificação: "O novo GTA 6 chega em 26/05 por R$ 349,90 no PS5" com o termo "GTA 6"
const NB = " ";
const frase = ["O", "novo", "GTA", "6", "chega", "em", "26/05", "por", `R$${NB}349,90`, "no", "PS5"];
const palavras = frase.map((texto, i) => ({ texto, ini: i * 0.4, fim: i * 0.4 + 0.35 }));
const cls = classificar(palavras, ["GTA 6"]);
const classeDe = (t: string) => cls[frase.indexOf(t)].classe;
assert.equal(classeDe("GTA"), "nome");
assert.equal(classeDe("6"), "nome", "o número que faz parte do nome fica verde, não âmbar");
assert.equal(classeDe("26/05"), "numero");
assert.equal(classeDe(`R$${NB}349,90`), "numero");
assert.equal(classeDe("PS5"), "numero", "letra+dígito conta como número");
assert.equal(classeDe("novo"), "comum");
assert.equal(classificar([{ texto: "GRÁTIS" }])[0].classe, "numero");
assert.equal(classificar([{ texto: "gta," }, { texto: "seis" }], ["GTA"])[0].classe, "nome", "casa sem pontuação e sem diferenciar maiúsculas");

// páginas: o número abre página nova quando a atual já tem 2+ palavras; o nome não é partido
const pags = paginas(palavras, cls);
assert.ok(pags.some((p) => p[0].texto === "26/05"), "26/05 abre uma página");
assert.ok(pags.some((p) => p.map((x) => x.texto).join(" ").includes("GTA 6")), "GTA 6 fica na mesma página");
for (const p of pags) assert.ok(p.map((x) => x.texto).join(" ").length <= 30 || p.length === 1, "página cabe em 30 caracteres");

// ASS completo
const ass = gerarAss(palavras, { termos: ["GTA 6"] });
const eventos = ass.split("\n").filter((l) => l.startsWith("Dialogue"));
assert.ok(eventos.some((e) => e.includes("\\c&H0020B0FF&") && e.includes("26/05")), "26/05 em âmbar");
assert.ok(eventos.some((e) => e.includes("R$\\h349,90")), "preço com espaço duro vira \\h");
assert.ok(eventos.some((e) => /\\c&H002EFFC8&\\bord6\\fscx100\\fscy100\}GTA/.test(e)), "nome em verde");
assert.ok(eventos.some((e) => e.includes("\\bord8\\fscx138")), "número da vez cresce mais e ganha contorno 8");
// sem sobreposição de tempo entre eventos
const tempos = eventos.map((e) => e.split(",").slice(1, 3).map((t) => {
  const [h, m, s] = t.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}));
for (let i = 1; i < tempos.length; i++) assert.ok(tempos[i][0] >= tempos[i - 1][1] - 0.001, "eventos não se sobrepõem");
console.log("ok");
