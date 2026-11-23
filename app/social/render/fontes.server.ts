// Fontes da arte (satori não lê WOFF2 nem fonte variável): arquivos WOFF estáticos em app/social/fonts, lidos uma vez.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = join(process.cwd(), "app", "social", "fonts");
const ARQUIVOS = [
  { name: "Anton", file: "anton-latin-400-normal.woff", weight: 400 as const },
  { name: "Inter", file: "inter-latin-400-normal.woff", weight: 400 as const },
  { name: "Inter", file: "inter-latin-600-normal.woff", weight: 600 as const },
  { name: "Inter", file: "inter-latin-800-normal.woff", weight: 800 as const },
  { name: "JetBrains Mono", file: "jetbrains-mono-latin-700-normal.woff", weight: 700 as const },
];

export type Fonte = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700 | 800; style: "normal" };
let cache: Promise<Fonte[]> | undefined;

export function fontes(): Promise<Fonte[]> {
  cache ??= Promise.all(
    ARQUIVOS.map(async (f) => {
      try {
        const buf = await readFile(join(DIR, f.file));
        return { name: f.name, data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, weight: f.weight, style: "normal" as const };
      } catch {
        throw new Error(`fonte não encontrada: ${join(DIR, f.file)}`);
      }
    }),
  ).catch((e) => {
    cache = undefined;
    throw e;
  });
  return cache;
}
