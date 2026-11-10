import type { PlatformSlug, SectionSlug } from "./site";

/** Variações da arte provisória de capa (enquanto não houver imagem real). */
export type ArtVariant = "a" | "b" | "c" | "d";

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string };

export interface Review {
  /** Nota de 0 a 10. */
  score: number;
  verdict: string;
  pros: string[];
  cons: string[];
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
  image?: { src: string; alt: string };
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
}

export interface FreeGame {
  name: string;
  store: string;
  platform: string;
  until: string; // ISO
  untilLabel: string;
  url: string;
}
