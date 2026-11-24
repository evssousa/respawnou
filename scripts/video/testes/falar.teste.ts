// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Teste puro da conversão tela → fala: npx tsx scripts/video/testes/falar.teste.ts
import assert from "node:assert";
import { palavrasDoAlinhamento } from "../ass";
import { alinhamentoFalso } from "../elevenlabs";
import { extenso, montarFala, paraFala, remapear, semTags } from "../falar";

const f = (t: string, dic: { de: string; para: string }[] = []) => paraFala(t, dic).falado;
const NB = " ";
const PAUSA = '<break time="0.25s" />';

// extenso
assert.equal(extenso(0), "zero");
assert.equal(extenso(21), "vinte e um");
assert.equal(extenso(100), "cem");
assert.equal(extenso(101), "cento e um");
assert.equal(extenso(249), "duzentos e quarenta e nove");
assert.equal(extenso(1000), "mil");
assert.equal(extenso(1100), "mil e cem");
assert.equal(extenso(1299), "mil duzentos e noventa e nove");
assert.equal(extenso(2026), "dois mil e vinte e seis");
assert.equal(extenso(21000), "vinte e um mil");

// preço
assert.equal(f("R$ 249,90"), "duzentos e quarenta e nove reais e noventa centavos");
assert.equal(f("R$249,90"), "duzentos e quarenta e nove reais e noventa centavos");
assert.equal(f(`R$${NB}0,99`), "zero reais e noventa e nove centavos");
assert.equal(f("R$ 1.299"), "mil duzentos e noventa e nove reais");
assert.equal(f("R$ 1.000"), "mil reais");
assert.equal(f("R$ 1,00"), "um real");
assert.equal(f("US$ 59,99"), "cinquenta e nove dólares e noventa e nove centavos");
assert.equal(f("custa R$ 89,90."), "custa oitenta e nove reais e noventa centavos.");
assert.deepEqual(paraFala("custa R$ 89,90 hoje").tela, ["custa", `R$${NB}89,90`, "hoje"]);

// porcentagem, data, hora, decimal, ranking, ordinal, placas
assert.equal(f("100%"), "cem por cento");
assert.equal(f("30%"), "trinta por cento");
assert.equal(f("28/11"), "vinte e oito de novembro");
assert.equal(f("1/12"), "primeiro de dezembro");
assert.equal(f("31/12/2027"), "trinta e um de dezembro de dois mil e vinte e sete");
assert.equal(f("32/13"), "32/13");
assert.equal(f("13h"), "treze horas");
assert.equal(f("1h"), "uma hora");
assert.equal(f("13h30"), "treze e trinta");
assert.equal(f("nota 8,7"), "nota oito vírgula sete");
assert.equal(f("#5"), "número cinco");
assert.equal(f("1º"), "primeiro");
assert.equal(f("2ª"), "segunda");
assert.equal(f("RTX 4060"), "RTX quarenta sessenta");
assert.equal(f("um i5 novo"), "um i cinco novo");
assert.equal(f("em 2026,"), "em dois mil e vinte e seis,");

// dicionário
const dic = [
  { de: "GTA", para: "gê tê á" },
  { de: "Game Pass", para: "Game Pass" },
  { de: "PS5", para: "pê ésse cinco" },
];
assert.equal(f("GTA 6 chega", dic), "gê tê á seis chega");
assert.equal(f("no PS5, hoje", dic), "no pê ésse cinco, hoje");
assert.equal(f("gta, sim", dic), "gê tê á, sim");
const gp = paraFala("no Game Pass hoje", dic);
assert.deepEqual(gp.tela, ["no", `Game${NB}Pass`, "hoje"]);
assert.deepEqual(gp.mapa, [1, 2, 1]);
assert.equal(f("Zelda", dic), "Zelda");

// montagem com pontuação e pausas
const m = montarFala(["Olha só!", "O jogo sai em 28/11 por R$ 249,90.", "Qual você prefere?"], [], 0.25);
assert.equal(m.falado, `Olha só! O jogo sai em ${PAUSA} vinte e oito de novembro por duzentos e quarenta e nove reais e noventa centavos. Qual você prefere?`);
assert.equal(m.pausas, 1);
assert.equal(montarFala(["O jogo sai em 28/11."], [], 0).falado, "O jogo sai em vinte e oito de novembro.");
assert.equal(montarFala(Array.from({ length: 8 }, () => "sai em 28/11"), [], 0.25).pausas, 4);

// semTags e ida e volta
assert.deepEqual(
  semTags([{ texto: "a" }, { texto: "<break" }, { texto: 'time="0.25s"' }, { texto: "/>" }, { texto: "b" }]).map((x) => x.texto),
  ["a", "b"],
);
const mm = montarFala(["Chega em 28/11 por R$ 249,90.", "Nota 8,7 no GTA?"], dic, 0.25);
const faladas = semTags(palavrasDoAlinhamento(alinhamentoFalso(mm.falado)));
const tela = mm.partes.flatMap((p) => p.tela);
const volta = remapear(faladas, mm.mapa, tela);
assert.ok(volta, "o mapa tem que bater com as palavras faladas");
assert.deepEqual(volta.map((x) => x.texto), ["Chega", "em", "28/11", "por", `R$${NB}249,90`, "Nota", "8,7", "no", "GTA?"]);
for (let i = 1; i < volta.length; i++) assert.ok(volta[i].ini >= volta[i - 1].ini, "tempos crescentes");
assert.equal(remapear(faladas.slice(1), mm.mapa, tela), null, "contas que não batem → null");
console.log("ok");
