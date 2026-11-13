// Catálogo do Arcade (/arcade): jogos de passatempo próprios, infinitos, que rodam no navegador.
// O código de cada jogo fica em app/arcade/<slug>.ts e só é baixado na página dele.

export type ArcadeCategory = "acao" | "reflexo" | "classicos" | "quebra-cabeca";

export const ARCADE_CATEGORIES: Record<ArcadeCategory, string> = {
  acao: "Ação",
  reflexo: "Reflexo",
  classicos: "Clássicos",
  "quebra-cabeca": "Quebra-cabeça",
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
  {
    slug: "meteoros",
    name: "Chuva de Meteoros",
    category: "acao",
    tagline: "A nave atira sozinha. Você só precisa sobreviver.",
    description: "Jogue Chuva de Meteoros grátis no navegador: pilote a nave, destrua meteoros que se partem, pegue tiro triplo e escudo e sobreviva o máximo que der.",
    howTo: [
      "A nave atira sem parar. Mova para mirar e desviar dos meteoros.",
      "Meteoros grandes aguentam vários tiros e se partem em dois menores ao quebrar.",
      "Pegue os itens que caem: 3 é tiro triplo por 8 segundos e E é um escudo que aguenta uma batida.",
      "Você tem 3 vidas; depois de uma batida, a nave pisca e fica protegida por um instante. A chuva aperta com o tempo.",
    ],
    controls: [
      { device: "Teclado", text: "Setas ou WASD para mover" },
      { device: "Toque", text: "Arraste o dedo na tela (a nave fica um pouco acima do dedo)" },
      { device: "Mouse", text: "A nave segue o ponteiro" },
    ],
    width: 360,
    height: 600,
    playsLabel: "Voos",
  },
  {
    slug: "cabo-de-forca",
    name: "Cabo de Força",
    category: "classicos",
    tagline: "Pegue as pilhas sem se enrolar no próprio cabo.",
    description: "Jogue Cabo de Força grátis no navegador: guie o cabo, pegue pilhas para crescer e não bata na parede nem em você mesmo. Estilo cobrinha, funciona no celular.",
    howTo: [
      "O cabo anda sozinho. Você escolhe para onde ele vira.",
      "Cada pilha verde faz o cabo crescer e vale 10 pontos. O ritmo acelera um pouco a cada pilha.",
      "A cada 5 pilhas aparece uma pilha dourada que vale 50 pontos, mas some em 6 segundos.",
      "Bateu na parede ou no próprio cabo, acabou.",
    ],
    controls: [
      { device: "Teclado", text: "Setas ou WASD" },
      { device: "Toque", text: "Deslize o dedo na direção desejada, ou toque do lado para onde quer virar" },
    ],
    width: 360,
    height: 400,
    playsLabel: "Partidas",
  },
  {
    slug: "trinca",
    name: "Trinca",
    category: "quebra-cabeca",
    tagline: "Alinhe três iguais antes que o relógio zere.",
    description: "Jogue Trinca grátis no navegador: troque peças vizinhas, alinhe 3 ou mais iguais, faça cascatas e ganhe tempo contra um relógio cada vez mais rápido.",
    howTo: [
      "Troque duas peças vizinhas para formar uma linha de 3 ou mais iguais, na horizontal ou na vertical.",
      "Cada peça quebrada devolve meio segundo ao relógio. Linhas de 4 ou 5 valem pontos extras.",
      "Quando as peças que caem formam novas linhas, é cascata: os pontos são multiplicados.",
      "O relógio corre cada vez mais rápido. Ficou parado? Depois de alguns segundos o jogo mostra uma dica.",
    ],
    controls: [
      { device: "Toque / mouse", text: "Toque numa peça e depois na vizinha, ou arraste a peça para o lado" },
      { device: "Teclado", text: "Setas movem o cursor; Espaço seleciona; com uma peça selecionada, a seta troca" },
    ],
    width: 360,
    height: 468,
    playsLabel: "Partidas",
  },
  {
    slug: "mira",
    name: "Mira",
    category: "reflexo",
    tagline: "Acerte os alvos antes que eles sumam.",
    description: "Jogue Mira grátis no navegador: acerte os alvos antes que encolham e sumam, mire no centro, faça sequências e fuja das bombas. Teste de reflexo no PC e no celular.",
    howTo: [
      "Alvos aparecem pela tela e vão encolhendo. Clique ou toque antes que sumam.",
      "Acertar o centro vale mais (NA MOSCA). A cada 5 acertos seguidos o multiplicador sobe.",
      "O alvo dourado vale 50 pontos, mas é menor e some mais rápido. O vermelho com X é uma bomba: não clique.",
      "Cada alvo que some tira uma vida (são 3). Errar o tiro não tira vida, mas zera a sequência.",
    ],
    controls: [
      { device: "Mouse", text: "Clique nos alvos" },
      { device: "Toque", text: "Toque nos alvos" },
    ],
    width: 480,
    height: 520,
    playsLabel: "Partidas",
  },
  {
    slug: "memoria",
    name: "Memória",
    category: "quebra-cabeca",
    tagline: "Ache os pares. Cada fase tem mais cartas.",
    description: "Jogue Memória grátis no navegador: ache os pares de ícones de games em fases cada vez maiores, de 6 a 36 cartas. Jogo da memória para PC e celular.",
    howTo: [
      "Vire duas cartas por vez. Se forem iguais, o par fica aberto e você ganha pontos.",
      "Achou todos os pares, passa de fase: cada fase tem mais cartas (de 6 até 36).",
      "Errar só custa vida quando dava para acertar: se o par da primeira carta já tinha aparecido, ou se a segunda já era conhecida.",
      "Você começa com 4 vidas e ganha uma a cada fase completa (máximo 6).",
    ],
    controls: [
      { device: "Toque / mouse", text: "Toque nas cartas para virar" },
      { device: "Teclado", text: "Setas movem o cursor, Espaço ou Enter vira a carta" },
    ],
    width: 360,
    height: 480,
    playsLabel: "Partidas",
  },
  {
    slug: "campo-minado",
    name: "Campo Minado",
    category: "quebra-cabeca",
    tagline: "Limpe o campo e encare outro, com mais minas.",
    description: "Jogue Campo Minado grátis no navegador, em versão infinita: limpou o campo, vem outro com mais minas. Bandeira com toque longo no celular.",
    howTo: [
      "Abra as casas sem minas. O número mostra quantas minas existem nas 8 casas ao redor.",
      "Marque as minas com bandeira. Tocar num número que já tem todas as bandeiras ao redor abre os vizinhos de uma vez.",
      "O primeiro toque de cada campo nunca é mina. Limpou tudo, vem um campo novo com mais minas (de 10 até 32).",
      "Cada casa aberta vale pontos (mais nas fases altas) e cada campo limpo dá bônus. Abriu uma mina, acabou.",
    ],
    controls: [
      { device: "Mouse", text: "Clique abre; botão direito marca bandeira" },
      { device: "Toque", text: "Toque abre; toque longo marca bandeira (ou ligue o modo BANDEIRA no canto)" },
      { device: "Teclado", text: "Setas movem, Espaço abre, F marca bandeira" },
    ],
    width: 360,
    height: 528,
    playsLabel: "Partidas",
  },
  {
    slug: "paciencia",
    name: "Paciência",
    category: "classicos",
    tagline: "O clássico das cartas, com mãos sem fim.",
    description: "Jogue Paciência grátis no navegador: o clássico jogo de cartas (Klondike) com toque inteligente, arrastar e soltar e pontos que acumulam a cada mão vencida.",
    howTo: [
      "Monte as quatro pilhas de cima por naipe, do Ás ao Rei.",
      "Nas colunas, empilhe em ordem decrescente alternando vermelho e preto. Coluna vazia só aceita Rei.",
      "Toque no monte para virar uma carta. Quando ele acaba, toque de novo para recomeçar o descarte.",
      "Toque numa carta e ela vai sozinha para o melhor lugar, ou arraste. Mão completa vale 500 pontos e já vem outra; os pontos acumulam até você tocar em ENCERRAR.",
    ],
    controls: [
      { device: "Toque / mouse", text: "Toque para mover sozinho, ou arraste e solte" },
      { device: "Encerrar", text: "Toque duas vezes em ENCERRAR para fechar a pontuação" },
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
