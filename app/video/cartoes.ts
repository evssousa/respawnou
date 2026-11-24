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

/** Termos que a legenda destaca em verde: destaques do roteiro + nome do jogo + nomes de grátis, dias e ranking (sem repetir; até 30). */
export function termosDeDestaque(roteiro: { destaques?: string[] } | null | undefined, f: FatosVideo | null | undefined): string[] {
  const todos = [
    ...(roteiro?.destaques ?? []),
    f?.jogo ?? "",
    ...(f?.gratis ?? []).map((g) => g.nome),
    ...(f?.dias ?? []).flatMap((d) => d.jogos),
    ...(f?.ranking ?? []).map((r) => r.titulo),
  ]
    .map((x) => (x ?? "").trim())
    .filter((x) => x.length >= 2 && x.length <= 40);
  return [...new Set(todos.map((x) => x.toLowerCase()))].slice(0, 30).map((l) => todos.find((x) => x.toLowerCase() === l)!);
}

// ───────────── Tempo de tela de cada cartão ─────────────
export interface CartaoPlanejado {
  tipo: TipoCartao;
  item: number | null;
  ini: number;
  fim: number;
}

const NBSP = "\u00a0";

/**
 * Quando cada cartão entra e sai. Entra um pouco antes da palavra do dado (preço, nota ou data) na fala da cena; sem a palavra,
 * 0,35 s depois do início da cena. Nunca antes do fim da abertura (+0,25 s) nem antes do fim do cartão anterior (+0,3 s). Sai
 * 0,15 s antes do fim da cena ou 4,5 s depois de entrar (ranking e dia ficam até o fim da cena). Menos de 1,6 s: não entra.
 */
export function planoCartoes(
  cenas: { ini: number; fim: number; palavras: { texto: string; ini: number }[] }[],
  roteiro: { cenas: { cartao?: TipoCartao | null; item?: number | null }[] },
  fatos: FatosVideo | null | undefined,
  fimAbertura: number,
): CartaoPlanejado[] {
  const out: CartaoPlanejado[] = [];
  const nota = fatos?.nota ? fatos.nota.valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null;
  const acha: Partial<Record<TipoCartao, (t: string) => boolean>> = {
    preco: (t) => /R\$|\d,\d{2}$/.test(t),
    nota: (t) => (nota ? t.replace(NBSP, " ").replace(/[^\d,]/g, "") === nota : false),
    lancamento: (t) => /^\d{1,2}\/\d{1,2}/.test(t),
  };
  cenas.forEach((c, k) => {
    const rc = roteiro.cenas[k];
    const tipo = rc?.cartao;
    if (!tipo) return;
    const palavra = acha[tipo] ? c.palavras.find((p) => acha[tipo]!(p.texto)) : undefined;
    let ini = palavra ? palavra.ini - 0.15 : c.ini + 0.35;
    const anterior = out[out.length - 1];
    ini = Math.max(ini, fimAbertura + 0.25, anterior ? anterior.fim + 0.3 : 0);
    const semTeto = tipo === "ranking" || tipo === "dia";
    const fim = semTeto ? c.fim - 0.15 : Math.min(c.fim - 0.15, ini + 4.5);
    if (fim - ini < 1.6) return;
    out.push({ tipo, item: rc?.item ?? null, ini: Number(ini.toFixed(2)), fim: Number(fim.toFixed(2)) });
  });
  return out;
}

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
/** "28/11" → "28 NOV" (com o ano só quando não é o atual). */
export const dataCurta = (dm: string, ano?: number) => {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(dm);
  if (!m) return dm;
  const anoAtual = new Date().getFullYear();
  return `${Number(m[1])} ${MESES[Number(m[2]) - 1] ?? ""}${ano && ano !== anoAtual ? ` ${ano}` : ""}`.trim();
};

/** Texto da opção do cartão no painel ("Preço: R$ 249,90"). */
export function rotuloOpcaoCartao(tipo: TipoCartao, f: FatosVideo | null | undefined): string {
  switch (tipo) {
    case "preco":
      return `Preço: ${f?.preco ?? ""}`;
    case "nota":
      return `Nota: ${f?.nota ? f.nota.valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : ""}`;
    case "lancamento":
      return `Lançamento: ${f?.lancamento ? dataCurta(f.lancamento.data, f.lancamento.ano) : ""}`;
    case "gratis":
      return `Grátis: ${f?.gratis?.[0]?.nome ?? ""}`;
    case "plataformas":
      return `Plataformas: ${(f?.plataformas ?? []).join(", ")}`;
    case "requisitos":
      return "Requisitos mínimos";
    default:
      return ROTULO_CARTAO[tipo];
  }
}
