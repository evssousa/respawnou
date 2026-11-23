// Textos da ficha de jogo montados por código a partir dos dados (IGDB e Steam): perguntas frequentes, requisitos
// em linhas e a frase sobre o português. Nada vem do Gemini; sem dado, a pergunta simplesmente não aparece.
import { formatDate } from "./format";
import type { Game } from "./types";

export interface Faq {
  q: string;
  a: string;
}

/** "SO: Windows 10; Processador: i5; Memória: 8 GB" → linhas rótulo/valor (sem rótulo, o texto vira uma linha só). */
export function parseRequirements(text?: string | null): { label: string; value: string }[] {
  if (!text) return [];
  const rows: { label: string; value: string }[] = [];
  for (const part of text.split(/;\s+/)) {
    const m = part.match(/^([^:]{2,30}):\s*(.+)$/);
    if (m) rows.push({ label: m[1].trim(), value: m[2].trim() });
    else if (part.trim()) rows.push({ label: "", value: part.trim() });
  }
  return rows;
}

const find = (rows: { label: string; value: string }[], re: RegExp) => rows.find((r) => re.test(r.label))?.value;

const joinList = (items: string[]) => items.join(", ").replace(/, ([^,]*)$/, " e $1");

/** "interface e legendas em português do Brasil; o áudio é em outro idioma." (null = sem informação). */
export function languageText(game: Game): string | null {
  const l = game.languages;
  if (!l) return null;
  if (!l.interface && !l.legendas && !l.audio) return "A loja não lista português do Brasil entre os idiomas deste jogo.";
  const parts = [l.interface ? "interface" : "", l.legendas ? "legendas" : ""].filter(Boolean);
  const text = `Tem ${joinList(parts.length ? parts : ["texto"])} em português do Brasil`;
  return l.audio ? `${text} e áudio dublado.` : `${text}; o áudio é em outro idioma.`;
}

const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Datas por plataforma em texto: "PS5 em 5 de dezembro de 2026 e PC em 6 de dezembro de 2026". */
export function releaseText(game: Game): string | null {
  if (game.releases?.length) {
    const byDate = new Map<string, string[]>();
    for (const r of game.releases) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r.p]);
    const parts = [...byDate].map(([d, ps]) => `${joinList(ps)} em ${formatDate(d)}`);
    return joinList(parts);
  }
  if (game.releaseDate) return formatDate(game.releaseDate);
  if (game.releaseLabel && game.releaseLabel !== "sem data") return `previsto para ${game.releaseLabel}`;
  return null;
}

/** De 3 a 6 perguntas, só as que têm dado. A forma da pergunta varia pelo jogo, para não ser igual em todas as fichas. */
export function gameFaq(game: Game, upcoming: boolean): Faq[] {
  const out: Faq[] = [];
  const v = hash(game.slug) % 2;
  const when = releaseText(game);
  if (when) {
    const q = upcoming ? (v ? `Quando lança ${game.name}?` : `Qual a data de lançamento de ${game.name}?`) : v ? `Quando ${game.name} foi lançado?` : `Qual a data de lançamento de ${game.name}?`;
    out.push({ q, a: game.releases?.length ? `${game.name} ${upcoming ? "sai" : "saiu"}: ${when}.` : `${game.name} ${upcoming ? "tem lançamento" : "foi lançado"} ${game.releaseDate ? `em ${when}` : when}.` });
  }
  const names = new Set((game.releases ?? []).map((r) => r.p));
  if (names.has("PS5") && !names.has("PS4")) out.push({ q: `${game.name} vai sair para PS4?`, a: `Até agora, ${game.name} foi anunciado para PS5, mas não para PS4.` });
  else if (names.has("Switch 2") && !names.has("Switch")) out.push({ q: `${game.name} vai sair para Switch?`, a: `Até agora, ${game.name} foi anunciado para Switch 2, mas não para o Switch original.` });
  const min = parseRequirements(game.pcMin);
  if (min.length) {
    const cpu = find(min, /process/i);
    const ram = find(min, /mem[oó]ria/i);
    const gpu = find(min, /placa|gr[aá]fic|video|vídeo/i);
    const bits = [cpu && `processador ${cpu}`, ram && `${ram} de memória`, gpu && `placa de vídeo ${gpu}`].filter(Boolean) as string[];
    if (bits.length >= 2) out.push({ q: `Quais são os requisitos mínimos de ${game.name}?`, a: `Segundo a Steam, o mínimo pede ${joinList(bits)}.` });
  }
  const lang = languageText(game);
  if (lang) out.push({ q: `${game.name} tem legenda em português?`, a: lang });
  if (game.modes?.length) {
    const multi = game.modes.some((m) => /multi|cooperativ|mmo|battle|tela dividida/i.test(m));
    out.push({
      q: `${game.name} é multiplayer?`,
      a: multi ? `Sim. Modos listados: ${joinList(game.modes.map((m) => m.toLowerCase()))}.` : `Pelo que o IGDB lista, ${game.name} é só para um jogador.`,
    });
  }
  if (game.developer) {
    out.push({
      q: `Quem desenvolve ${game.name}?`,
      a: `${game.name} é desenvolvido por ${game.developer}${game.publisher && game.publisher !== game.developer ? ` e distribuído por ${game.publisher}` : ""}${game.franchise ? `, da franquia ${game.franchise}` : ""}.`,
    });
  }
  return out.slice(0, 6);
}
