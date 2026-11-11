// Fonte de dados de exemplo (em memória). Usada quando não há banco configurado.
import { MOCK_FREE_GAMES, MOCK_GAMES, MOCK_POSTS } from "../mock-data";
import { normalize } from "../format";
import { SECTIONS } from "../site";
import type { Post } from "../types";
import type { PostFilter, Repo } from "./types";

const byDateDesc = (a: Post, b: Post) => b.publishedAt.localeCompare(a.publishedAt);

const matches = (p: Post, f: PostFilter) =>
  (!f.section || p.section === f.section) &&
  (!f.platform || p.platforms.includes(f.platform)) &&
  (!f.gameSlug || p.gameSlug === f.gameSlug) &&
  !(f.exclude ?? []).includes(p.slug);

export const mockRepo: Repo = {
  async findPosts(filter, offset, limit) {
    const all = MOCK_POSTS.filter((p) => matches(p, filter)).sort(byDateDesc);
    return { items: all.slice(offset, offset + limit), total: all.length };
  },

  async findFeatured() {
    const sorted = [...MOCK_POSTS].sort(byDateDesc);
    return sorted.find((p) => p.featured) ?? sorted[0] ?? null;
  },

  async findMostRead(limit, exclude) {
    return MOCK_POSTS.filter((p) => !exclude.includes(p.slug))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  },

  async findPost(section, slug) {
    return MOCK_POSTS.find((p) => p.section === section && p.slug === slug) ?? null;
  },

  async allPosts(limit) {
    const sorted = [...MOCK_POSTS].sort(byDateDesc);
    return limit ? sorted.slice(0, limit) : sorted;
  },

  async searchPosts(terms, limit) {
    return MOCK_POSTS.filter((p) => {
      const game = p.gameSlug ? (MOCK_GAMES.find((g) => g.slug === p.gameSlug)?.name ?? "") : "";
      const text = normalize([p.title, p.excerpt, p.tag ?? "", game, ...p.body.map((b) => ("text" in b ? b.text : "items" in b ? b.items.join(" ") : ""))].join(" "));
      return terms.every((t) => text.includes(t));
    })
      .sort(byDateDesc)
      .slice(0, limit);
  },

  async countPostsSince(isoDate) {
    return MOCK_POSTS.filter((p) => p.publishedAt >= isoDate).length;
  },

  async sectionStats() {
    return SECTIONS.map((s) => {
      const posts = MOCK_POSTS.filter((p) => p.section === s.slug).sort(byDateDesc);
      return { section: s.slug, total: posts.length, latest: posts[0]?.publishedAt ?? null };
    });
  },

  async findGame(slug) {
    return MOCK_GAMES.find((g) => g.slug === slug) ?? null;
  },

  async allGames() {
    return MOCK_GAMES;
  },

  async searchGames(query, limit) {
    const q = normalize(query);
    return MOCK_GAMES.filter((g) => normalize(`${g.name} ${g.genres.join(" ")} ${g.developer}`).includes(q)).slice(0, limit);
  },

  async findReleases(from, to, platform) {
    return MOCK_GAMES.filter((g) => g.releaseDate && g.releaseDate >= from && g.releaseDate <= to && (!platform || g.platforms.includes(platform))).sort(
      (a, b) => a.releaseDate!.localeCompare(b.releaseDate!),
    );
  },

  async freeGames(nowIso) {
    return MOCK_FREE_GAMES.filter((f) => f.until >= nowIso.slice(0, 10));
  },
};
