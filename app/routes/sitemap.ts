import { getAllGames, getAllPosts, postUrl } from "~/lib/content.server";
import { absoluteUrl, PLATFORMS, SECTIONS } from "~/lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function loader() {
  const [posts, games] = await Promise.all([getAllPosts(), getAllGames()]);
  const entries: { loc: string; lastmod?: string; changefreq?: string }[] = [
    { loc: "/", changefreq: "hourly" },
    ...SECTIONS.map((s) => ({ loc: `/${s.slug}`, changefreq: "hourly" })),
    { loc: "/lancamentos", changefreq: "daily" },
    ...PLATFORMS.map((p) => ({ loc: `/plataforma/${p.slug}`, changefreq: "daily" })),
    ...posts.map((p) => ({ loc: postUrl(p), lastmod: p.updatedAt ?? p.publishedAt })),
    ...games.map((g) => ({ loc: `/jogos/${g.slug}`, changefreq: "weekly" })),
    { loc: "/sobre" },
    { loc: "/contato" },
    { loc: "/privacidade" },
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
