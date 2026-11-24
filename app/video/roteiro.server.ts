// Roteiro do vídeo (Gemini grátis, 1 pedido por vídeo): prompt, esquema e validação em código.
import { generateJson } from "~/lib/robot/gemini.server";
import { limparLinks } from "~/social/core/texto";
import type { EntradaSocial, Overrides } from "~/social/tipos";
import { VIDEO } from "./config";
import { palavrasDoRoteiro, type Imagem, type Roteiro } from "./roteiro";

export type { Imagem, Roteiro } from "./roteiro";

/** Imagens que as cenas podem usar: capa, imagens da matéria, imagens do dono (upload) e, nos modelos de dados, a arte do post. */
export function imagensDisponiveis(e: EntradaSocial, ov: Overrides = {}): Imagem[] {
  const out: Imagem[] = [];
  const add = (src: string | null | undefined, alt: string) => {
    if (!src || out.some((x) => x.src === src) || out.length >= 8) return;
    out.push({ src, alt: alt.slice(0, 120) });
  };
  add(ov.trocas?.["1"]?.src, "imagem escolhida pelo dono");
  add(e.capa?.src, "capa da matéria");
  for (const x of ov.extras ?? []) add(x.src, x.legenda ?? "imagem escolhida pelo dono");
  for (const b of e.corpo) if (b.type === "img") add(b.src, b.alt || "imagem da matéria");
  if (e.gratis?.arte) add(e.gratis.arte, "arte do jogo");
  if (e.review) add("arte:1", "quadro com a nota média da crítica");
  if (e.requisitos) add("arte:1", "quadro com os requisitos mínimos e recomendados");
  return out;
}

/** Texto da matéria sem links, para o prompt (limitado). */
function textoDaMateria(e: EntradaSocial): string {
  const partes: string[] = [];
  for (const b of e.corpo) {
    if (b.type === "p" || b.type === "quote") partes.push(limparLinks(b.text));
    else if (b.type === "h2" || b.type === "h3") partes.push(`# ${limparLinks(b.text)}`);
    else if (b.type === "ul") partes.push(b.items.map((i) => `- ${limparLinks(i)}`).join("\n"));
  }
  return partes.join("\n").slice(0, 6000);
}

function fatos(e: EntradaSocial): string {
  const l: string[] = [];
  if (e.review) l.push(`Nota média da crítica: ${e.review.score.toLocaleString("pt-BR")} em ${e.review.critics.length} veículos. Veredito: ${e.review.verdict}`);
  if (e.requisitos) l.push(`Requisitos de PC: ${e.requisitos.map((r) => `${r.rotulo}: mínimo ${r.minimo}, recomendado ${r.recomendado}`).join("; ")}`);
  if (e.gratis) l.push(`Jogo grátis: ${e.gratis.nome} na ${e.gratis.loja} até ${e.gratis.ate}${e.gratis.precoNormal ? `; preço normal ${e.gratis.precoNormal}` : ""}`);
  if (e.semana) l.push(`Lançamentos da semana (${e.semana.periodo}): ${e.semana.dias.flatMap((d) => d.jogos.map((j) => `${d.rotulo} ${d.data}: ${j.nome}`)).slice(0, 12).join("; ")}`);
  if (e.precoBrl) l.push(`Preço: ${e.precoBrl}`);
  if (e.lancamento) l.push(`Lançamento: ${e.lancamento}`);
  return l.join("\n");
}

const SYSTEM = `Você escreve roteiros de vídeos curtos (Reels, Shorts, TikTok) do Respawnou, portal brasileiro de notícias de games. O texto será LIDO EM VOZ ALTA por uma narradora, então escreva para o ouvido, em português do Brasil.

REGRAS
- Use SOMENTE o que está no texto da matéria. Não invente nome, número, data, preço ou declaração.
- Rumor é dito como rumor ("segundo rumores", "ainda não foi confirmado").
- Frases curtas, no máximo 18 palavras. Tom de quem joga para quem joga. Sem gíria forçada, sem "fala, galera", sem emoji, sem pergunta no meio do texto.
- Escreva números de preço e data como se falam ("oitenta e nove e noventa", "vinte e oito de novembro"). Nomes de jogos como no texto.
- gancho: a primeira frase, que prende (até 90 caracteres). Ela aparece no cartão de abertura.
- cenas: de 3 a 5. Cada cena tem uma fala (até 170 caracteres) e o número da imagem (da lista) que melhor combina com o que está sendo dito. Varie as imagens quando houver mais de uma.
- Soma de palavras do gancho + falas das cenas: entre 70 e 85.
- titulo_curto: até 60 caracteres, para o título do vídeo.
- Não escreva despedida nem chamada para seguir: o fechamento é fixo e já existe.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    gancho: { type: "STRING", description: "primeira frase falada, até 90 caracteres" },
    cenas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { fala: { type: "STRING", description: "até 170 caracteres" }, imagem: { type: "INTEGER", description: "índice da imagem na lista" } },
        required: ["fala", "imagem"],
      },
    },
    titulo_curto: { type: "STRING", description: "até 60 caracteres" },
  },
  required: ["gancho", "cenas", "titulo_curto"],
};

/** Confere o roteiro: tamanhos, 3 a 5 cenas, índices de imagem válidos e soma de palavras. Devolve a mensagem do problema ou null. */
export function validarRoteiro(r: unknown, nImagens: number): { ok: true; roteiro: Roteiro } | { ok: false; erro: string } {
  const L = VIDEO.limites;
  if (!r || typeof r !== "object") return { ok: false, erro: "roteiro vazio" };
  const o = r as Record<string, unknown>;
  const gancho = typeof o.gancho === "string" ? o.gancho.trim() : "";
  const titulo = typeof o.titulo_curto === "string" ? o.titulo_curto.trim() : "";
  const cenasBrutas = Array.isArray(o.cenas) ? o.cenas : [];
  if (!gancho || gancho.length > L.gancho) return { ok: false, erro: `gancho vazio ou com mais de ${L.gancho} caracteres` };
  if (!titulo || titulo.length > L.tituloCurto) return { ok: false, erro: `título curto vazio ou com mais de ${L.tituloCurto} caracteres` };
  if (cenasBrutas.length < L.cenas[0] || cenasBrutas.length > L.cenas[1]) return { ok: false, erro: `precisa de ${L.cenas[0]} a ${L.cenas[1]} cenas (veio ${cenasBrutas.length})` };
  const cenas: Roteiro["cenas"] = [];
  for (const c of cenasBrutas) {
    const x = c as Record<string, unknown>;
    const fala = typeof x.fala === "string" ? x.fala.trim() : "";
    const imagem = typeof x.imagem === "number" ? x.imagem : Number.NaN;
    if (!fala || fala.length > L.cena) return { ok: false, erro: `fala vazia ou com mais de ${L.cena} caracteres` };
    if (!Number.isInteger(imagem) || imagem < 0 || imagem >= nImagens) return { ok: false, erro: `imagem ${String(x.imagem)} não existe na lista` };
    cenas.push({ fala, imagem });
  }
  const roteiro: Roteiro = { gancho, cenas, titulo_curto: titulo };
  const n = palavrasDoRoteiro(roteiro);
  if (n < L.palavras[0] || n > L.palavras[1]) return { ok: false, erro: `${n} palavras (precisa de ${L.palavras[0]} a ${L.palavras[1]})` };
  return { ok: true, roteiro };
}

/** Pede o roteiro ao Gemini. 1 tentativa só (o dono pode pedir outro). Lança erro com a razão se não passar na validação. */
export async function gerarRoteiro(e: EntradaSocial, imagens: Imagem[]): Promise<Roteiro> {
  const prompt = `MATÉRIA (${e.section})
Título: ${e.titulo}
Linha fina: ${e.excerpt}
${fatos(e) ? `\nDADOS\n${fatos(e)}\n` : ""}
TEXTO
${textoDaMateria(e)}

IMAGENS DISPONÍVEIS (use o número em "imagem")
${imagens.map((x, i) => `${i}: ${x.alt}`).join("\n")}`;
  // Modelos próprios do vídeo (o robô de matérias usa o gemini-3.5-flash e esgota a cota dele). GEMINI_MODEL_VIDEO sobrescreve o primeiro.
  const modelos = [process.env.GEMINI_MODEL_VIDEO, "gemini-3.5-flash-lite", "gemini-3.8-flash"].filter(Boolean) as string[];
  const { data } = await generateJson<unknown>({ system: SYSTEM, prompt, schema: SCHEMA, temperature: 0.6, modelos });
  const v = validarRoteiro(data, imagens.length);
  if (!v.ok) throw new Error(`roteiro inválido: ${v.erro}`);
  return v.roteiro;
}
