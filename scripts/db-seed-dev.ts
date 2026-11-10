// Preenche um banco de DESENVOLVIMENTO com os dados de exemplo (fictícios) de mock-data.ts.
// Uso: npm run db:seed-dev
// Nunca rode em produção: apaga posts, jogos e jogos grátis antes de inserir.
import { MOCK_FREE_GAMES, MOCK_GAMES, MOCK_POSTS } from "../app/lib/mock-data.ts";
import { connect } from "./db-connect.ts";

if (process.env.NODE_ENV === "production") {
  console.error("db:seed-dev não roda com NODE_ENV=production.");
  process.exit(1);
}

const conn = await connect();
const dt = (iso: string) => iso.slice(0, 19).replace("T", " ");

await conn.query("SET FOREIGN_KEY_CHECKS = 0");
for (const t of ["feed_items", "posts", "games", "free_games"]) await conn.query(`DELETE FROM ${t}`);
await conn.query("SET FOREIGN_KEY_CHECKS = 1");

const gameIds = new Map<string, number>();
for (const g of MOCK_GAMES) {
  const [res] = await conn.query(
    "INSERT INTO games (slug, name, platforms, release_date, developer, publisher, genres, description, art) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [g.slug, g.name, JSON.stringify(g.platforms), g.releaseDate ?? null, g.developer, g.publisher, JSON.stringify(g.genres), g.description, g.art],
  );
  gameIds.set(g.slug, (res as { insertId: number }).insertId);
}

for (const p of MOCK_POSTS) {
  await conn.query(
    `INSERT INTO posts (section, slug, status, origin, title, excerpt, tag, platforms, game_id, author, read_minutes, art, image_url, image_alt,
      body, review, featured, views, source_name, source_url, published_at, updated_at)
     VALUES (?, ?, 'published', 'manual', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.section,
      p.slug,
      p.title,
      p.excerpt,
      p.tag ?? null,
      JSON.stringify(p.platforms),
      p.gameSlug ? (gameIds.get(p.gameSlug) ?? null) : null,
      p.author,
      p.readMinutes,
      p.art,
      p.image?.src ?? null,
      p.image?.alt ?? null,
      JSON.stringify(p.body),
      p.review ? JSON.stringify(p.review) : null,
      p.featured ? 1 : 0,
      p.views,
      p.source?.name ?? null,
      p.source?.url ?? null,
      dt(p.publishedAt),
      p.updatedAt ? dt(p.updatedAt) : null,
    ],
  );
}

for (const f of MOCK_FREE_GAMES) {
  const ends = f.until.length === 10 ? `${f.until} 23:59:59` : dt(f.until);
  await conn.query("INSERT INTO free_games (name, store, platform, url, ends_at) VALUES (?, ?, ?, ?, ?)", [f.name, f.store, f.platform, f.url, ends]);
}

console.log(`✓ ${MOCK_GAMES.length} jogos, ${MOCK_POSTS.length} posts e ${MOCK_FREE_GAMES.length} jogos grátis inseridos.`);
await conn.end();
