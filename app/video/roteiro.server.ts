// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Roteiro do vídeo (Gemini grátis, 1 pedido por vídeo): prompt, esquema e validação em código.
import { generateJson } from "~/lib/robot/gemini.server";
import { limparLinks } from "~/social/core/texto";
import type { EntradaSocial, Overrides } from "~/social/tipos";
import { MARCA } from "~/marca";
import { type FatosVideo, cartoesDisponiveis, dadosDoPrompt, type TipoCartao } from "./cartoes";
import { perfilDaSecao, perfilDoJob, VIDEO } from "./config";
import { normalizarSerie } from "./series.server";
import { palavrasDoRoteiro, type Imagem, type Roteiro } from "./roteiro";

export type { Imagem, Roteiro } from "./roteiro";

/** Imagens que as cenas podem usar: capa, imagens da matéria, imagens do dono (upload) e, nos modelos de dados, a arte do post. */
export function imagensDisponiveis(e: EntradaSocial, ov: Overrides = {}, extras: Imagem[] = []): Imagem[] {
  const out: Imagem[] = [];
  const add = (src: string | null | undefined, alt: string) => {
    if (!src || out.some((x) => x.src === src) || out.length >= 8) return;
    out.push({ src, alt: alt.slice(0, 120) });
  };
  // Séries: primeiro as artes dos itens da lista (uma por item), depois as da matéria.
  for (const x of extras) add(x.src, x.alt);
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

const BLOCO_SERIE: Record<string, string> = {
  "gratis-semana": "- SÉRIE Grátis da semana: faça EXATAMENTE uma cena por jogo da lista DADOS (Grátis 0, Grátis 1...), na mesma ordem. Cada fala diz o nome do jogo, a loja e até quando está grátis; o preço normal se houver. O gancho resume quantos jogos estão grátis.",
  "lancamentos-semana": "- SÉRIE Lançamentos da semana: faça EXATAMENTE uma cena por dia da lista DADOS (Dia 0, Dia 1...), na mesma ordem, dizendo o dia e os jogos que saem (até 3 nomes). O gancho diz quantos lançamentos tem e o destaque da semana.",
  "review-60": "- SÉRIE Review em 60 s: faça EXATAMENTE 4 cenas: (1) o jogo e a nota média da crítica com o número de veículos; (2) o que a crítica mais elogia; (3) o que a crítica mais critica; (4) o veredito e onde jogar ou o preço.",
  top5: "- SÉRIE Top 5: faça EXATAMENTE 5 cenas, uma por item da lista DADOS (Item 1 a 5), na ordem em que aparecem. Cada fala diz a posição do item (se vier #5, diga \"em quinto lugar\"; se vier 01, \"número um\") e por que ele está na lista, só com o que o texto diz. O gancho apresenta o tema da lista.",
};

export const systemDoPerfil = (secao: string, serie = "") => {
  const P = perfilDoJob(secao, serie);
  return `Você escreve roteiros de vídeos curtos (Reels, Shorts, TikTok) do ${MARCA.site}, ${MARCA.descricao}. O texto será LIDO EM VOZ ALTA por uma narradora, então escreva para o ouvido, em português do Brasil.

REGRAS
- Use SOMENTE o que está no texto da matéria. Não invente nome, número, data, preço ou declaração.
- Tom ANIMADO e enérgico, como um apresentador empolgado com o assunto (não leia como notícia de telejornal): frases com ritmo, verbos de ação e "!" nas frases de impacto (no máximo 2 no vídeo todo). Sem exagero e sem inventar.
- Rumor é dito como rumor ("segundo rumores", "ainda não foi confirmado").
- Frases curtas, no máximo 18 palavras. ${MARCA.tom} Sem gíria forçada, sem "fala, galera", sem emoji, sem pergunta no meio do texto.
- Escreva preços, datas, notas e números com ALGARISMOS, como aparecem na matéria (R$ 249,90; 28/11; nota 8,7; 2026). O sistema converte para a fala. Nomes de jogos como no texto.
- ganchos: 3 opções de primeira frase (até 90 caracteres cada), de estilos diferentes: (1) o fato mais forte, com o número ou o nome principal; (2) o que muda para quem joga; (3) uma curiosidade ou contraste, sem exagerar nem prometer o que a matéria não diz. No máximo uma delas pode ser pergunta. A escolhida aparece no cartão de abertura.
- pergunta: uma pergunta curta de opinião para o fim (até 80 caracteres), ligada à matéria, que dê para responder com uma palavra (ex.: "Você pagaria R$ 349 nele?"). Não escreva "comenta aí": o sistema acrescenta.
- destaques: até 6 termos que aparecem literalmente nas falas (nomes de jogos, estúdios ou consoles mais importantes).
- cenas: de ${P.cenas[0]} a ${P.cenas[1]}. Cada cena tem uma fala (até ${P.cena} caracteres) e o número da imagem (da lista) que melhor combina com o que está sendo dito. Varie as imagens quando houver mais de uma.
- Soma de palavras do gancho + falas das cenas: ${P.alvoPalavras} (vídeo de ${P.rotulo}).${P.id === "longo" ? `
- Esta é uma matéria longa (artigo, review ou guia): percorra os pontos principais na ordem em que aparecem, uma ideia por cena, sem pressa e sem repetir.` : `
- Esta é uma notícia: vá direto ao fato mais importante e aos detalhes que mudam algo para quem joga.`}
- Cartões de dados: em cada cena, "cartao" é OPCIONAL. Use só um dos tipos listados em CARTÕES DISPONÍVEIS, apenas se a fala daquela cena citar o dado; no máximo um por cena e cada tipo uma vez. Deixe vazio se não combinar.
${BLOCO_SERIE[serie] ?? ""}
- titulo_curto: até 60 caracteres, para o título do vídeo.
- Não escreva despedida nem chamada para seguir: o fechamento é fixo e já existe.`;
};

/** Esquema do pedido ao Gemini; o campo "cartao" só aceita os tipos disponíveis para esta matéria. */
const schemaDoJob = (cartoes: TipoCartao[]) => ({
  type: "OBJECT",
  properties: {
    ganchos: { type: "ARRAY", items: { type: "STRING", description: "primeira frase falada, até 90 caracteres" } },
    pergunta: { type: "STRING", description: "pergunta de opinião para o fim, até 80 caracteres" },
    destaques: { type: "ARRAY", items: { type: "STRING" } },
    cenas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          fala: { type: "STRING", description: "fala da cena" },
          imagem: { type: "INTEGER", description: "índice da imagem na lista" },
          ...(cartoes.length ? { cartao: { type: "STRING", enum: [...cartoes], description: "cartão de dados; omita o campo se nenhum combinar" } } : {}),
          item: { type: "INTEGER", description: "nas séries, número do item da lista de DADOS" },
        },
        required: ["fala", "imagem"],
      },
    },
    titulo_curto: { type: "STRING", description: "até 60 caracteres" },
  },
  required: ["ganchos", "cenas", "titulo_curto"],
});

const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Confere o roteiro: tamanhos, cenas, índices de imagem, soma de palavras. Aceita o formato antigo (só `gancho`) e o novo
 * (`ganchos`, pergunta, destaques, cartões). Pergunta, destaques e cartões inválidos viram vazio, sem falhar o roteiro.
 */
export function validarRoteiro(r: unknown, nImagens: number, secao = "", fatos: FatosVideo | null = null, serie = ""): { ok: true; roteiro: Roteiro } | { ok: false; erro: string } {
  const P = perfilDoJob(secao, serie);
  const L = { ...VIDEO.limites, ...P, cenas: P.cenas, palavras: P.palavras, cena: P.cena };
  // Séries de lista: uma cena por item (jogos grátis, dias, itens do ranking).
  const itens = serie === "gratis-semana" ? fatos?.gratis?.length : serie === "lancamentos-semana" ? fatos?.dias?.length : serie === "top5" ? fatos?.ranking?.length : undefined;
  if (!r || typeof r !== "object") return { ok: false, erro: "roteiro vazio" };
  const o = r as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const ganchosBrutos = Array.isArray(o.ganchos) ? o.ganchos.map(texto).filter((g) => g && g.length <= L.gancho) : [];
  const ganchos = [...new Set(ganchosBrutos)].slice(0, 3);
  const novo = Array.isArray(o.ganchos);
  if (novo && !ganchos.length) return { ok: false, erro: `nenhum gancho válido (até ${L.gancho} caracteres)` };
  const escolhido = texto(o.gancho);
  const gancho = novo ? (escolhido && escolhido.length <= L.gancho ? escolhido : ganchos[0]) : escolhido;
  const titulo = texto(o.titulo_curto);
  const cenasBrutas = Array.isArray(o.cenas) ? o.cenas : [];
  if (!gancho || gancho.length > L.gancho) return { ok: false, erro: `gancho vazio ou com mais de ${L.gancho} caracteres` };
  if (!titulo || titulo.length > L.tituloCurto) return { ok: false, erro: `título curto vazio ou com mais de ${L.tituloCurto} caracteres` };
  if (cenasBrutas.length < L.cenas[0] || cenasBrutas.length > L.cenas[1]) return { ok: false, erro: `precisa de ${L.cenas[0]} a ${L.cenas[1]} cenas (veio ${cenasBrutas.length})` };
  if (itens && cenasBrutas.length !== itens) return { ok: false, erro: `a série precisa de exatamente ${itens} cenas (uma por item); veio ${cenasBrutas.length}` };
  const disponiveis = cartoesDisponiveis(fatos, serie);
  const usados = new Set<string>();
  const cenas: Roteiro["cenas"] = [];
  for (const c of cenasBrutas) {
    const x = c as Record<string, unknown>;
    const fala = texto(x.fala);
    const imagem = typeof x.imagem === "number" ? x.imagem : Number.NaN;
    if (!fala || fala.length > L.cena) return { ok: false, erro: `fala vazia ou com mais de ${L.cena} caracteres` };
    if (!Number.isInteger(imagem) || imagem < 0 || imagem >= nImagens) return { ok: false, erro: `imagem ${String(x.imagem)} não existe na lista` };
    const cena: Roteiro["cenas"][number] = { fala, imagem };
    const cartao = texto(x.cartao) as TipoCartao;
    const repete = usados.has(cartao) && cartao !== "ranking" && cartao !== "dia";
    if (cartao && disponiveis.includes(cartao) && !repete) {
      cena.cartao = cartao;
      usados.add(cartao);
    }
    if (typeof x.item === "number" && Number.isInteger(x.item) && x.item >= 0 && x.item < 50 && cena.cartao) cena.item = x.item;
    if (typeof x.ss === "number" && Number.isFinite(x.ss) && x.ss >= 0 && x.ss < 36000) cena.ss = Number(x.ss.toFixed(2));
    if (typeof x.baixo === "number" && Number.isInteger(x.baixo) && x.baixo >= 0 && x.baixo < nImagens) cena.baixo = x.baixo;
    cenas.push(cena);
  }
  const roteiro: Roteiro = { gancho, cenas, titulo_curto: titulo };
  // Formato da tela (tela dividida): vale para roteiro antigo e novo.
  if (o.layout === "dividido" || o.layout === "cheio") roteiro.layout = o.layout;
  if (typeof o.topo === "number" && Number.isInteger(o.topo) && o.topo >= 0 && o.topo < nImagens) roteiro.topo = o.topo;
  if (novo) {
    roteiro.v = 2;
    roteiro.ganchos = ganchos;
    const pergunta = texto(o.pergunta);
    roteiro.pergunta = pergunta && pergunta.length <= 80 ? pergunta : null;
    roteiro.usarPergunta = roteiro.pergunta ? o.usarPergunta !== false : false;
    const falas = semAcento(cenas.map((c) => c.fala).join(" "));
    roteiro.destaques = (Array.isArray(o.destaques) ? o.destaques.map(texto) : [])
      .filter((d, i, a) => d.length >= 2 && d.length <= 40 && falas.includes(semAcento(d)) && a.findIndex((x) => semAcento(x) === semAcento(d)) === i)
      .slice(0, 6);
  }
  const n = palavrasDoRoteiro(roteiro);
  if (n < L.palavras[0] || n > L.palavras[1]) return { ok: false, erro: `${n} palavras (precisa de ${L.palavras[0]} a ${L.palavras[1]})` };
  return { ok: true, roteiro };
}

/** Só para o roteiro vindo do Gemini: se um cartão de nota, grátis ou preço está disponível e nenhuma cena o usou, põe na 1ª cena (depois da 1ª) que cita o dado. */
export function reforcarCartoes(r: Roteiro, fatos: FatosVideo | null, serie = ""): Roteiro {
  const disp = cartoesDisponiveis(fatos, serie);
  const usados = new Set(r.cenas.map((c) => c.cartao).filter(Boolean));
  const citam: Partial<Record<TipoCartao, (f: string) => boolean>> = {
    nota: (f) => /\d[,.]\d|\bnota\b/i.test(f),
    gratis: (f) => (fatos?.gratis ?? []).some((g) => semAcento(f).includes(semAcento(g.nome.split(/\s+/)[0]))),
    preco: (f) => /R\$\s?\d/.test(f),
  };
  const cenas = r.cenas.map((c) => ({ ...c }));
  for (const tipo of ["nota", "gratis", "preco"] as TipoCartao[]) {
    if (!disp.includes(tipo) || usados.has(tipo)) continue;
    const i = cenas.findIndex((c, k) => k >= 1 && !c.cartao && citam[tipo]?.(c.fala));
    if (i >= 0) {
      cenas[i].cartao = tipo;
      usados.add(tipo);
    }
  }
  return { ...r, cenas };
}

/** Pede o roteiro ao Gemini. 1 tentativa só (o dono pode pedir outro). Lança erro com a razão se não passar na validação. */
export async function gerarRoteiro(e: EntradaSocial, imagens: Imagem[], fatosVideo: FatosVideo | null = null, serie = ""): Promise<Roteiro> {
  const dados = serie ? dadosDoPrompt(fatosVideo) || fatos(e) : fatos(e);
  const cartoes = cartoesDisponiveis(fatosVideo, serie);
  const prompt = `MATÉRIA (${e.section})
Título: ${e.titulo}
Linha fina: ${e.excerpt}
${dados ? `\nDADOS\n${dados}\n` : ""}
CARTÕES DISPONÍVEIS: ${cartoes.length ? cartoes.join(", ") : "nenhum"}

TEXTO
${textoDaMateria(e)}

IMAGENS DISPONÍVEIS (use o número em "imagem")
${imagens.map((x, i) => `${i}: ${x.alt}`).join("\n")}`;
  // Modelos próprios do vídeo (o robô de matérias usa o gemini-3.5-flash e esgota a cota dele). GEMINI_MODEL_VIDEO sobrescreve o primeiro.
  const modelos = [process.env.GEMINI_MODEL_VIDEO, "gemini-3.5-flash-lite", "gemini-3.8-flash"].filter(Boolean) as string[];
  const { data } = await generateJson<unknown>({ system: systemDoPerfil(e.section, serie), prompt, schema: schemaDoJob(cartoes), temperature: 0.6, modelos });
  let v = validarRoteiro(data, imagens.length, e.section, fatosVideo, serie);
  if (!v.ok && !/vazio/.test(v.erro)) {
    // Uma única correção: devolve o motivo ao Gemini (ex.: "62 palavras, precisa de 70 a 140") e pede de novo.
    const { data: data2 } = await generateJson<unknown>({
      system: systemDoPerfil(e.section, serie),
      prompt: `${prompt}\n\nCORREÇÃO OBRIGATÓRIA: o roteiro que você mandou foi recusado: ${v.erro}. Escreva de novo, corrigindo exatamente isso e mantendo todas as outras regras.`,
      schema: schemaDoJob(cartoes),
      temperature: 0.5,
      modelos,
    });
    v = validarRoteiro(data2, imagens.length, e.section, fatosVideo, serie);
  }
  if (!v.ok) throw new Error(`roteiro inválido: ${v.erro}`);
  const r = reforcarCartoes(v.roteiro, fatosVideo, serie);
  return serie && fatosVideo ? normalizarSerie(r, serie, fatosVideo, imagens) : r;
}
