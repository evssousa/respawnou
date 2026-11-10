import { type RouteConfig, index, route } from "@react-router/dev/routes";

// Editorias de posts: cada uma tem listagem (/noticias) e página de post (/noticias/:slug).
// Mantenha em sincronia com SECTIONS em app/lib/site.ts.
const SECTION_SLUGS = ["noticias", "artigos", "reviews", "guias", "promocoes"] as const;

export default [
  index("routes/home.tsx"),
  ...SECTION_SLUGS.flatMap((slug) => [
    route(slug, "routes/section.tsx", { id: `section-${slug}` }),
    route(`${slug}/:slug`, "routes/post.tsx", { id: `post-${slug}` }),
  ]),
  route("lancamentos", "routes/releases.tsx"),
  route("jogos/:slug", "routes/game.tsx"),
  route("plataforma/:slug", "routes/platform.tsx"),
  route("busca", "routes/search.tsx"),
  route("sobre", "routes/about.tsx"),
  route("contato", "routes/contact.tsx"),
  route("privacidade", "routes/privacy.tsx"),

  // Recursos para buscadores e leitores de feed.
  route("sitemap.xml", "routes/sitemap.ts"),
  route("rss.xml", "routes/rss.ts"),
  route("robots.txt", "routes/robots.ts"),

  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
