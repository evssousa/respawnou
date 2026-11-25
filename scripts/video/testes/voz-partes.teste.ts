// Teste: a voz por partes é juntada num mp3 só, com a pausa entre as partes, e o alinhamento do conjunto bate com o áudio.
// Rodar da raiz: npx tsx --tsconfig tsconfig.json scripts/video/testes/voz-partes.teste.ts   (termina com "ok")
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { alinhamentoFalso } from "../elevenlabs";
import { caminhoFfmpeg, juntarVozes, type ParteVoz } from "~/video/gerador.server";
import { lerDuracao } from "../videoclip";

const mp3 = await readFile(resolve("scripts/video/fixtures/voz2s.mp3"));
const falados = ["Primeira parte.", "Segunda parte da fala.", "Terceira."];
const partes: ParteVoz[] = falados.map((f, i) => ({ falado: f, mp3, alinhamento: alinhamentoFalso(f), dur: 2, chave: `k${i}`, deCache: false }));
const dir = await mkdtemp(join(tmpdir(), "voz-partes-"));
const ff = await caminhoFfmpeg();
const alin = await juntarVozes(partes, dir, ff);
// alinhamento: caracteres das partes separados por 1 espaço, tempos deslocados por (duração + pausa)
assert.equal(alin.characters.join(""), falados.join(" "));
const inicioTerceira = alin.character_start_times_seconds[alin.characters.length - falados[2].length];
assert.ok(Math.abs(inicioTerceira - (2 + 0.12 + 2 + 0.12)) < 0.01, `3ª parte deveria começar em ~4,24 s e começa em ${inicioTerceira}`);
const info = spawnSync(ff, ["-hide_banner", "-i", join(dir, "voz.mp3")], { encoding: "utf8" }).stderr;
const dur = lerDuracao(info);
assert.ok(Math.abs(dur - (6 + 0.24)) < 0.15, `duração do mp3 junto: ${dur}`);
console.log("ok");
