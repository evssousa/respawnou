// Teste dos efeitos sonoros: npx tsx --tsconfig tsconfig.json scripts/video/testes/efeitos.teste.ts
import assert from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { comandoEfeitos, filtrarEventos, somDoCartao } from "../efeitos";
import { caminhoFfmpeg } from "~/video/gerador.server";

assert.equal(somDoCartao("preco"), "ding");
assert.equal(somDoCartao("gratis"), "ding");
assert.equal(somDoCartao("nota"), "impacto");
assert.equal(somDoCartao("plataformas"), "pop");
const ev = filtrarEventos([{ t: 8, tipo: "pop" }, { t: 2, tipo: "ding" }, { t: 5, tipo: "impacto" }, { t: 5.5, tipo: "pop" }]);
assert.deepEqual(ev.map((e) => e.t), [2, 5, 8], "o efeito a menos de 1,5 s do anterior é descartado");

const dir = mkdtempSync(join(tmpdir(), "efeitos-"));
const ff = await caminhoFfmpeg();
const saida = join(dir, "efeitos.wav");
const r = spawnSync(ff, comandoEfeitos(ev, 10, saida, true), { encoding: "utf8" });
assert.equal(r.status, 0, r.stderr);
assert.ok(existsSync(saida));
const info = spawnSync(ff, ["-hide_banner", "-i", saida, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" }).stderr;
assert.match(info, /Duration: 00:00:10/, "dura o vídeo todo");
const max = Number(/max_volume: (-?[\d.]+) dB/.exec(info)?.[1]);
assert.ok(max <= 0 && max > -20, `pico em ${max} dB: audível e sem estouro`);
console.log("ok (pico", max, "dB)");
