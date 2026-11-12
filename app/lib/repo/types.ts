// Contrato das fontes de dados. Há duas implementações:
// - mock.server.ts: dados de exemplo em memória (desenvolvimento, sem banco);
// - mysql.server.ts: MySQL da Hostinger (produção).
// content.server.ts escolhe a fonte e cuida da formatação para as telas.
import type { PlatformSlug, SectionSlug } from "../site";
import type { FreeGame, Game, Post } from "../types";

export interface PostFilter {
  section?: SectionSlug;
  platform?: PlatformSlug;
  gameSlug?: string;
  exclude?: string[];
}

export type RawFreeGame = Omit<FreeGame, "untilLabel" | "daysLeft" | "hoursLeft" | "untilTime" | "startsLabel">;

export interface Repo {
  findPosts(filter: PostFilter, offset: number, limit: number): Promise<{ items: Post[]; total: number }>;
  findFeatured(): Promise<Post | null>;
  findMostRead(limit: number, exclude: string[]): Promise<Post[]>;
  findPost(section: string, slug: string): Promise<Post | null>;
  /** Todos os posts publicados (sitemap, RSS). */
  allPosts(limit?: number): Promise<Post[]>;
  /** Busca: todos os termos precisam aparecer (sem diferenciar acentos). */
  searchPosts(terms: string[], limit: number): Promise<Post[]>;
  countPostsSince(isoDate: string): Promise<number>;
  sectionStats(): Promise<{ section: SectionSlug; total: number; latest: string | null }[]>;

  findGame(slug: string): Promise<Game | null>;
  /** Jogos com página indexável (têm matéria publicada): sitemap. */
  allGames(): Promise<Game[]>;
  searchGames(query: string, limit: number): Promise<Game[]>;
  /** Jogos com lançamento entre as datas (AAAA-MM-DD, inclusive), em ordem de data. */
  findReleases(from: string, to: string, platform?: PlatformSlug): Promise<Game[]>;

  /** Ofertas grátis ainda válidas. */
  freeGames(nowIso: string): Promise<RawFreeGame[]>;
  /** Ofertas grátis já anunciadas que ainda não começaram (ex.: o próximo grátis da Epic). */
  upcomingFreeGames(nowIso: string): Promise<RawFreeGame[]>;
}
