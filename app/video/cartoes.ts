// Fatos da matéria para os cartões de dados do vídeo e quais cartões cada matéria pode ter. Puro: vale no navegador e no servidor.

export type TipoCartao = "preco" | "lancamento" | "nota" | "requisitos" | "gratis" | "plataformas" | "ranking" | "dia";

export const ROTULO_CARTAO: Record<TipoCartao, string> = {
  preco: "Preço",
  lancamento: "Data de lançamento",
  nota: "Nota da crítica",
  requisitos: "Requisitos de PC",
  gratis: "Jogo grátis",
  plataformas: "Plataformas",
  ranking: "Posição no ranking",
  dia: "Dia dos lançamentos",
};

/** Fatos congelados em video_jobs.facts (montados no servidor a partir da matéria). */
export interface FatosVideo {
  jogo?: string | null;
  /** "R$ 249,90" */
  preco?: string | null;
  /** data "28/11" (sem ano: o site só guarda dia e mês). */
  lancamento?: { data: string; diaSemana?: string; ano?: number } | null;
  /** Rótulos curtos ("PC", "PS", "XBOX"). */
  plataformas?: string[];
  nota?: { valor: number; veiculos: number; veredito?: string } | null;
  requisitos?: { rotulo: string; minimo: string }[];
  gratis?: { nome: string; loja: string; ate: string; precoNormal?: string | null; arte?: string | null }[];
  dias?: { rotulo: string; data: string; jogos: string[] }[];
  ranking?: { titulo: string }[];
}

const LINHA_PC = /placa|processador|mem[óo]ria|gpu|cpu|ram/i;

/** Cartões que fazem sentido para estes fatos (e série). Sem dado, o cartão não existe. */
export function cartoesDisponiveis(f: FatosVideo | null | undefined, serie = ""): TipoCartao[] {
  const out: TipoCartao[] = [];
  if (!f) return out;
  if (f.preco && /\d/.test(f.preco)) out.push("preco");
  if (f.lancamento?.data) out.push("lancamento");
  if (f.nota && f.nota.veiculos >= 1) out.push("nota");
  if ((f.requisitos ?? []).filter((r) => LINHA_PC.test(r.rotulo)).length >= 2) out.push("requisitos");
  if ((f.gratis ?? []).length >= 1) out.push("gratis");
  if ((f.plataformas ?? []).length >= 1) out.push("plataformas");
  if (serie === "top5" && (f.ranking ?? []).length >= 1) out.push("ranking");
  if (serie === "lancamentos" && (f.dias ?? []).length >= 1) out.push("dia");
  return out;
}

/** Linhas do bloco DADOS do prompt do roteiro, a partir dos fatos (as listas vão numeradas). */
export function dadosDoPrompt(f: FatosVideo | null | undefined): string {
  if (!f) return "";
  const l: string[] = [];
  if (f.jogo) l.push(`Jogo: ${f.jogo}`);
  if (f.preco) l.push(`Preço: ${f.preco}`);
  if (f.lancamento) l.push(`Lançamento: ${f.lancamento.data}`);
  if (f.plataformas?.length) l.push(`Plataformas: ${f.plataformas.join(", ")}`);
  if (f.nota) l.push(`Nota média da crítica: ${f.nota.valor.toLocaleString("pt-BR")} em ${f.nota.veiculos} veículos.${f.nota.veredito ? ` Veredito: ${f.nota.veredito}` : ""}`);
  if (f.requisitos?.length) l.push(`Requisitos de PC (mínimo): ${f.requisitos.map((r) => `${r.rotulo}: ${r.minimo}`).join("; ")}`);
  if (f.gratis?.length) f.gratis.forEach((g, i) => l.push(`Grátis ${i}: ${g.nome} na ${g.loja} até ${g.ate}${g.precoNormal ? `; preço normal ${g.precoNormal}` : ""}`));
  if (f.dias?.length) f.dias.forEach((d, i) => l.push(`Dia ${i}: ${d.rotulo} ${d.data}: ${d.jogos.slice(0, 6).join(", ")}`));
  if (f.ranking?.length) f.ranking.forEach((r, i) => l.push(`Item ${i + 1}: ${r.titulo}`));
  return l.join("\n");
}
