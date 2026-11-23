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
  // Arcade: jogos de passatempo próprios (catálogo em app/lib/arcade.ts).
  route("arcade", "routes/arcade.tsx"),
  route("arcade/:slug", "routes/arcade-game.tsx"),
  route("plataforma/:slug", "routes/platform.tsx"),
  route("busca", "routes/search.tsx"),
  route("sobre", "routes/about.tsx"),
  route("contato", "routes/contact.tsx"),
  route("privacidade", "routes/privacy.tsx"),
  route("termos", "routes/terms.tsx"),
  route("cookies", "routes/cookies.tsx"),
  route("politica-editorial", "routes/editorial.tsx"),
  route("redacao", "routes/team.tsx"),
  route("links", "routes/links.tsx"),
  route("autores/:slug", "routes/author.tsx"),
  route("como-avaliamos", "routes/review-policy.tsx"),
  route("anuncie", "routes/advertise.tsx"),
  route("faq", "routes/faq.tsx"),
  route("acessibilidade", "routes/accessibility.tsx"),
  route("mapa-do-site", "routes/sitemap-page.tsx"),

  // Recursos para buscadores e leitores de feed.
  route("sitemap.xml", "routes/sitemap.ts"),
  route("rss.xml", "routes/rss.ts"),
  route("robots.txt", "routes/robots.ts"),
  route("ads.txt", "routes/ads-txt.ts"),
  // Imagem de compartilhamento dos jogos do Arcade (fora de /arcade/ de propósito: sem anúncios ali).
  route("og/arcade/:file", "routes/og-arcade.ts"),
  // Recortes 4:3 e 1:1 da capa das matérias (Discover): /media-crop/4x3/2026/11/arquivo.webp
  route("media-crop/:ratio/*", "routes/media-crop.ts"),

  // Painel administrativo (só o dono; fora dos menus, noindex, Disallow no robots.txt).
  route("admin/login", "routes/admin/login.tsx"),
  route("admin/sair", "routes/admin/logout.ts"),
  route("admin", "routes/admin/layout.tsx", [
    index("routes/admin/home.tsx"),
    route("materias", "routes/admin/posts.tsx"),
    route("materias/nova", "routes/admin/post-new.tsx"),
    route("materias/:id", "routes/admin/post-edit.tsx"),
    route("upload", "routes/admin/upload.ts"),
    route("fila", "routes/admin/queue.tsx"),
    route("fontes", "routes/admin/feeds.tsx"),
    route("robo", "routes/admin/robot.tsx"),
    route("visitas", "routes/admin/visitas.tsx"),
    route("instagram", "routes/admin/instagram.tsx"),
    route("instagram/previa/:id", "routes/admin/instagram-previa.ts"),
    route("videos", "routes/admin/videos.tsx"),
    route("config", "routes/admin/settings.tsx"),
  ]),

  // Robô de postagem (Cron Job da Hostinger), protegido por CRON_TOKEN.
  route("api/cron/:job", "routes/cron.ts"),
  // Contador de visitas: o navegador avisa (POST) depois que cada página abre. /api/view é o endereço antigo (só responde 204).
  route("api/v", "routes/api.v.ts"),
  route("api/view", "routes/view.ts"),

  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
