// Catálogo do Arcade (/arcade): jogos de passatempo próprios, infinitos, que rodam no navegador.
// O código de cada jogo fica em app/arcade/<slug>.ts e só é baixado na página dele.

export type ArcadeCategory = "acao" | "reflexo" | "classicos";

export const ARCADE_CATEGORIES: Record<ArcadeCategory, string> = {
  acao: "Ação",
  reflexo: "Reflexo",
  classicos: "Clássicos",
};

export interface ArcadeGame {
  slug: string;
  name: string;
  category: ArcadeCategory;
  /** Frase curta do card. */
  tagline: string;
  /** Meta description (até ~155 caracteres). */
  description: string;
  howTo: string[];
  controls: { device: string; text: string }[];
  /** Tamanho lógico do canvas (proporção da tela do jogo). */
  width: number;
  height: number;
  /** Como chamar o contador de partidas. */
  playsLabel: string;
}

export const ARCADE_GAMES: ArcadeGame[] = [
  {
    slug: "respawn",
    name: "Respawn",
    category: "acao",
    tagline: "Corra, pule, caia e volte. Quantas vezes for preciso.",
    description: "Jogue Respawn grátis no navegador: corredor infinito em pixel art. Pule blocos e buracos, desvie dos drones e bata seu recorde. Funciona no celular.",
    howTo: [
      "O personagem corre sozinho e a velocidade aumenta com a distância.",
      "Pule os blocos e os buracos no chão. Segure o pulo para saltar mais alto e solte cedo para um pulo curto.",
      "Drones vermelhos voam baixo: quem fica no chão passa por baixo, quem pula bate neles.",
      "Cada metro conta ponto. Caiu? Respawn na hora e tenta de novo.",
    ],
    controls: [
      { device: "Teclado", text: "Espaço, W ou seta para cima (segure para pular mais alto)" },
      { device: "Toque / mouse", text: "Toque na tela para pular (segure para pular mais alto)" },
    ],
    width: 640,
    height: 360,
    playsLabel: "Respawns",
  },
  {
    slug: "torre",
    name: "Torre",
    category: "reflexo",
    tagline: "Solte no tempo certo e suba sem limite.",
    description: "Jogue Torre grátis no navegador: empilhe blocos no tempo certo, acerte encaixes perfeitos e construa a torre mais alta que conseguir. Funciona no celular.",
    howTo: [
      "Um bloco passa de um lado para o outro em cima da torre. Solte para encaixar.",
      "O que ficar para fora é cortado, e o próximo bloco vem com a largura que sobrou.",
      "Encaixe perfeito não perde nada. Três perfeitos seguidos devolvem um pedaço da largura.",
      "Cada andar vale um ponto e os blocos ficam mais rápidos conforme a torre cresce. Errou o bloco inteiro, acabou.",
    ],
    controls: [
      { device: "Teclado", text: "Espaço, Enter ou seta para baixo" },
      { device: "Toque / mouse", text: "Toque na tela para soltar o bloco" },
    ],
    width: 360,
    height: 640,
    playsLabel: "Torres",
  },
  {
    slug: "quebra-pixel",
    name: "Quebra-Pixel",
    category: "classicos",
    tagline: "Raquete, bolinha e fases que nunca acabam.",
    description: "Jogue Quebra-Pixel grátis no navegador: rebata a bolinha, quebre todos os blocos e avance por fases infinitas, cada vez mais rápidas. Funciona no celular.",
    howTo: [
      "Rebata a bolinha com a raquete e quebre todos os blocos para passar de fase.",
      "Onde a bolinha bate na raquete define o ângulo: na ponta, sai mais inclinada.",
      "Blocos laranja aguentam duas batidas e os vermelhos, três. A cada fase a bola fica mais rápida.",
      "Você tem 3 vidas e ganha uma a cada três fases (até 5).",
    ],
    controls: [
      { device: "Teclado", text: "Setas ou A/D para mover, Espaço para lançar" },
      { device: "Toque / mouse", text: "Arraste para mover a raquete e toque para lançar" },
    ],
    width: 360,
    height: 600,
    playsLabel: "Partidas",
  },
];

export const arcadeGame = (slug: string) => ARCADE_GAMES.find((g) => g.slug === slug);

/** Recorde e partidas ficam só no navegador da pessoa (sem conta, sem servidor). */
export interface ArcadeRecord {
  best: number;
  plays: number;
}

const key = (slug: string) => `respawnou:arcade:${slug}`;

export function readRecord(slug: string): ArcadeRecord {
  try {
    const r = JSON.parse(localStorage.getItem(key(slug)) ?? "null");
    if (r && typeof r.best === "number") return { best: r.best, plays: Number(r.plays) || 0 };
  } catch {}
  return { best: 0, plays: 0 };
}

export function saveRecord(slug: string, rec: ArcadeRecord) {
  try {
    localStorage.setItem(key(slug), JSON.stringify(rec));
  } catch {}
}
