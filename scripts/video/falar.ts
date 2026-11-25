// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Do texto da TELA (algarismos: "R$ 249,90", "28/11", "nota 8,7") para o texto FALADO ("duzentos e quarenta e nove reais e noventa
// centavos"), com dicionário de pronúncia, pausas antes de números e o caminho de volta (as palavras com tempo da voz voltam a ser
// as palavras da tela, para a legenda). Puro: sem rede nem disco; vale no navegador e no servidor.

export interface ItemPronuncia {
  de: string;
  para: string;
}

/** Classe de uma palavra da tela: serve para pausas (etapa 4) e destaques da legenda (etapa 7). */
export type ClassePalavra = "preco" | "nota" | "data" | "numero" | "outra";

export interface FalaConvertida {
  /** Palavras da tela (preço e nomes do dicionário com várias palavras viram uma só, ligadas por espaço duro). */
  tela: string[];
  /** Quantas palavras faladas cada palavra da tela virou. */
  mapa: number[];
  classes: ClassePalavra[];
  /** Texto falado, na mesma ordem. */
  falado: string;
}

const NBSP = " "; // espaço duro: junta palavras que a tela mostra como uma só

// ───────────── Números por extenso (pt-BR) ─────────────
const UNID = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENT = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

/** Inteiro de 0 a 999.999 por extenso. Fora disso devolve os algarismos (a voz se vira). */
export function extenso(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) return String(n);
  if (n < 20) return UNID[n];
  if (n < 100) return DEZ[Math.floor(n / 10)] + (n % 10 ? ` e ${UNID[n % 10]}` : "");
  if (n === 100) return "cem";
  if (n < 1000) return CENT[Math.floor(n / 100)] + (n % 100 ? ` e ${extenso(n % 100)}` : "");
  const mil = Math.floor(n / 1000);
  const resto = n % 1000;
  const parteMil = mil === 1 ? "mil" : `${extenso(mil)} mil`;
  if (!resto) return parteMil;
  return resto < 100 || resto % 100 === 0 ? `${parteMil} e ${extenso(resto)}` : `${parteMil} ${extenso(resto)}`;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const ORD_M = ["", "primeiro", "segundo", "terceiro", "quarto", "quinto", "sexto", "sétimo", "oitavo", "nono", "décimo"];
const ORD_F = ["", "primeira", "segunda", "terceira", "quarta", "quinta", "sexta", "sétima", "oitava", "nona", "décima"];

/** "1.299" ou "249" → inteiro (ponto = milhar só quando seguido de 3 dígitos). */
function inteiro(s: string): number | null {
  if (/^\d{1,3}(\.\d{3})+$/.test(s) || /^\d+$/.test(s)) return Number(s.replace(/\./g, ""));
  return null;
}

function fracao(s: string): string {
  if (s.length <= 2 && !s.startsWith("0")) return extenso(Number(s));
  return [...s].map((d) => UNID[Number(d)]).join(" ");
}

const PONT_FIM = /[.,;:!?…)"”'’]+$/;
const PONT_INI = /^[("“'‘]+/;

interface Resultado {
  falado: string;
  classe: ClassePalavra;
}

/** Converte UMA palavra da tela (sem pontuação nas pontas). null = não é número/data/preço. */
function numero(p: string, anterior: string): Resultado | null {
  let m: RegExpExecArray | null;
  // Preço: R$ 249,90 | R$249,90 | R$ 1.299 | US$ 59,99
  if ((m = /^(R\$|US\$)[ ]?(\d[\d.]*)(?:,(\d{1,2}))?$/.exec(p.replace(NBSP, " ")))) {
    const reais = inteiro(m[2]);
    if (reais === null) return null;
    const dolar = m[1] === "US$";
    const unidade = dolar ? (reais === 1 ? "dólar" : "dólares") : reais === 1 ? "real" : "reais";
    const cent = m[3] ? Number(m[3].padEnd(2, "0")) : 0;
    let f = `${extenso(reais)} ${unidade}`;
    if (cent > 0) f += ` e ${extenso(cent)} ${cent === 1 ? "centavo" : "centavos"}`;
    return { falado: f, classe: "preco" };
  }
  // Porcentagem: 30% | 7,5%
  if ((m = /^(\d+)(?:,(\d+))?%$/.exec(p))) return { falado: `${extenso(Number(m[1]))}${m[2] ? ` vírgula ${fracao(m[2])}` : ""} por cento`, classe: "numero" };
  // Data: 28/11 | 1/12 | 28/11/2026
  if ((m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/.exec(p))) {
    const d = Number(m[1]);
    const mes = Number(m[2]);
    if (d >= 1 && d <= 31 && mes >= 1 && mes <= 12) {
      let f = `${d === 1 ? "primeiro" : extenso(d)} de ${MESES[mes - 1]}`;
      if (m[3]) f += ` de ${extenso(Number(m[3]))}`;
      return { falado: f, classe: "data" };
    }
  }
  // Hora: 13h | 13h30
  if ((m = /^(\d{1,2})h(\d{2})?$/.exec(p))) {
    const h = Number(m[1]);
    if (h <= 24) return { falado: m[2] ? `${extenso(h)} e ${extenso(Number(m[2]))}` : `${h === 1 ? "uma" : h === 2 ? "duas" : extenso(h)} ${h === 1 ? "hora" : "horas"}`, classe: "data" };
  }
  // Ranking e ordinais: #5 | 1º | 2ª
  if ((m = /^#(\d{1,3})$/.exec(p))) return { falado: `número ${extenso(Number(m[1]))}`, classe: "numero" };
  if ((m = /^(\d{1,2})([ºª°])$/.exec(p))) {
    const n = Number(m[1]);
    const tab = m[2] === "ª" ? ORD_F : ORD_M;
    return { falado: tab[n] || extenso(n), classe: "numero" };
  }
  // Placas e processadores: RTX 4060 (lido em pares) | i5
  if (/^\d{4}$/.test(p) && /^(RTX|GTX|RX|Arc)$/i.test(anterior)) return { falado: `${extenso(Number(p.slice(0, 2)))} ${extenso(Number(p.slice(2)))}`, classe: "numero" };
  if ((m = /^i([3579])$/.exec(p))) return { falado: `i ${extenso(Number(m[1]))}`, classe: "outra" };
  // Decimal (nota): 8,7
  if ((m = /^(\d{1,3}),(\d{1,2})$/.exec(p))) return { falado: `${extenso(Number(m[1]))} vírgula ${fracao(m[2])}`, classe: "nota" };
  // Inteiro / ano
  const n = inteiro(p);
  if (n !== null && n <= 999_999) return { falado: extenso(n), classe: "numero" };
  return null;
}

const base = (p: string) => p.replace(PONT_INI, "").replace(PONT_FIM, "");

/**
 * Texto da tela de UMA parte (gancho, uma cena ou o fechamento) → palavras da tela, texto falado, mapa e classes.
 * Ordem em cada palavra: dicionário (entradas de várias palavras primeiro), depois números/datas/preços. Pontuação nas pontas fica.
 */
export function paraFala(textoTela: string, dic: ItemPronuncia[] = []): FalaConvertida {
  const brutas = textoTela.split(/ +/).filter(Boolean);
  const itens = [...dic].filter((x) => x.de.trim() && x.para.trim()).sort((a, b) => b.de.trim().split(/\s+/).length - a.de.trim().split(/\s+/).length);
  const tela: string[] = [];
  const falados: string[] = [];
  const classes: ClassePalavra[] = [];
  let anteriorBase = "";
  for (let i = 0; i < brutas.length; ) {
    let w = brutas[i];
    // "R$ 249,90" com espaço comum: junta as duas palavras.
    if (/^(R\$|US\$)$/.test(base(w)) && brutas[i + 1] && /^\d/.test(base(brutas[i + 1]))) {
      w = `${w}${NBSP}${brutas[i + 1]}`;
      i++;
    }
    // Dicionário (várias palavras ou uma)
    let achou: { item: ItemPronuncia; usadas: number } | null = null;
    for (const it of itens) {
      const alvo = it.de.trim().toLowerCase().split(/\s+/);
      if (alvo.length === 1 && w !== brutas[i]) continue;
      const cand = brutas.slice(i, i + alvo.length).map((x, k, a) => (k === a.length - 1 ? base(x) : base(x)).toLowerCase());
      if (cand.length === alvo.length && cand.every((x, k) => x === alvo[k])) {
        achou = { item: it, usadas: alvo.length };
        break;
      }
    }
    if (achou) {
      const ultima = brutas[i + achou.usadas - 1];
      const fimPont = (PONT_FIM.exec(ultima)?.[0] ?? "");
      const iniPont = (PONT_INI.exec(brutas[i])?.[0] ?? "");
      tela.push(brutas.slice(i, i + achou.usadas).join(NBSP));
      falados.push(`${iniPont}${achou.item.para.trim()}${fimPont}`);
      classes.push("outra");
      anteriorBase = base(ultima);
      i += achou.usadas;
      continue;
    }
    const iniPont = PONT_INI.exec(w)?.[0] ?? "";
    const fimPont = PONT_FIM.exec(w)?.[0] ?? "";
    const nucleo = base(w);
    const r = numero(nucleo, anteriorBase);
    tela.push(w);
    falados.push(r ? `${iniPont}${r.falado}${fimPont}` : w);
    classes.push(r?.classe ?? "outra");
    anteriorBase = nucleo;
    i++;
  }
  return { tela, mapa: falados.map((f) => f.split(/\s+/).filter(Boolean).length), classes, falado: falados.join(" ") };
}

// ───────────── Pausas e montagem do roteiro inteiro ─────────────
export const PAUSA_TAG = (s: number) => `<break time="${s.toFixed(2)}s" />`;

export interface FalaMontada {
  /** Palavras da tela de cada parte: [gancho, ...cenas, fechamento]. */
  partes: { tela: string[]; classes: ClassePalavra[] }[];
  /** Mapa (palavras faladas por palavra da tela) de tudo, na ordem. */
  mapa: number[];
  /** Texto que vai para a voz (com pausas). */
  falado: string;
  /** Quantas pausas foram inseridas. */
  pausas: number;
  /** Texto falado de cada parte (gancho, cenas, fechamento), com a mesma pontuação do `falado` inteiro. */
  falados: string[];
}

/**
 * Monta o texto falado do vídeo todo. Tira só o ponto final de cada parte (mantém ? e !, que dão a entonação) e junta com espaço.
 * `pausa` (s): antes do primeiro preço/nota/data de cada parte que não seja a primeira palavra; no máximo 4 por vídeo; 0 desliga.
 */
export function montarFala(partesTela: string[], dic: ItemPronuncia[] = [], pausa = 0, maxPausas = 4): FalaMontada {
  const partes: FalaMontada["partes"] = [];
  const mapa: number[] = [];
  const falados: string[] = [];
  let pausas = 0;
  for (const texto of partesTela) {
    const limpo = texto.trim().replace(/[.…]+$/, "");
    const c = paraFala(limpo, dic);
    const palavrasFaladas = c.falado.split(/\s+/).filter(Boolean);
    let posFalada = 0;
    const saida: string[] = [];
    let jaPausou = false;
    c.tela.forEach((_, k) => {
      const n = c.mapa[k];
      const trecho = palavrasFaladas.slice(posFalada, posFalada + n);
      posFalada += n;
      if (pausa > 0 && !jaPausou && k > 0 && pausas < maxPausas && ["preco", "nota", "data"].includes(c.classes[k])) {
        saida.push(PAUSA_TAG(pausa));
        pausas++;
        jaPausou = true;
      }
      saida.push(...trecho);
    });
    partes.push({ tela: c.tela, classes: c.classes });
    mapa.push(...c.mapa);
    const fala = saida.join(" ");
    falados.push(/[?!]$/.test(fala) ? fala : `${fala}.`);
  }
  return { partes, mapa, falado: falados.join(" "), pausas, falados };
}

// ───────────── Caminho de volta: palavras faladas com tempo → palavras da tela ─────────────
export interface PalavraTempo {
  texto: string;
  ini: number;
  fim: number;
}

/** Remove da lista de palavras da voz as que formam tags SSML (`<break time="0.25s" />`), caso o alinhamento as devolva. */
export function semTags<T extends { texto: string }>(palavras: T[]): T[] {
  const out: T[] = [];
  let dentro = false;
  for (const p of palavras) {
    if (!dentro && p.texto.startsWith("<")) {
      dentro = !p.texto.includes(">");
      continue;
    }
    if (dentro) {
      if (p.texto.includes(">")) dentro = false;
      continue;
    }
    out.push(p);
  }
  return out;
}

/** Junta as palavras faladas (com tempo) nas palavras da tela segundo o mapa. null se as contas não baterem. */
export function remapear(faladas: PalavraTempo[], mapa: number[], tela: string[]): PalavraTempo[] | null {
  if (faladas.length !== mapa.reduce((a, b) => a + b, 0) || mapa.length !== tela.length) return null;
  const out: PalavraTempo[] = [];
  let pos = 0;
  mapa.forEach((n, k) => {
    const grupo = faladas.slice(pos, pos + n);
    pos += n;
    if (!grupo.length) return;
    out.push({ texto: tela[k], ini: grupo[0].ini, fim: grupo[grupo.length - 1].fim });
  });
  return out;
}
