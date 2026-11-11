// Redator do robô: junta as fontes e a mídia, pede a matéria ao Gemini, confere qualidade e SEO
// (refazendo com a lista de problemas) e monta o corpo final com imagens, vídeo e links.
// Guia editorial baseado no do Anime Profile (worker/prompt.ts), adaptado para games.
import type { Block } from "../types.ts";
import { json } from "../db.server.ts";
import { assembleBody, stripLinks } from "./assemble.ts";
import { generateJson } from "./gemini.server.ts";
import { emptyMedia, mergeMedia, type SourceMedia } from "./media.ts";
import { steamGame, youtubeTrailer } from "./enrich.server.ts";
import { chooseMedia, probeImage, storeImage, type ProbedImage } from "./media.server.ts";
import { autoFix, checkDraft, sanitizeLinks, type DraftArticle, type DraftBlock } from "./quality.ts";
import { fetchArticle } from "./rss.server.ts";
import { countWords } from "./text.ts";

export const PLATFORMS = ["pc", "playstation", "xbox", "switch", "mobile"] as const;
export const SECTIONS = ["noticias", "artigos", "reviews", "guias", "promocoes"] as const;
const MAX_ATTEMPTS = 3;

export interface SourceItem {
  id: number;
  feed_id: number;
  feed_name: string;
  title: string;
  url: string;
  summary: string | null;
  published_at: string;
  media: unknown;
}

interface Source {
  name: string;
  title: string;
  url: string;
  date: string;
  text: string;
}

interface GeminiDraft extends DraftArticle {
  publish: boolean;
  reason: string;
  section: string;
  platforms: string[];
  tags: string[];
}

export interface BuiltArticle {
  section: string;
  title: string;
  excerpt: string;
  metaDescription: string;
  focusKeyword: string;
  tags: string[];
  platforms: string[];
  body: Block[];
  words: number;
  readMinutes: number;
  cover: ProbedImage;
  coverAlt: string;
  bodyImages: ProbedImage[];
  video?: { youtubeId: string; title: string };
  sources: { name: string; url: string }[];
  model: string;
  attempts: number;
  fixes: string[];
}

export type WriteResult = { ok: true; article: BuiltArticle } | { ok: false; status: "skipped" | "failed"; reason: string };

export interface WriteContext {
  sections: string[];
  minWords: number;
  recentTitles: string[];
  /** Matérias do site para link interno (as mais parecidas primeiro). */
  related: { title: string; url: string }[];
}

// ───────────── Prompt ─────────────

const SCHEMA = {
  type: "OBJECT",
  properties: {
    publish: { type: "BOOLEAN", description: "false se a pauta não serve (ver regras)" },
    reason: { type: "STRING", description: "por que publicar ou não, em uma frase" },
    section: { type: "STRING", enum: [...SECTIONS] },
    focusKeyword: { type: "STRING", description: "nome próprio central (jogo, empresa, console ou evento), nunca termo genérico" },
    title: { type: "STRING", description: "30 a 70 caracteres, contém a focusKeyword, de preferência no começo" },
    titleAlternatives: { type: "ARRAY", items: { type: "STRING" }, description: "2 títulos alternativos com as mesmas regras" },
    metaDescription: { type: "STRING", description: "120 a 160 caracteres, com a focusKeyword, resume o fato para o Google" },
    excerpt: { type: "STRING", description: "linha fina: 1 a 2 frases, 140 a 220 caracteres, complementa o título" },
    tags: { type: "ARRAY", items: { type: "STRING" }, description: "3 a 6 tags: jogo, franquia, empresa, plataforma, gênero" },
    platforms: { type: "ARRAY", items: { type: "STRING", enum: [...PLATFORMS] } },
    body: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: ["p", "h2", "h3", "ul", "quote"] },
          text: { type: "STRING" },
          items: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["type"],
      },
    },
  },
  required: ["publish", "reason", "section", "focusKeyword", "title", "titleAlternatives", "metaDescription", "excerpt", "tags", "platforms", "body"],
};

const SYSTEM = `Você é redator do Respawnou, portal brasileiro de notícias de games. Escreve matérias completas, originais e otimizadas para o Google, em português do Brasil.

VOZ E TOM
- Português brasileiro natural, de quem joga para quem joga: informativo, direto, sem gíria forçada.
- Frases de tamanho variado. Parágrafos curtos (2 a 4 frases, no máximo ~80 palavras).
- No máximo uma exclamação no texto todo. Sem emojis.
- NUNCA use: "Em um mundo onde", "Vale ressaltar que", "Vale lembrar que", "Em suma", "Em resumo", "Não é à toa que", "Prepare-se", "Fique ligado", "Fique de olho", "Sem sombra de dúvidas", "Mergulhe", "Confira tudo abaixo", "Não perca", "promete agradar", "promete revolucionar", "os jogadores estão ansiosos".
- Varie a abertura: não repita a estrutura dos títulos recentes do site (lista na mensagem).

ESTRUTURA (nesta ordem)
1. title: 30 a 70 caracteres. Nome do jogo/empresa primeiro, depois o fato. Só a primeira letra maiúscula (e nomes próprios). Sem caixa alta, sem "?" no fim, sem caça-clique.
2. Lide (1º bloco, tipo "p", 2 a 3 frases): o quê, quem, quando, onde. A focusKeyword aparece aqui.
3. Desenvolvimento em 2 ou mais seções, cada uma aberta por um "h2" informativo que diga o que o leitor encontra ali (ex.: "O que muda no multiplayer", "Quando chega ao PC", "Quanto vai custar") — nunca genérico ("Introdução", "Detalhes", "Conclusão"). Detalhes das fontes, com números, datas e declarações atribuídas ("segundo a Sony", "disse o diretor X"). Use "h3" só para subdividir uma seção longa. Use "ul" só quando houver itens de verdade (recursos, datas, edições, requisitos).
4. Seção "Para o jogador brasileiro" (h2 próprio) SÓ se as fontes trouxerem dado concreto para o Brasil: preço em reais, legendas/dublagem em português, data/horário de Brasília, lojas brasileiras. Sem esse dado, OMITA a seção inteira (nunca escreva frase genérica no lugar).
5. Última seção: h2 exatamente "Mais sobre <focusKeyword>" com contexto concreto tirado das fontes (jogos anteriores da série, estúdio, histórico recente da empresa, plataformas). Nada de "fique de olho" ou "acompanhe o Respawnou".
6. Não escreva "Fonte:" no fim: o crédito entra automaticamente.

TAMANHO E VALOR PRÓPRIO
- Alvo: 500 a 700 palavras no corpo (conte!). Mínimo absoluto 400: abaixo disso a matéria é reprovada. Use TODOS os detalhes das fontes. Se as fontes não tiverem substância para isso sem enrolar, responda publish=false.
- Junte o que cada fonte traz de diferente: a matéria deve ser a mais completa em português sobre o assunto.
- Explique o que isso muda para quem joga, o que já está confirmado e o que ainda falta saber.
- Nunca encha linguiça repetindo o lide com outras palavras.

LINKS (formato [texto âncora](url), dentro de "p" ou "ul")
- Use até 3 LINKS INTERNOS e de 1 a 2 LINKS EXTERNOS, escolhidos SOMENTE das listas da mensagem. Endereço fora das listas é removido.
- Texto âncora descritivo (ex.: "[o anúncio oficial no blog da PlayStation](url)"), nunca "clique aqui" ou o endereço cru.
- Pode citar a matéria original uma vez, de forma natural (ex.: "segundo a [IGN](url)").
- No máximo 1 link por parágrafo. Não ponha link no lide.
- Link só onde o trecho tem relação real com a página linkada. NUNCA escreva frase só para encaixar link nem fale do próprio site ("na seção X do site", "aqui no Respawnou"). Sem relação, use menos links.

PRECISÃO — NUNCA INVENTE
1. Use SOMENTE fatos presentes nas fontes. Nunca invente datas, preços, números, nomes, declarações, plataformas ou detalhes. Na dúvida, omita.
2. Não traduza parágrafo por parágrafo: escreva um texto novo, com estrutura própria.
3. Preços, dublagem/legendas e horários de Brasília só se estiverem nas fontes. Não converta moedas nem fusos.
4. Rumor, vazamento ou "insider": escreva como tal ("segundo rumores", "ainda não confirmado") e nunca apresente como fato.
5. Citações: traduza e atribua a quem disse. No máximo 2 citações (tipo "quote", sem aspas no texto). Nunca invente citação.
6. Spoilers de história: não coloque no título, na linha fina nem no lide.

QUANDO NÃO PUBLICAR (publish=false)
- Não é sobre games; é opinião, review ou impressões de outro veículo; rumor sem origem confiável; lista de ofertas de loja; conteúdo patrocinado; ou o assunto já está entre as matérias recentes do Respawnou.

CAMPOS
- section: entre as editorias permitidas. platforms: só as citadas nas fontes (pc, playstation, xbox, switch, mobile).
- tags: 3 a 6, nomes próprios e temas (ex.: "Sony", "PlayStation 5", "Jogos como serviço").`;

function sourcesBlock(sources: Source[]) {
  return sources.map((s, i) => `### FONTE ${i + 1}: ${s.name}\nTítulo: ${s.title}\nPublicado em: ${s.date}\nURL: ${s.url}\n\n${s.text}`).join("\n\n---\n\n");
}

const PLATFORM_PAGES = [
  ["/plataforma/playstation", "página PlayStation do site"],
  ["/plataforma/xbox", "página Xbox do site"],
  ["/plataforma/switch", "página Nintendo Switch do site"],
  ["/plataforma/pc", "página PC do site"],
  ["/plataforma/mobile", "página Mobile do site"],
  ["/lancamentos", "calendário de lançamentos do site"],
];

// ───────────── Fontes e mídia ─────────────

async function gatherSources(group: SourceItem[]) {
  const sources: Source[] = [];
  const medias: SourceMedia[] = [];
  for (const g of group) {
    const page = await fetchArticle(g.url);
    const full = countWords(page.text) >= countWords(g.summary ?? "") ? page.text : (g.summary ?? "");
    // Limite por fonte: prompt menor = resposta mais rápida (e menos lixo de página).
    const text = full.split(/\s+/).slice(0, 1500).join(" ");
    if (countWords(text) >= 40) sources.push({ name: g.feed_name, title: g.title, url: g.url, date: g.published_at, text });
    const rss = json<SourceMedia>(g.media, emptyMedia());
    // Ordem: imagens do RSS (escolhidas pelo próprio site) e depois as da página.
    const merged = mergeMedia(rss, page.media);
    merged.images = merged.images.map((i) => ({ ...i, source: g.feed_name }));
    medias.push(merged);
  }
  return { sources, media: mergeMedia(...medias) };
}

/** Confere no YouTube se o vídeo existe e pode ser incorporado (oEmbed responde 401/404 se não). */
async function videoInfo(id: string) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return { youtubeId: id, title: data.title ?? "Vídeo" };
  } catch {
    return null;
  }
}

const cleanTags = (tags: string[]) =>
  [...new Map((tags ?? []).map((t) => t.trim().replace(/^#/, "")).filter((t) => t.length >= 2 && t.length <= 40).map((t) => [t.toLowerCase(), t])).values()].slice(0, 6);

// ───────────── Escrever ─────────────

export async function writeArticle(group: SourceItem[], ctx: WriteContext): Promise<WriteResult> {
  const { sources, media } = await gatherSources(group);
  const sourceWords = sources.reduce((n, s) => n + countWords(s.text), 0);
  if (sourceWords < 200) return { ok: false, status: "skipped", reason: `pouco conteúdo nas fontes (${sourceWords} palavras)` };

  // Mídia antes do Gemini: sem capa utilizável a pauta sai, sem gastar cota.
  const chosen = await chooseMedia(media.images, 3);
  if (!chosen) return { ok: false, status: "skipped", reason: `sem imagem de capa utilizável (${media.images.length} candidata(s))` };
  let video: BuiltArticle["video"];
  for (const id of media.videos.slice(0, 3)) {
    const info = await videoInfo(id);
    if (info) {
      video = info;
      break;
    }
  }

  const internal = [...ctx.related.map((r) => [r.url, r.title] as const), ...PLATFORM_PAGES];
  const external = [...sources.map((s) => [s.url, `matéria original (${s.name})`] as const), ...media.links.slice(0, 6).map((u) => [u, "link oficial"] as const)];
  const allowed = [...internal.map(([u]) => u), ...external.map(([u]) => u)];

  const prompt = `Editorias permitidas: ${ctx.sections.join(", ")}.

Matérias publicadas recentemente pelo Respawnou (não repita o assunto nem a estrutura do título):
${ctx.recentTitles.map((t) => `- ${t}`).join("\n") || "- (nenhuma)"}

LINKS INTERNOS PERMITIDOS (até 3, só os que tiverem relação real com o assunto):
${internal.map(([u, t]) => `- ${u} — ${t}`).join("\n")}

LINKS EXTERNOS PERMITIDOS (use 1 a 2):
${external.map(([u, t]) => `- ${u} — ${t}`).join("\n")}

MÍDIA: a matéria terá ${chosen.body.length + 1} imagem(ns)${video ? " e um vídeo do YouTube logo depois do lide" : ""}, inseridas automaticamente. Não descreva imagens nem escreva "veja o vídeo".

Escreva uma matéria a partir das fontes abaixo. A FONTE 1 é a principal; as outras são de outros veículos sobre o mesmo assunto.

${sourcesBlock(sources)}`;

  const sourceText = sources.map((s) => `${s.title} ${s.text}`).join(" ");
  let lastIssues: string[] = [];
  let previous: GeminiDraft | undefined;
  let model = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const retry = previous
      ? `\n\n---\nSUA VERSÃO ANTERIOR (JSON):\n${JSON.stringify(previous)}\n\nEla foi reprovada na checagem de qualidade. Gere de novo a matéria COMPLETA, mantendo o que estava certo (sem encurtar o texto) e corrigindo especificamente:\n${lastIssues.map((i) => `- ${i}`).join("\n")}`
      : "";
    const res = await generateJson<GeminiDraft>({ system: SYSTEM, prompt: prompt + retry, schema: SCHEMA });
    model = res.model;
    const raw = res.data;
    if (!raw.publish && attempt === 1) return { ok: false, status: "skipped", reason: `recusada pelo redator (${raw.reason})` };

    const { draft, fixes } = autoFix({ ...raw, body: raw.body ?? [] });
    const { body: linked, removed } = sanitizeLinks(draft.body as DraftBlock[], allowed);
    if (removed.length) fixes.push(`links fora da lista removidos: ${removed.length}`);
    const issues = checkDraft({ ...draft, body: linked }, { sourceText, minWords: ctx.minWords, allowedSections: ctx.sections, section: raw.section });
    if (issues.length) {
      lastIssues = issues;
      previous = raw;
      continue;
    }

    const platforms = (raw.platforms ?? []).filter((p) => (PLATFORMS as readonly string[]).includes(p));
    const keyword = draft.focusKeyword.trim();

    // Fontes com pouca imagem: completa com capturas oficiais da Steam (uma por h2, até 3).
    const bodyImages = [...chosen.body];
    const wanted = Math.min(3, linked.filter((b) => b.type === "h2").length);
    if (bodyImages.length < wanted) {
      const steam = await steamGame(keyword);
      if (steam) {
        const seen = new Set([chosen.cover.hash, ...bodyImages.map((b) => b.hash)]);
        for (const url of steam.screenshots.slice(0, 6)) {
          if (bodyImages.length >= wanted) break;
          const shot = await probeImage({ url, source: "Steam" });
          if (shot && !seen.has(shot.hash) && shot.width >= 600) {
            seen.add(shot.hash);
            bodyImages.push(shot);
          }
        }
        if (bodyImages.length > chosen.body.length) fixes.push(`${bodyImages.length - chosen.body.length} captura(s) da Steam (${steam.name})`);
      }
    }
    // Sem vídeo nas fontes: trailer no YouTube (só com YOUTUBE_API_KEY).
    if (!video) {
      video = (await youtubeTrailer(keyword)) ?? undefined;
      if (video) fixes.push("trailer do YouTube pela busca");
    }

    const credit = (p: ProbedImage) => (p.source === "Steam" ? "Imagem: divulgação/Steam" : p.source ? `Imagem: reprodução/${p.source}` : undefined);
    const body = assembleBody({
      draft: linked,
      focusKeyword: keyword,
      images: bodyImages.map((p) => ({ src: p.url, width: p.width, height: p.height, credit: credit(p) })),
      video: video && { youtubeId: video.youtubeId, title: `${draft.focusKeyword}: ${video.title}`.slice(0, 200) },
      related: ctx.related,
      platforms,
    });
    const words = countWords(
      body.map((b) => (b.type === "ul" ? b.items.join(" ") : b.type === "p" || b.type === "h2" || b.type === "h3" || b.type === "quote" ? b.text : "")).map(stripLinks).join(" "),
    );
    return {
      ok: true,
      article: {
        section: raw.section,
        title: draft.title,
        excerpt: draft.excerpt,
        metaDescription: draft.metaDescription,
        focusKeyword: draft.focusKeyword.trim(),
        tags: cleanTags(raw.tags),
        platforms,
        body,
        words,
        readMinutes: Math.max(2, Math.round(words / 200)),
        cover: chosen.cover,
        coverAlt: draft.title,
        bodyImages,
        video,
        sources: sources.map((s) => ({ name: s.name, url: s.url })),
        model,
        attempts: attempt,
        fixes,
      },
    };
  }
  return { ok: false, status: "failed", reason: `reprovada na checagem após ${MAX_ATTEMPTS} tentativas: ${lastIssues.join(" | ")}` };
}

/** Grava as imagens em MEDIA_DIR e troca os endereços remotos pelos nossos. */
export async function localizeImages(a: BuiltArticle, slug: string) {
  const cover = await storeImage(a.cover, slug);
  const map = new Map<string, { src: string; width: number; height: number }>();
  let n = 2;
  for (const img of a.bodyImages) map.set(img.url, await storeImage(img, `${slug}-${n++}`));
  const body = a.body.map((b) => {
    if (b.type !== "img") return b;
    const local = map.get(b.src);
    return local ? { ...b, ...local } : b;
  });
  return { cover, body, coverCredit: a.cover.source ? `Imagem: reprodução/${a.cover.source}` : null };
}
