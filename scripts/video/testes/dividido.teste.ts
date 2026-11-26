// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Teste puro da tela dividida: npx tsx --tsconfig tsconfig.json scripts/video/testes/dividido.teste.ts
import assert from "node:assert";
import { comandoCorteTopo, filtroPassada1Dividida, gruposBaixo, quadrosDosCortes } from "../dividido";
import { layoutDoRoteiro } from "../../../app/video/layout";

// quadros sem deriva: 25 cortes com tempos quebrados
const cortes = Array.from({ length: 25 }, (_, k) => ({ ini: k * 1.733 + (k ? 0.011 : 0) }));
const fim = 25 * 1.733 + 0.175;
const q = quadrosDosCortes(cortes, fim);
assert.equal(q.reduce((a, b) => a + b, 0), Math.round(fim * 30), "soma = round(fim*30)");
assert.ok(q.every((x) => x >= 1), "nenhum corte com menos de 1 quadro");
// cortes colados (mesmo quadro) continuam com 1 quadro cada
const q2 = quadrosDosCortes([{ ini: 0 }, { ini: 0.001 }, { ini: 0.002 }, { ini: 3 }], 5);
assert.equal(q2.reduce((a, b) => a + b, 0), 150);
assert.ok(q2.every((x) => x >= 1));

// grupos de baixo: [3,3,5,5,3] → 3 grupos
const g = gruposBaixo([3, 3, 5, 5, 3].map((baixo, i) => ({ ini: 0.5 + i * 2, fim: 0.5 + (i + 1) * 2, baixo })));
assert.equal(g.length, 3);
assert.deepEqual(g.map((x) => x.img), [3, 5, 3]);
assert.equal(g[0].ini, 0, "1º grupo começa em 0");
assert.ok(g[1].ini > g[0].ini && g[2].ini > g[1].ini, "inícios crescentes");
assert.ok(Math.abs(g[0].dur - g[1].ini) < 1e-9, "grupo termina onde o próximo começa");

// filtro da passada 1
const fech = { arquivo: "fechamento.png", ini: 20, dur: 3 };
const um = filtroPassada1Dividida({ topo: "topo.mp4", fimCenas: 20.175, baixo: [{ img: "baixo0.jpg", ini: 0, dur: 20 }], fechamento: fech });
assert.ok(um.includes("[b0]null[bot]"));
assert.ok(!um.split("vstack")[0].includes("xfade=transition=fade:duration=0.350:offset"), "1 grupo: sem xfade antes do vstack");
const tres = filtroPassada1Dividida({ topo: "topo.mp4", fimCenas: 20.175, baixo: g.map((x) => ({ img: `baixo${x.img}.jpg`, ini: x.ini, dur: x.dur })), fechamento: fech });
assert.equal((tres.split("vstack")[0].match(/xfade=/g) ?? []).length, 2, "3 grupos: 2 xfade antes do vstack");
assert.ok(tres.includes("[cenas][cf]xfade"));

// comando do corte de cima
const w = comandoCorteTopo({ arquivo: "v.mp4", ss: 3, quadros: 90, enquadramento: "west", saida: "t.mp4", leve: true }).join(" ");
assert.ok(w.includes("crop=1080:960:0:"), "west recorta pela esquerda");
assert.ok(w.includes("-frames:v 90"));
assert.ok(!w.includes("-c:a"), "sem áudio");
const inteira = comandoCorteTopo({ arquivo: "v.mp4", ss: 0, quadros: 30, enquadramento: "inteira", saida: "t.mp4", leve: false }).join(" ");
assert.ok(inteira.includes("boxblur"));

// formato da tela
const imgs = [{ src: "/a.jpg" }, { src: "/media/v.mp4" }, { src: "/b.jpg" }];
assert.deepEqual(layoutDoRoteiro({ layout: "dividido" }, imgs), { modo: "dividido", topo: 1 });
assert.deepEqual(layoutDoRoteiro({ layout: "dividido", topo: 2 }, imgs), { modo: "dividido", topo: 1 }, "topo que não é vídeo cai no 1º vídeo");
assert.deepEqual(layoutDoRoteiro({}, imgs), { modo: "cheio", topo: -1 }, "sem layout = tela cheia");
assert.deepEqual(layoutDoRoteiro({ layout: "dividido" }, [{ src: "/a.jpg" }]), { modo: "cheio", topo: -1 }, "sem vídeo = tela cheia");
console.log("ok");
