// Onde entram os anúncios "no meio" do texto de uma matéria (docs/anuncios.md, AN7). Funções puras.
import type { Block } from "./types";

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
const isAlso = (b: Block) => b.type === "p" && /^Leia também:/i.test(b.text);
/** Parágrafo comum de texto (não é o "Leia também"). */
const isPlainP = (b: Block | undefined): b is Extract<Block, { type: "p" }> => Boolean(b) && b!.type === "p" && !isAlso(b!);

/** Palavras do corpo: parágrafos, listas e citações (sem "Leia também"). */
export function bodyWords(body: Block[]): number {
  let n = 0;
  for (const b of body) {
    if (b.type === "p" && !isAlso(b)) n += words(b.text);
    else if (b.type === "ul") n += b.items.reduce((s, i) => s + words(i), 0);
    else if (b.type === "quote") n += words(b.text);
  }
  return n;
}

/**
 * Índices de bloco DEPOIS dos quais entra um anúncio "no meio" (0, 1 ou 2 índices).
 * Entra sempre entre dois blocos de texto, nunca perto de imagem, vídeo, lista ou "Leia também".
 */
export function inArticleSlots(body: Block[], section: string): number[] {
  if (section === "promocoes") return [];
  const total = bodyWords(body);
  if (total < 350) return [];

  /** Primeira fronteira boa a partir de `from`: bloco atual é parágrafo comum, o seguinte é parágrafo comum ou h2. */
  const boundary = (from: number, minWordsBefore: number) => {
    let seen = 0;
    for (let i = 0; i < body.length; i++) {
      const b = body[i];
      if (b.type === "p" && !isAlso(b)) seen += words(b.text);
      else if (b.type === "ul") seen += b.items.reduce((s, x) => s + words(x), 0);
      else if (b.type === "quote") seen += words(b.text);
      if (i < from || seen < minWordsBefore) continue;
      const next = body[i + 1];
      if (isPlainP(b) && (isPlainP(next) || next?.type === "h2") && body.length - i - 1 >= 3) return i;
    }
    return -1;
  };

  // 1º: depois do 3º parágrafo comum, com pelo menos 150 palavras antes.
  let third = -1;
  let count = 0;
  for (let i = 0; i < body.length; i++) {
    if (isPlainP(body[i]) && ++count === 3) {
      third = i;
      break;
    }
  }
  if (third < 0) return [];
  const first = boundary(third, 150);
  if (first < 0) return [];
  const out = [first];

  // 2º: só em texto longo (900+ palavras), a partir de 6 blocos depois do 1º.
  if (total >= 900) {
    const second = boundary(first + 6, 150);
    if (second > first) out.push(second);
  }
  return out;
}
