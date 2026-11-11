// Corpo da matéria como texto simples (estilo Markdown) para o editor do painel, e de volta para blocos.
//
//   Parágrafos separados por linha em branco. Links: [texto](url)
//   ## Intertítulo          ### Subtítulo
//   - item de lista          > citação
//   ![texto alternativo](/media/...webp "Imagem: reprodução/IGN")
//   @video(abcdefghijk) Título do vídeo
import type { Block } from "../types.ts";

export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "p":
          return b.text;
        case "h2":
          return `## ${b.text}`;
        case "h3":
          return `### ${b.text}`;
        case "quote":
          return `> ${b.text}`;
        case "ul":
          return b.items.map((i) => `- ${i}`).join("\n");
        case "img": {
          const size = b.width && b.height ? ` =${b.width}x${b.height}` : "";
          return `![${b.alt}](${b.src}${b.credit ? ` "${b.credit.replace(/"/g, "'")}"` : ""})${size}`;
        }
        case "video":
          return `@video(${b.youtubeId}) ${b.title}`;
      }
    })
    .join("\n\n");
}

const IMG = /^!\[([^\]]*)\]\((\S+)(?:\s+"([^"]*)")?\)(?:\s*=(\d+)x(\d+))?$/;
const VIDEO = /^@video\(([A-Za-z0-9_-]{11})\)\s*(.*)$/;

export function textToBlocks(text: string): Block[] {
  const out: Block[] = [];
  const chunks = text.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trim());
    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      out.push({ type: "ul", items: lines.map((l) => l.replace(/^[-*]\s+/, "")) });
      continue;
    }
    const one = lines.join(" ");
    let m: RegExpMatchArray | null;
    if (one.startsWith("### ")) out.push({ type: "h3", text: one.slice(4).trim() });
    else if (one.startsWith("## ")) out.push({ type: "h2", text: one.slice(3).trim() });
    else if (one.startsWith("> ")) out.push({ type: "quote", text: one.replace(/^>\s*/, "").replace(/\s+>\s+/g, " ") });
    else if ((m = one.match(IMG)))
      out.push({
        type: "img",
        alt: m[1],
        src: m[2],
        ...(m[3] ? { credit: m[3] } : {}),
        ...(m[4] ? { width: Number(m[4]), height: Number(m[5]) } : {}),
      });
    else if ((m = one.match(VIDEO))) out.push({ type: "video", youtubeId: m[1], title: m[2] || "Vídeo" });
    else out.push({ type: "p", text: one });
  }
  return out;
}
