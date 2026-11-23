// Quando uma ficha de jogo (/jogos/<slug>) sem matéria nossa pode aparecer no Google (docs/crescimento.md, frente 2).
// Funções puras: o job "jogos" avalia as fichas e grava games.index_from; a página só olha esse campo.

export interface IndexInput {
  /** Descrição em português vinda do IGDB (a frase montada por código na página não conta). */
  description: string;
  releaseDate?: string | null;
  releaseLabel?: string | null;
  trailer?: string | null;
  screenshots?: string[] | null;
  pcMin?: string | null;
  pcRec?: string | null;
  /** Há informação sobre português (da Steam ou do IGDB), mesmo que seja "sem português". */
  hasLanguages: boolean;
  criticCount?: number | null;
  /** Quantas plataformas têm data exata na tabela de lançamentos. */
  releasePlatforms: number;
  /** Quantos dos jogos parecidos do IGDB existem como ficha no site. */
  similarOnSite: number;
}

/** Os 5 blocos "fortes": cada um responde a uma busca real e só aparece se houver dado. */
export function strongBlocks(g: IndexInput): string[] {
  const blocks: string[] = [];
  if (g.pcMin && g.pcRec) blocks.push("requisitos");
  if (g.hasLanguages) blocks.push("idiomas");
  if ((g.criticCount ?? 0) >= 3) blocks.push("critica");
  if (g.releasePlatforms >= 2) blocks.push("datas");
  if (g.similarOnSite >= 3) blocks.push("parecidos");
  return blocks;
}

/** Ficha sem matéria: precisa do básico (descrição, data, mídia) e de pelo menos 3 blocos fortes. */
export function isIndexable(g: IndexInput): boolean {
  if ((g.description ?? "").trim().length < 120) return false;
  const hasDate = Boolean(g.releaseDate) || Boolean(g.releaseLabel && g.releaseLabel !== "sem data");
  if (!hasDate) return false;
  if (!g.trailer && (g.screenshots?.length ?? 0) < 4) return false;
  return strongBlocks(g).length >= 3;
}
