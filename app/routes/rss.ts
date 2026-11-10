import { getAllPosts, postUrl } from "~/lib/content.server";
import { absoluteUrl, SITE, sectionBySlug } from "~/lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function loader() {
  const posts = (await getAllPosts()).slice(0, 30);
  const items = posts
    .map((p) => {
      const url = absoluteUrl(postUrl(p));
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(p.excerpt)}</description>
      <category>${esc(p.tag ?? sectionBySlug(p.section)?.label ?? "")}</category>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
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
