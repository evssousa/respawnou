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
export function segmentos(palavras: Palavra[], gancho: string, falas: string[], fechamento: string, folga = 0.6): { segs: Segmento[]; total: number; inicios: number[]; inicioFechamento: number } {
  const nG = contar(gancho);
  const nF = falas.map(contar);
  const nC = contar(fechamento);
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

/** Páginas de até 4 palavras ou 30 caracteres; a página fecha em pontuação. */
export function paginas<T extends { texto: string }>(palavras: T[], maxPalavras = 4, maxChars = 30): T[][] {
  const out: T[][] = [];
  let atual: T[] = [];
  const tam = (l: T[]) => l.map((p) => p.texto).join(" ").length;
  for (const p of palavras) {
    if (atual.length && (atual.length >= maxPalavras || tam([...atual, p]) > maxChars)) {
      out.push(atual);
      atual = [];
    }
    atual.push(p);
    if (/[.!?…,;:]$/.test(p.texto)) {
      out.push(atual);
      atual = [];
    }
  }
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

const limpa = (t: string) => t.replace(/[{}\\]/g, "").toLocaleUpperCase("pt-BR");

/**
 * Arquivo ASS (1080×1920, Anton 84, contorno 6 px, palavra atual em verde-limão). Um evento por palavra mostrando a página
 * inteira; só as palavras das cenas (sem gancho e sem fechamento). Sem sobreposição de tempo entre eventos.
 */
export function gerarAss(palavrasCenas: Palavra[], opts: { margemV?: number; creditos?: { ini: number; fim: number; texto: string }[]; cores?: { texto: string; destaque: string; contorno: string }; fonte?: string } = {}): string {
  const cor = opts.cores ?? { texto: "#eef3ea", destaque: "#c8ff2e", contorno: "#060807" };
  const fonte = opts.fonte ?? "Anton";
  const est = (hex: string) => corAss(hex).slice(0, -1); // nas linhas Style a cor não leva o "&" final
  const pags = paginas(palavrasCenas);
  const eventos: string[] = [];
  // A palavra da vez acende em verde-limão e "pula" (cresce e volta ao normal em 0,12 s).
  const verde = `{\\c${corAss(cor.destaque)}\\fscx122\\fscy122\\t(0,120,\\fscx100\\fscy100)}`;
  const base = `{\\c${corAss(cor.texto)}\\fscx100\\fscy100}`;
  for (let pi = 0; pi < pags.length; pi++) {
    const pag = pags[pi];
    const proxima = pags[pi + 1]?.[0];
    pag.forEach((p, i) => {
      const ini = p.ini;
      const fim = i < pag.length - 1 ? pag[i + 1].ini : Math.min(p.fim + 0.25, proxima ? proxima.ini : p.fim + 0.25);
      if (fim - ini < 0.02) return;
      const texto = pag.map((x, j) => (j === i ? `${verde}${limpa(x.texto)}${base}` : limpa(x.texto))).join(" ");
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
