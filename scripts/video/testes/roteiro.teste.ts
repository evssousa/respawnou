// Teste do roteiro v2 (validação, compatibilidade com o formato antigo, ida e volta do formulário e reforço de cartões).
// Rodar da raiz: npx tsx --tsconfig tsconfig.json scripts/video/testes/roteiro.teste.ts
import assert from "node:assert";
import { cartoesDisponiveis, type FatosVideo } from "~/video/cartoes";
import { reforcarCartoes, validarRoteiro } from "~/video/roteiro.server";

const fala = (n: number, extra = "") => `${Array.from({ length: n }, (_, i) => `p${i}`).join(" ")} ${extra}`.trim();
const fatos: FatosVideo = { jogo: "Zelda", preco: "R$ 249,90", lancamento: { data: "28/11" }, plataformas: ["PC"], nota: { valor: 8.7, veiculos: 5 } };

assert.deepEqual(cartoesDisponiveis(fatos).sort(), ["lancamento", "nota", "plataformas", "preco"]);
assert.deepEqual(cartoesDisponiveis({ preco: "grátis" }), []);
assert.deepEqual(cartoesDisponiveis(fatos, "top5").includes("ranking"), false);

// 1) formato antigo continua válido e não ganha campos novos
const antigo = { gancho: "Olha só", titulo_curto: "TESTE", cenas: [1, 2, 3, 4].map((i) => ({ fala: fala(20), imagem: i % 2 })) };
const v1 = validarRoteiro(antigo, 2, "noticias");
assert.ok(v1.ok, v1.ok ? "" : v1.erro);
assert.equal(v1.ok && v1.roteiro.v, undefined);

// 2) formato novo
const novo = {
  ganchos: ["Zelda chega em 28/11", "Muda tudo para quem joga", "Curiosidade: o preço", "Quarto gancho que sobra"],
  pergunta: "Você pagaria R$ 249,90 nele?",
  destaques: ["Zelda", "inexistente", "zelda"],
  titulo_curto: "ZELDA",
  cenas: [
    { fala: fala(20, "Zelda chega por R$ 249,90"), imagem: 0, cartao: "preco" },
    { fala: fala(20, "e a nota é 8,7"), imagem: 1, cartao: "nota" },
    { fala: fala(20), imagem: 0, cartao: "preco" }, // repetido → some
    { fala: fala(20), imagem: 1, cartao: "requisitos" }, // indisponível → some
  ],
};
const v2 = validarRoteiro(novo, 2, "noticias", fatos);
assert.ok(v2.ok, v2.ok ? "" : v2.erro);
if (v2.ok) {
  const r = v2.roteiro;
  assert.equal(r.v, 2);
  assert.equal(r.gancho, "Zelda chega em 28/11", "sem gancho escolhido, vale o 1º");
  assert.equal(r.ganchos?.length, 3, "no máximo 3 opções");
  assert.equal(r.pergunta, "Você pagaria R$ 249,90 nele?");
  assert.equal(r.usarPergunta, true);
  assert.deepEqual(r.destaques, ["Zelda"], "só termos que aparecem nas falas, sem repetir");
  assert.deepEqual(r.cenas.map((c) => c.cartao ?? null), ["preco", "nota", null, null]);

  // 3) ida e volta do formulário: salvar sem mexer não perde nada
  const volta = validarRoteiro({ ...r, usarPergunta: true }, 2, "noticias", fatos);
  assert.ok(volta.ok);
  assert.deepEqual(volta.ok && volta.roteiro, r, "nenhum campo some ao salvar");
  // gancho editado à mão vale, mesmo fora da lista
  const ed = validarRoteiro({ ...r, gancho: "Gancho do dono" }, 2, "noticias", fatos);
  assert.equal(ed.ok && ed.roteiro.gancho, "Gancho do dono");
  // pergunta inválida vira nula sem falhar
  const pg = validarRoteiro({ ...r, pergunta: "x".repeat(100) }, 2, "noticias", fatos);
  assert.ok(pg.ok);
  assert.equal(pg.ok && pg.roteiro.pergunta, null);
  assert.equal(pg.ok && pg.roteiro.usarPergunta, false);
}

// 4) reforço automático: nota disponível, ninguém usou, a cena 2 cita "8,7"
const sem = validarRoteiro({ ...novo, cenas: novo.cenas.map((c) => ({ ...c, cartao: "" })) }, 2, "noticias", fatos);
assert.ok(sem.ok);
if (sem.ok) {
  const r = reforcarCartoes(sem.roteiro, fatos);
  assert.equal(r.cenas[1].cartao, "nota");
  assert.equal(r.cenas[0].cartao ?? null, null, "a 1ª cena não recebe reforço");
}
console.log("ok");
