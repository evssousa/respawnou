// Utilitários de texto do robô (sem dependências, testáveis com `node`).

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  eacute: "é",
  copy: "©",
  reg: "®",
  trade: "™",
};

export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

export const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/**
 * Extrai o texto principal de uma página de matéria: parágrafos dentro de <article>
 * (ou da página toda), sem menus, rodapés, scripts e legendas.
 */
export function extractArticleText(html: string, maxChars = 12000) {
  let doc = html
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|figure|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const article = doc.match(/<article\b[\s\S]*?<\/article>/i);
  if (article && article[0].length > 2000) doc = article[0];
  const paragraphs: string[] = [];
  for (const m of doc.matchAll(/<(p|h2|h3|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = stripTags(m[2]);
    const tag = m[1].toLowerCase();
    if (tag === "p" ? text.length >= 60 : text.length >= 15 && text.length <= 200) {
      paragraphs.push(tag === "p" ? text : `## ${text}`);
    }
  }
  // Remove repetições (blocos de "leia também" costumam se repetir).
  const unique = [...new Set(paragraphs)];
  let out = "";
  for (const p of unique) {
    if (out.length + p.length > maxChars) break;
    out += `${p}\n\n`;
  }
  return out.trim();
}

export function slugify(s: string, max = 90) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+[^-]*$/, (m) => (m.length < 4 ? "" : m)) // evita cortar no meio de uma palavra curta
    .replace(/-+$/g, "");
}

export const countWords = (s: string) => (s.match(/[\p{L}\p{N}]+/gu) ?? []).length;

/** Palavras "significativas" de um título, para comparar assuntos. */
export function keywords(title: string) {
  return new Set(
    title
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 || /\d/.test(w)),
  );
}

/** Semelhança entre dois conjuntos de palavras (0 a 1). */
export function similarity(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / Math.min(a.size, b.size);
}

/**
 * Números que aparecem num texto, só com dígitos ("US$ 69,99" e "$69.99" viram "6999").
 * Ignora números de um dígito, comuns demais para checar.
 */
export function numbersIn(s: string) {
  const out = new Set<string>();
  for (const m of s.matchAll(/(?<![\p{L}\d])\d[\d.,]*(?![\p{L}\d])/gu)) {
    const digits = m[0].replace(/[.,]+$/, "").replace(/\D/g, "");
    if (digits.length >= 2) out.add(digits.replace(/^0+(?=\d)/, ""));
  }
  return out;
}
