import { getAllPosts, postUrl } from "~/lib/content.server";
import { absoluteUrl, SITE, sectionBySlug } from "~/lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function loader() {
  const posts = (await getAllPosts()).slice(0, 50);
  const items = posts
    .map((p) => {
      const url = absoluteUrl(postUrl(p));
      const img = p.image?.src ? absoluteUrl(p.image.src) : null;
      const mime = img ? (/\.png(\?|$)/i.test(img) ? "image/png" : /\.jpe?g(\?|$)/i.test(img) ? "image/jpeg" : "image/webp") : "";
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <dc:creator>${esc(p.author)}</dc:creator>
      <description>${esc(p.metaDescription ?? p.excerpt)}</description>${img ? `
      <media:content url="${esc(img)}" medium="image" type="${mime}"/>` : ""}
      <category>${esc(p.tag ?? sectionBySlug(p.section)?.label ?? "")}</category>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(SITE.name)}</title>
    <link>${SITE.url}</link>
    <description>${esc(SITE.description)}</description>
    <language>pt-br</language>
    <atom:link href="${absoluteUrl("/rss.xml")}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900" },
  });
}
