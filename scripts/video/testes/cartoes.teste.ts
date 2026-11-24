// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Teste puro do plano de tempo dos cartões: npx tsx --tsconfig tsconfig.json scripts/video/testes/cartoes.teste.ts
import assert from "node:assert";
import { planoCartoes, termosDeDestaque, type FatosVideo } from "~/video/cartoes";

const fatos: FatosVideo = { preco: "R$ 249,90", nota: { valor: 8.7, veiculos: 5 }, lancamento: { data: "28/11" }, gratis: [{ nome: "Hades", loja: "Epic", ate: "QUI" }], jogo: "Zelda" };
const w = (texto: string, ini: number) => ({ texto, ini });
const cenas = [
  { ini: 0, fim: 6, palavras: [w("Zelda", 0.5), w("chega", 1)] },
  { ini: 6, fim: 12, palavras: [w("Sai", 6.1), w("por", 6.6), w("R$\u00a0249,90", 7.2), w("hoje", 8)] },
  { ini: 12, fim: 14, palavras: [w("nota", 12.1), w("8,7", 12.5)] }, // curta: cartão não cabe
  { ini: 14, fim: 22, palavras: [w("nota", 14.1), w("8,7", 15)] },
  { ini: 22, fim: 30, palavras: [w("em", 22.1), w("28/11", 23)] },
  { ini: 30, fim: 38, palavras: [w("grátis", 30.2)] },
];
const roteiro = { cenas: [{}, { cartao: "preco" as const }, { cartao: "nota" as const }, { cartao: "nota" as const }, { cartao: "lancamento" as const }, { cartao: "gratis" as const, item: 0 }] };
const p = planoCartoes(cenas, roteiro, fatos, 3);

assert.deepEqual(p.map((x) => x.tipo), ["preco", "nota", "lancamento", "gratis"], "o cartão da cena curta (12–14 s) é descartado");
assert.equal(p[0].ini, 7.05, "entra 0,15 s antes da palavra do preço");
assert.equal(p[0].fim, 11.55, "sai 4,5 s depois (cabe na cena)");
assert.equal(p[1].ini, 14.85, "nota: antes de '8,7'");
assert.equal(p[2].ini, 22.85);
assert.equal(p[3].ini, 30.35, "sem palavra do dado: 0,35 s depois do início da cena");
assert.equal(p[3].item, 0);
for (let i = 1; i < p.length; i++) assert.ok(p[i].ini >= p[i - 1].fim + 0.3 - 1e-9, "um por vez, com folga");
assert.ok(p.every((x) => x.ini >= 3.25), "nunca antes do fim da abertura");
assert.ok(p.every((x) => x.fim - x.ini >= 1.6));

// a primeira cena começa logo depois da abertura
const cedo = planoCartoes([{ ini: 0, fim: 8, palavras: [] }], { cenas: [{ cartao: "preco" }] }, fatos, 3);
assert.equal(cedo[0].ini, 3.25);

assert.deepEqual(termosDeDestaque({ destaques: ["Zelda", "zelda", "Link"] }, fatos), ["Zelda", "Link", "Hades"]);
console.log("ok");
