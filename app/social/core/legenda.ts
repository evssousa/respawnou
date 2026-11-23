// Legenda do post (docs/instagram.md): gancho + contexto + pergunta opcional + CTA + até 3 hashtags. Pura.
import { SOCIAL } from "../config";
import type { EntradaSocial, Modelo } from "../tipos";
import { frasesInteiras, igual, limparLinks, paraHashtag, sobreposicao } from "./texto";

const dec = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function tipoBase(m: Modelo): string {
  if (m === "P1" || m === "P2") return "promo";
  if (m === "S") return "semana";
  if (m === "C-review") return "review";
  if (m === "C-guia") return "guia";
  if (m === "C-artigo") return "artigo";
  return "noticia";
}

/** No máximo 3 hashtags: o jogo, a plataforma (só se a matéria tem 1 ou 2) e a base do tipo. Sem repetir. */
export function hashtags(e: EntradaSocial, m: Modelo, extra: string[] = []): string[] {
  const lista: string[] = [];
  const add = (h: string | null | undefined) => {
    const t = (h ?? "").replace(/^#/, "").trim();
    if (!t || lista.some((x) => igual(x, t)) || lista.length >= 3) return;
    lista.push(t);
  };
  extra.forEach(add);
  const jogo = e.jogoNome ?? (e.focusKeyword && e.focusKeyword.length <= 24 ? e.focusKeyword : null);
  if (jogo && !extra.length) add(paraHashtag(jogo));
  if (e.plataformas.length >= 1 && e.plataformas.length <= 2) add(SOCIAL.hashtagsPlataforma[e.plataformas[0]]);
  add(SOCIAL.hashtagsBase[tipoBase(m)] ?? "games");
  return lista.slice(0, 3).map((h) => `#${h}`);
}

const escolher = (lista: string[], id: number) => lista[id % lista.length];

/** Monta a legenda. Alvo de 250 a 450 caracteres; máximo duro de 700. */
export function montarLegenda(e: EntradaSocial, m: Modelo): string {
  const cta = SOCIAL.frases.legenda;
  const gancho = limparLinks(e.titulo);
  const contexto = frasesInteiras(sobreposicao(e.excerpt, e.titulo) >= 0.7 && e.metaDescription ? e.metaDescription : e.excerpt, 220);
  let partes: string[];
  let tags: string[];

  if (m === "P1" && e.gratis) {
    const g = e.gratis;
    partes = [
      `GRÁTIS: ${g.nome} de graça na ${g.loja} até ${g.ate}.${g.precoNormal ? ` Depois volta a custar ${g.precoNormal}.` : ""}`,
      `Como resgatar: link na bio. Siga @${SOCIAL.handle} que a gente avisa todo jogo grátis.`,
    ];
    tags = hashtags(e, m, ["jogosgratis", paraHashtag(g.loja), paraHashtag(g.nome)]);
  } else if (m === "S" && e.semana) {
    const nomes = e.semana.dias.flatMap((d) => d.jogos.map((j) => j.nome)).slice(0, 3);
    const resto = Math.max(0, e.semana.total - nomes.length);
    partes = [
      `Lançamentos da semana (${e.semana.periodo}): ${nomes.join(", ")}${resto ? ` e mais ${resto}` : ""}.`,
      escolher(SOCIAL.perguntas.semana, e.postId),
      "Calendário completo no link da bio.",
    ];
    tags = hashtags(e, m, ["lancamentosdejogos", "games", paraHashtag(nomes[0] ?? "")]);
  } else if (m === "P2") {
    partes = [gancho, contexto, "Preços em reais conferidos na Steam; as ofertas acabam rápido. Lista completa no link da bio.", `Siga @${SOCIAL.handle} pra não perder as promoções.`];
    tags = hashtags(e, m, ["promocoesdasteam", "jogosbaratos", "games"]);
  } else if (m === "C-review" && e.review) {
    partes = [
      gancho,
      `Média da crítica: ${dec(e.review.score)} em ${e.review.critics.length} veículos. Arrasta pra ver o que elogiaram e o que criticaram.`,
      cta,
    ];
    tags = hashtags(e, m);
  } else if (m === "C-guia") {
    partes = [gancho, "Mínimo e recomendado pra rodar no PC, direto da Steam. Salva pra conferir antes de comprar.", cta];
    tags = hashtags(e, m);
  } else if (m === "C-artigo") {
    const n = e.pontos?.length ?? 0;
    partes = [gancho, n ? `Arrasta pro lado: os ${n} pontos principais.` : contexto, escolher(SOCIAL.perguntas.artigo, e.postId), cta];
    tags = hashtags(e, m);
  } else {
    const rumor = /rumor|vazamento/i.test(`${e.titulo} ${e.tags.join(" ")}`);
    partes = [rumor && !/^rumor/i.test(gancho) ? `RUMOR: ${gancho}` : gancho, contexto, rumor ? "" : escolher(SOCIAL.perguntas.noticia, e.postId), cta];
    tags = hashtags(e, m);
  }

  // Uma linha em branco entre os blocos (gancho, contexto, pergunta, chamada e hashtags): no Instagram, só "\n" cola tudo.
  const juntar = (blocos: (string | undefined)[]) => blocos.filter(Boolean).join("\n\n");
  let texto = juntar([...partes, tags.join(" ")]);
  if (texto.length > 700) {
    // Estourou: tira a pergunta e encurta o contexto.
    texto = juntar([partes[0], partes.at(-1), tags.join(" ")]);
  }
  return texto;
}
