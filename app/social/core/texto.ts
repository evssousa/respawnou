// Funções puras de texto para legenda e arte. Genéricas: copiam igual para os outros sites.

/** "[texto](url)" vira "texto"; tira espaços duplos. */
export function limparLinks(t: string): string {
  return t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
}

/** Corta na palavra, com reticências, até `max` caracteres. */
export function cortar(t: string, max: number): string {
  const s = t.trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

/** Quebra em frases (termina em . ! ?). */
export function frases(t: string): string[] {
  return (limparLinks(t).match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? []).map((f) => f.trim()).filter(Boolean);
}

/** Frases inteiras juntas até `max` caracteres (nunca corta no meio de uma frase; se a 1ª já passa, corta na palavra). */
export function frasesInteiras(t: string, max: number): string {
  const fs = frases(t);
  let out = "";
  for (const f of fs) {
    const next = out ? `${out} ${f}` : f;
    if (next.length > max) break;
    out = next;
  }
  if (out) return out;
  const f = fs[0] ?? t;
  const cut = f.slice(0, max);
  const p = Math.max(cut.lastIndexOf(","), cut.lastIndexOf(";"));
  // Frase longa demais: fecha numa vírgula/ponto e vírgula (texto completo, sem reticências) se der; senão corta na palavra.
  return p > max * 0.6 ? `${cut.slice(0, p)}.` : cortar(f, max);
}

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** "Grand Theft Auto VI" → "GrandTheftAutoVI"; sem acento, só letras e números. */
export function paraHashtag(t: string): string {
  return semAcento(t)
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
}

/** Maiúsculas em português (mantém acentos). */
export const maiusculasBR = (t: string) => t.toLocaleUpperCase("pt-BR");

/** Comparação sem acento e sem caixa. */
export const igual = (a: string, b: string) => semAcento(a).toLowerCase() === semAcento(b).toLowerCase();

/** Proporção de palavras de `a` que aparecem em `b` (0 a 1), para detectar excerpt que repete o título. */
export function sobreposicao(a: string, b: string): number {
  const w = (s: string) => new Set(semAcento(s).toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2));
  const A = w(a);
  const B = w(b);
  if (!A.size) return 0;
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return n / A.size;
}
