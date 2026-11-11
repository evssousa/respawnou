import type { PlatformSlug, SectionSlug } from "./site";

/** Variações da arte provisória de capa (enquanto não houver imagem real). */
export type ArtVariant = "a" | "b" | "c" | "d";

/**
 * Blocos do corpo. Em p, ul e quote o texto aceita links no formato [texto](url):
 * url começando com "/" é link interno; o resto abre em outra aba.
 */
export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "img"; src: string; alt: string; width?: number; height?: number; credit?: string }
  | { type: "video"; youtubeId: string; title: string };

/** Uma análise publicada por um veículo da imprensa especializada. */
export interface CriticReview {
  outlet: string;
  /** Nota normalizada para 0 a 10. */
  score: number;
  url: string;
}

/**
 * Consenso da crítica: o Respawnou não publica reviews próprias.
 * A nota é a média das análises da imprensa, listadas em `critics`.
 */
export interface Review {
  /** Média das notas da crítica, de 0 a 10 (uma casa decimal). */
  score: number;
  /** Resumo do consenso em uma frase. */
  verdict: string;
  /** Pontos mais elogiados pela crítica. */
  pros: string[];
  /** Pontos mais criticados. */
  cons: string[];
  critics: CriticReview[];
}

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  section: SectionSlug;
  /** Rótulo opcional que substitui o da seção no card (ex.: "Lista", "Grátis"). */
  tag?: string;
  platforms: PlatformSlug[];
  gameSlug?: string;
  publishedAt: string; // ISO
  updatedAt?: string; // ISO
  author: string;
  readMinutes: number;
  art: ArtVariant;
  image?: { src: string; alt: string; credit?: string };
  /** SEO: descrição para o Google (120–160 caracteres); sem ela, usa o excerpt. */
  metaDescription?: string;
  focusKeyword?: string;
  tags?: string[];
  body: Block[];
  review?: Review;
  featured?: boolean;
  views: number;
  source?: { name: string; url: string };
}

/** Post como chega nos componentes: com textos de data já calculados no servidor. */
export interface PostView extends Omit<Post, "body"> {
  url: string;
  kicker: string;
  ago: string;
  dateLabel: string;
  /** Horário de publicação, ex.: "09:12". */
  timeLabel: string;
}

export interface Game {
  slug: string;
  name: string;
  platforms: PlatformSlug[];
  releaseDate?: string; // ISO (dia)
  developer: string;
  publisher: string;
  genres: string[];
  description: string;
  art: ArtVariant;
}

export interface Release {
  game: Game;
  date: string;
  day: string;
  monthShort: string;
  weekday: string;
  /** Dias até o lançamento (0 = hoje). */
  daysLeft: number;
}

export interface FreeGame {
  name: string;
  store: string;
  platform: string;
  until: string; // ISO
  untilLabel: string;
  /** Dias até a oferta acabar (0 = acaba hoje). */
  daysLeft: number;
  /** Página da oferta na loja (ou o redirecionamento da GamerPower). */
  url: string;
  /** Arte do jogo servida pelo site (/media/...). */
  image?: string | null;
  /** Preço normal ("R$ 47,49" na Epic, "$24.99" na GamerPower). */
  worth?: string | null;
  /** epic | gamerpower | manual — a GamerPower exige crédito. */
  source?: string;
  /** Matéria do Respawnou sobre a oferta, se houver. */
  postUrl?: string | null;
  /** Início (só nas ofertas que ainda vão começar). */
  startsAt?: string | null;
  startsLabel?: string | null;
}
