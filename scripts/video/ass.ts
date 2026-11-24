// Alinhamento da voz → palavras com tempo → segmentos do vídeo → legenda ASS palavra por palavra. Funções puras (sem rede, sem disco).

export interface Alinhamento {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}
export interface Palavra {
  texto: string;
  ini: number;
  fim: number;
}
export interface Segmento {
  tipo: "abertura" | "cena" | "fechamento";
  /** Índice da cena no roteiro (abertura usa a da primeira cena). */
  cena: number;
  ini: number;
  fim: number;
}

/** Junta os caracteres do alinhamento em palavras (separadas por espaço/quebra), com início e fim de cada uma. */
export function palavrasDoAlinhamento(a: Alinhamento): Palavra[] {
  const out: Palavra[] = [];
  let txt = "";
  let ini = 0;
  let fim = 0;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (txt) out.push({ texto: txt, ini, fim });
      txt = "";
      return;
    }
    if (!txt) ini = a.character_start_times_seconds[i] ?? 0;
    txt += ch;
    fim = a.character_end_times_seconds[i] ?? fim;
  });
  if (txt) out.push({ texto: txt, ini, fim });
  return out;
}

export const contar = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/**
 * Corta o vídeo em segmentos pela contagem de palavras de cada parte do texto falado (gancho, cenas, fechamento).
 * A abertura vai de 0 até o início da 1ª cena; cada cena, até o início da seguinte; o fechamento, do início da fala dele
 * até o fim da voz + `folga` s.
 */
export function segmentos(palavras: Palavra[], gancho: string | number, falas: (string | number)[], fechamento: string | number, folga = 0.6): { segs: Segmento[]; total: number; inicios: number[]; inicioFechamento: number } {
  const cont = (x: string | number) => (typeof x === "number" ? x : contar(x));
  const nG = cont(gancho);
  const nF = falas.map(cont);
  const nC = cont(fechamento);
  const inicios: number[] = [];
  let k = nG;
  for (const n of nF) {
    inicios.push(palavras[k]?.ini ?? palavras[palavras.length - 1]?.fim ?? 0);
    k += n;
  }
  const inicioFechamento = palavras[k]?.ini ?? inicios[inicios.length - 1] ?? 0;
  const fimVoz = palavras[Math.min(palavras.length, k + nC) - 1]?.fim ?? inicioFechamento;
  const total = fimVoz + folga;
  const segs: Segmento[] = [{ tipo: "abertura", cena: 0, ini: 0, fim: inicios[0] ?? 0 }];
  inicios.forEach((t, i) => segs.push({ tipo: "cena", cena: i, ini: t, fim: inicios[i + 1] ?? inicioFechamento }));
  segs.push({ tipo: "fechamento", cena: nF.length - 1, ini: inicioFechamento, fim: total });
  return { segs: segs.filter((s) => s.fim - s.ini > 0.05), total, inicios, inicioFechamento };
}

export type ClasseLegenda = "comum" | "numero" | "nome";
export interface Classificada {
  classe: ClasseLegenda;
  /** Palavras seguidas do mesmo termo compartilham o grupo (não se separa um nome entre páginas se couber). */
  grupo?: number;
}

const semAcentoLow = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}$%#,./ªº]+/gu, " ")
    .trim()
    .toLowerCase();
const limpoTermo = (t: string) => semAcentoLow(t).replace(/^[,./]+|[,./]+$/g, "");

/**
 * Classifica cada palavra da tela: `numero` (algarismo, R$, %, #n, "grátis"), `nome` (faz parte de um termo da lista: destaques do
 * roteiro, nome do jogo...; casa por sequência de palavras, a mais longa primeiro; termo com mais de 4 palavras destaca só as 4
 * primeiras) ou `comum`.
 */
export function classificar(palavras: { texto: string }[], termos: string[] = []): Classificada[] {
  const alvos = termos
    .map((t) => limpoTermo(t).split(/\s+/).filter(Boolean).slice(0, 4))
    .filter((t) => t.length)
    .sort((a, b) => b.length - a.length);
  const norm = palavras.map((p) => limpoTermo(p.texto.replace(/\u00a0/g, " ")));
  const out: Classificada[] = palavras.map((p) => ({ classe: /\d|^R\$|%|^#\d|^gr[áa]tis/i.test(p.texto) ? "numero" : "comum" }));
  let g = 0;
  for (let i = 0; i < palavras.length; i++) {
    if (out[i].grupo !== undefined) continue;
    for (const alvo of alvos) {
      // a palavra da tela pode ser várias palavras ligadas por espaço duro ("Game Pass"): compara a primeira com o início do alvo
      const pedacos = norm[i].split(/\s+/).filter(Boolean);
      const cand = pedacos.length > 1 ? pedacos : norm.slice(i, i + alvo.length);
      if (pedacos.length > 1) {
        if (alvo.length === pedacos.length && alvo.every((x, k) => x === pedacos[k])) {
          out[i] = { classe: "nome", grupo: g++ };
          break;
        }
        continue;
      }
      if (cand.length === alvo.length && cand.every((x, k) => x === alvo[k])) {
        for (let k = 0; k < alvo.length; k++) out[i + k] = { classe: "nome", grupo: g };
        g++;
        break;
      }
    }
  }
  return out;
}

/**
 * Páginas de até 4 palavras ou 30 caracteres; a página fecha em pontuação. Um número com ≥ 2 palavras na página já aberta abre a
 * página seguinte (mais visível); palavras do mesmo nome não se separam por contagem (só se passarem de 30 caracteres).
 */
export function paginas<T extends { texto: string }>(palavras: T[], classes: Classificada[] = [], maxPalavras = 4, maxChars = 30): T[][] {
  const out: T[][] = [];
  let atual: T[] = [];
  let grupoAnterior: number | undefined;
  const tam = (l: T[]) => l.map((p) => p.texto).join(" ").length;
  palavras.forEach((p, i) => {
    const c = classes[i];
    const mesmoNome = c?.grupo !== undefined && c.grupo === grupoAnterior;
    const estourou = atual.length && ((!mesmoNome && atual.length >= maxPalavras) || tam([...atual, p]) > maxChars);
    if (estourou || (atual.length >= 2 && c?.classe === "numero")) {
      out.push(atual);
      atual = [];
    }
    atual.push(p);
    grupoAnterior = c?.grupo;
    if (/[.!?…,;:]$/.test(p.texto)) {
      out.push(atual);
      atual = [];
      grupoAnterior = undefined;
    }
  });
  if (atual.length) out.push(atual);
  return out;
}

const hms = (s: number) => {
  const cs = Math.max(0, Math.round(s * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const seg = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(seg).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};

/** Cor "#rrggbb" → formato do ASS "&HAABBGGRR&" (alfa 0 = opaco). */
export function corAss(hex: string, alfa = 0): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)].map((x) => x.toUpperCase());
  return `&H${alfa.toString(16).toUpperCase().padStart(2, "0")}${b}${g}${r}&`;
}

const limpa = (t: string) => t.replace(/[{}\\]/g, "").toLocaleUpperCase("pt-BR").replace(/\u00a0/g, "\\h"); // espaço duro vira \h no ASS

/**
 * Arquivo ASS (1080×1920): um evento por palavra mostrando a página inteira; só as palavras das cenas (sem gancho e sem
 * fechamento). Sem sobreposição de tempo entre eventos. Hierarquia: número (âmbar, maior) > nome de jogo (verde) > palavra da vez
 * (verde com pulo) > resto (branco).
 */
export function gerarAss(
  palavrasCenas: Palavra[],
  opts: { margemV?: number; creditos?: { ini: number; fim: number; texto: string }[]; cores?: { texto: string; destaque: string; contorno: string; alerta?: string }; fonte?: string; termos?: string[] } = {},
): string {
  const cor = { alerta: "#ffb020", ...(opts.cores ?? { texto: "#eef3ea", destaque: "#c8ff2e", contorno: "#060807" }) };
  const fonte = opts.fonte ?? "Anton";
  const est = (hex: string) => corAss(hex).slice(0, -1); // nas linhas Style a cor não leva o "&" final
  const classes = classificar(palavrasCenas, opts.termos ?? []);
  const pags = paginas(palavrasCenas, classes);
  const eventos: string[] = [];
  const indice = new Map<Palavra, number>(palavrasCenas.map((p, i) => [p, i]));
  // Tags de cada palavra (cada uma define cor, escala e contorno inteiros, para não herdar da anterior).
  const tag = (c: ClasseLegenda, vez: boolean) => {
    if (c === "numero") return vez ? `{\\c${corAss(cor.alerta)}\\bord8\\fscx138\\fscy138\\t(0,140,\\fscx112\\fscy112)}` : `{\\c${corAss(cor.alerta)}\\bord6\\fscx112\\fscy112}`;
    if (c === "nome") return vez ? `{\\c${corAss(cor.destaque)}\\bord6\\fscx118\\fscy118\\t(0,120,\\fscx100\\fscy100)}` : `{\\c${corAss(cor.destaque)}\\bord6\\fscx100\\fscy100}`;
    return vez ? `{\\c${corAss(cor.destaque)}\\bord6\\fscx122\\fscy122\\t(0,120,\\fscx100\\fscy100)}` : `{\\c${corAss(cor.texto)}\\bord6\\fscx100\\fscy100}`;
  };
  for (let pi = 0; pi < pags.length; pi++) {
    const pag = pags[pi];
    const proxima = pags[pi + 1]?.[0];
    pag.forEach((p, i) => {
      const ini = p.ini;
      const fim = i < pag.length - 1 ? pag[i + 1].ini : Math.min(p.fim + 0.25, proxima ? proxima.ini : p.fim + 0.25);
      if (fim - ini < 0.02) return;
      const texto = pag.map((x, j) => `${tag(classes[indice.get(x) ?? 0]?.classe ?? "comum", j === i)}${limpa(x.texto)}`).join(" ");
      eventos.push(`Dialogue: 0,${hms(ini)},${hms(fim)},Pal,,0,0,0,,${texto}`);
    });
  }
  // Crédito do material de terceiros, no canto de baixo, enquanto o trecho está na tela.
  for (const c of opts.creditos ?? []) eventos.push(`Dialogue: 1,${hms(c.ini)},${hms(c.fim)},Cred,,0,0,0,,${limpa(c.texto)}`);
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cred,${fonte},38,${est(cor.texto)},${est(cor.texto)},${est(cor.contorno)},&H00000000,0,0,0,0,100,100,2,0,1,3,0,1,48,48,330,1
Style: Pal,${fonte},92,${est(cor.texto)},${est(cor.texto)},${est(cor.contorno)},&H00000000,0,0,0,0,100,100,0,0,1,6,0,2,64,164,${opts.margemV ?? 480},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${eventos.join("\n")}
`;
}
