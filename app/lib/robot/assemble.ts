// Monta o corpo final da matéria a partir do texto do Gemini + mídia (sem rede).
// Regras do Anime Profile (worker/html.ts e enrichArticleMedia), adaptadas:
// - vídeo do YouTube logo depois do lide;
// - uma imagem abaixo de cada h2, sem repetir a capa;
// - pelo menos 1 link interno (se o Gemini não pôs, a 1ª menção de plataforma vira link);
// - "Leia também" no meio do texto, para outra matéria relacionada.
import type { Block } from "../types.ts";
import { linksIn, type DraftBlock } from "./quality.ts";

export interface BodyImage {
  src: string;
  width?: number;
  height?: number;
  credit?: string;
}

export interface AssembleInput {
  draft: DraftBlock[];
  focusKeyword: string;
  images: BodyImage[];
  video?: { youtubeId: string; title: string };
  related: { title: string; url: string }[];
  platforms: string[];
}

const PLATFORM_MENTIONS: [string, RegExp][] = [
  ["playstation", /\b(PlayStation 5|PlayStation 4|PlayStation|PS5|PS4)\b/],
  ["xbox", /\b(Xbox Series X\|S|Xbox Series X|Xbox Series S|Xbox One|Xbox)\b/],
  ["switch", /\b(Nintendo Switch 2|Nintendo Switch|Switch 2)\b/],
  ["pc", /\b(PC)\b(?! Gamer)/],
  ["mobile", /\b(iOS|Android)\b/],
];

const LINK = /\[[^\]\n]+\]\([^)\s]+\)/g;

/** Aplica `fn` só nos trechos do texto que estão fora de links. */
function outsideLinks(text: string, fn: (chunk: string) => string | null): string | null {
  const parts = text.split(/(\[[^\]\n]+\]\([^)\s]+\))/g);
  for (let i = 0; i < parts.length; i += 2) {
    const r = fn(parts[i]);
    if (r !== null) {
      parts[i] = r;
      return parts.join("");
    }
  }
  return null;
}

export function assembleBody(o: AssembleInput): Block[] {
  const out: Block[] = o.draft.map((b) => {
    if (b.type === "ul") return { type: "ul", items: (b.items ?? []).map((i) => i.trim()) };
    return { type: b.type, text: (b.text ?? "").trim() } as Block;
  });

  // Link interno garantido.
  const hasInternal = out.some((b) => (b.type === "p" || b.type === "ul") && linksIn(b.type === "p" ? b.text : b.items.join(" ")).some((l) => l.url.startsWith("/")));
  if (!hasInternal) {
    outer: for (const [slug, re] of PLATFORM_MENTIONS) {
      if (!o.platforms.includes(slug)) continue;
      for (const b of out) {
        if (b.type !== "p") continue;
        const next = outsideLinks(b.text, (chunk) => {
          const m = chunk.match(re);
          return m ? chunk.replace(re, `[${m[0]}](/plataforma/${slug})`) : null;
        });
        if (next) {
          b.text = next;
          break outer;
        }
      }
    }
  }

  // "Leia também" depois do 3º parágrafo, com uma matéria ainda não linkada no texto.
  const linked = new Set(out.flatMap((b) => (b.type === "p" ? linksIn(b.text).map((l) => l.url) : [])));
  const extra = o.related.find((r) => !linked.has(r.url));
  if (extra) {
    let count = 0;
    const at = out.findIndex((b) => b.type === "p" && ++count === 3);
    if (at > 0) out.splice(at + 1, 0, { type: "p", text: `Leia também: [${extra.title}](${extra.url})` });
  }

  // Imagens abaixo de cada h2 (alt descreve a seção, em português).
  const images = [...o.images];
  for (let i = 0; i < out.length && images.length; i++) {
    const b = out[i];
    if (b.type !== "h2") continue;
    const img = images.shift()!;
    out.splice(i + 1, 0, { type: "img", src: img.src, alt: `${o.focusKeyword}: ${b.text}`.slice(0, 250), width: img.width, height: img.height, credit: img.credit });
    i++;
  }

  // Vídeo logo depois do lide.
  if (o.video) {
    const lead = out.findIndex((b) => b.type === "p");
    out.splice(lead + 1, 0, { type: "video", youtubeId: o.video.youtubeId, title: o.video.title });
  }
  return out;
}

/** Remove a marcação de link (para contar palavras e conferir números). */
export const stripLinks = (s: string) => s.replace(LINK, (m) => m.slice(1, m.indexOf("](")));
