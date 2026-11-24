// Teste puro da legenda: npx tsx scripts/video/testes/ass.teste.ts
import assert from "node:assert";
import { corAss, gerarAss } from "../ass";

assert.equal(corAss("#c8ff2e"), "&H002EFFC8&");
assert.equal(corAss("#eef3ea"), "&H00EAF3EE&");
const ass = gerarAss([{ texto: "Olá", ini: 0, fim: 0.5 }, { texto: "mundo", ini: 0.5, fim: 1 }]);
assert.ok(ass.includes("Style: Pal,Anton,92,&H00EAF3EE,&H00EAF3EE,&H00070806,"), "estilo da legenda igual ao de antes");
assert.ok(ass.includes("\c&H002EFFC8&"), "palavra atual em verde-limão");
console.log("ok");
