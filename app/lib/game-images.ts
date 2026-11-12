// Imagens de jogos do IGDB em tamanhos menores (miniaturas leves). O IGDB serve o mesmo arquivo em
// vários tamanhos trocando o trecho "/t_<tamanho>/" do endereço.
import type { Game } from "./types";

const resize = (url: string, size: string) => url.replace(/\/t_[a-z0-9_]+\//, `/${size}/`);

/** Capa vertical para cards: cover_big (264×374); sem capa, a arte horizontal (recortada no card). */
export function gameThumb(game: Pick<Game, "cover" | "image" | "name">) {
  if (game.cover) return { src: resize(game.cover, "t_cover_big"), alt: `Capa de ${game.name}` };
  if (game.image) return { src: resize(game.image, "t_screenshot_med"), alt: `Arte de ${game.name}` };
  return null;
}
