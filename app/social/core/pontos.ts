// Extração dos pontos do carrossel, sem Gemini (docs/instagram.md). Funções puras.
import type { Block } from "~/lib/types";
import type { Ponto, Requisitos } from "../tipos";
import { cortar, frasesInteiras, limparLinks } from "./texto";

const IGNORAR = /^(mais sobre|leia também|perguntas|como a lista foi feita|fontes?|atualização)/i;

/** Pontos de um artigo: cada h2 vira um ponto (título + 1ª frase do parágrafo seguinte + 1ª imagem do trecho). Até 5. */
export function extrairPontos(blocos: Block[]): Ponto[] {
  const out: Ponto[] = [];
  for (let i = 0; i < blocos.length && out.length < 5; i++) {
    const b = blocos[i];
    if (b.type !== "h2" || IGNORAR.test(b.text.trim())) continue;
    let texto = "";
    let imagem: string | null = null;
    for (let j = i + 1; j < blocos.length && blocos[j].type !== "h2"; j++) {
      const x = blocos[j];
      if (!texto && x.type === "p" && !/^leia também/i.test(x.text)) texto = frasesInteiras(x.text, 220);
      if (!imagem && x.type === "img") imagem = x.src;
    }
    if (!texto) continue;
    out.push({ titulo: cortar(limparLinks(b.text), 70), texto, imagem });
  }
  if (out.length >= 3) return out;
  // Sem h2 bons: itens de lista ("Nome: descrição").
  const lista: Ponto[] = [];
  for (const b of blocos) {
    if (b.type !== "ul") continue;
    for (const item of b.items) {
      if (lista.length >= 5) break;
      const t = limparLinks(item);
      const m = t.match(/^([^:]{3,60}):\s*(.+)$/);
      lista.push(m ? { titulo: cortar(m[1], 70), texto: frasesInteiras(m[2], 220) } : { titulo: `DESTAQUE ${lista.length + 1}`, texto: frasesInteiras(t, 220) });
    }
  }
  return lista.length >= 3 ? lista : out;
}

const ROTULOS: [RegExp, string][] = [
  [/^(so|sistema( operacional)?)$/i, "SO"],
  [/^processador$/i, "PROCESSADOR"],
  [/^mem[oó]ria$/i, "MEMÓRIA"],
  [/^(placa( de v[ií]deo)?|v[ií]deo|gr[aá]ficos?)$/i, "PLACA DE VÍDEO"],
  [/^(armazenamento|espa[cç]o.*)$/i, "ARMAZENAMENTO"],
];

/** "SO: Windows 10; Processador: i5; Memória: 8 GB" → { SO: "Windows 10", ... } */
function lerLinhas(texto: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const parte of (texto ?? "").split(/;\s+|\n/)) {
    const m = parte.match(/^([^:]{2,30}):\s*(.+)$/);
    if (!m) continue;
    const r = ROTULOS.find(([re]) => re.test(m[1].trim()));
    if (r && !out[r[1]]) out[r[1]] = cortar(m[2].trim(), 70);
  }
  return out;
}

/** Requisitos de PC lado a lado. Precisa de PROCESSADOR, MEMÓRIA e PLACA DE VÍDEO nas duas colunas; senão, undefined. */
export function lerRequisitos(pcMin?: string | null, pcRec?: string | null): Requisitos[] | undefined {
  const a = lerLinhas(pcMin);
  const b = lerLinhas(pcRec);
  const obrig = ["PROCESSADOR", "MEMÓRIA", "PLACA DE VÍDEO"];
  if (!obrig.every((k) => a[k] && b[k])) return undefined;
  return ["SO", "PROCESSADOR", "MEMÓRIA", "PLACA DE VÍDEO", "ARMAZENAMENTO"].filter((k) => a[k] || b[k]).map((k) => ({ rotulo: k, minimo: a[k] ?? "—", recomendado: b[k] ?? "—" }));
}

/** Notas dos veículos, da maior para a menor. */
export const ordenarNotas = <T extends { score: number }>(l: T[]) => [...l].sort((x, y) => y.score - x.score);
