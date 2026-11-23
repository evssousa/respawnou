// "Link na bio" do Instagram (/links): as matérias citadas nos posts e as mais recentes do site. noindex, fora do sitemap e dos menus.
import { Link } from "react-router";
import type { Route } from "./+types/links";
import { PostRow } from "~/components/cards";
import { SectionTitle } from "~/components/ui";
import { getPost, listPosts } from "~/lib/content.server";
import { hasDatabase, query } from "~/lib/db.server";
import { seo } from "~/lib/seo";
import { SOCIAL } from "~/social/config";

export async function loader() {
  let citadas: Awaited<ReturnType<typeof getPost>>[] = [];
  if (hasDatabase()) {
    try {
      const rows = await query<{ section: string; slug: string }>(
        `SELECT p.section, p.slug FROM social_posts s JOIN posts p ON p.id = s.post_id
         WHERE s.kind = 'feed' AND s.status = 'published' AND p.status = 'published' ORDER BY s.published_at DESC LIMIT 20`,
      );
      citadas = await Promise.all(rows.map((r) => getPost(r.section, r.slug)));
    } catch {
      citadas = []; // tabela ainda não existe ou banco fora: mostra só os recentes
    }
  }
  const recentes = await listPosts({ perPage: 10 });
  return { citadas: citadas.filter((p): p is NonNullable<typeof p> => !!p), recentes: recentes.items };
}

export const meta = () => seo({ title: "Links", description: `Matérias citadas no Instagram do ${SOCIAL.site}.`, path: "/links", noindex: true });

const utm = (url: string) => `${url}${url.includes("?") ? "&" : "?"}${SOCIAL.utm}`;

export default function Links({ loaderData }: Route.ComponentProps) {
  const { citadas, recentes } = loaderData;
  return (
    <main id="conteudo" className="mx-auto flex max-w-3xl flex-col gap-12 px-4 pt-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs font-semibold text-acc">&gt; LINK NA BIO · @{SOCIAL.handle}</p>
        <h1 className="font-display text-6xl uppercase leading-[0.9]">
          {SOCIAL.marca}
          <span className="text-acc">.</span>
        </h1>
        <p className="text-lg text-body">Matérias citadas no Instagram e as novidades mais recentes.</p>
        <Link to="/" className="font-mono text-xs font-bold text-acc underline">
          IR PARA O SITE →
        </Link>
      </header>
      {citadas.length > 0 && (
        <section className="flex flex-col">
          <SectionTitle code="CITADAS NO INSTAGRAM" accent="no Instagram">
            Matérias
          </SectionTitle>
          {citadas.map((p) => (
            <PostRow key={p.url} post={{ ...p, url: utm(p.url) }} />
          ))}
        </section>
      )}
      <section className="flex flex-col">
        <SectionTitle code="MAIS RECENTES" accent="do site">
          Últimas
        </SectionTitle>
        {recentes.map((p) => (
          <PostRow key={p.url} post={{ ...p, url: utm(p.url) }} />
        ))}
      </section>
    </main>
  );
}
