import { getAllGames, getAllPosts, getAvailability, postUrl } from "~/lib/content.server";
import { absoluteUrl, DOC_PAGES } from "~/lib/site";
import { navFor, platformsFor } from "~/lib/availability";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function loader() {
  // Só páginas com conteúdo (editorias, plataformas e calendário vazios ficam de fora).
  const [posts, games, available] = await Promise.all([getAllPosts(), getAllGames(), getAvailability()]);
  const entries: { loc: string; lastmod?: string; changefreq?: string }[] = [
    { loc: "/", changefreq: "hourly" },
    ...navFor(available).map((n) => ({ loc: n.to, changefreq: n.to === "/lancamentos" ? "daily" : "hourly" })),
    ...platformsFor(available).map((p) => ({ loc: `/plataforma/${p.slug}`, changefreq: "daily" })),
    ...posts.map((p) => ({ loc: postUrl(p), lastmod: p.updatedAt ?? p.publishedAt })),
    ...games.map((g) => ({ loc: `/jogos/${g.slug}`, changefreq: "weekly" })),
    ...DOC_PAGES.map((d) => ({ loc: d.to, lastmod: d.updated, changefreq: "yearly" })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url><loc>${esc(absoluteUrl(e.loc))}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ""}</url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
