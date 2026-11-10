import { Form, Link } from "react-router";
import type { Route } from "./+types/search";
import { PostRow } from "~/components/cards";
import { SectionTitle } from "~/components/ui";
import { searchGames, searchPosts } from "~/lib/content.server";
import { seo } from "~/lib/seo";

export async function loader({ request }: Route.LoaderArgs) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  const [posts, games] = q ? await Promise.all([searchPosts(q), searchGames(q)]) : [[], []];
  return { q, posts, games };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return seo({ title: loaderData?.q ? `Busca: ${loaderData.q}` : "Buscar", path: "/busca", noindex: true });
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { q, posts, games } = loaderData;
  const total = posts.length + games.length;
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 pt-10 sm:px-6">
      <div className="flex flex-col gap-5">
        <SectionTitle as="h1" size="xl">
          Buscar
        </SectionTitle>
        <Form method="get" role="search" className="flex max-w-3xl">
          <label htmlFor="busca-pagina" className="sr-only">
            O que você procura?
          </label>
          <input
            id="busca-pagina"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Jogo, notícia, guia…"
            className="h-16 min-w-0 flex-1 border border-[#333] bg-transparent px-5 text-xl text-paper placeholder:text-muted"
          />
          <button type="submit" className="h-16 bg-acc px-6 font-mono text-sm font-bold text-ink hover:bg-paper">
            BUSCAR
          </button>
        </Form>
        {q && (
          <p className="font-mono text-sm text-muted" aria-live="polite">
            {total === 0 ? `NENHUM RESULTADO PARA "${q.toUpperCase()}"` : `${total} RESULTADO${total > 1 ? "S" : ""} PARA "${q.toUpperCase()}"`}
          </p>
        )}
      </div>

      {games.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs font-semibold text-acc">JOGOS</h2>
          <div className="flex flex-wrap gap-2">
            {games.map((g) => (
              <Link key={g.slug} to={`/jogos/${g.slug}`} className="border border-line px-4 py-3 font-display text-2xl uppercase leading-none hover:border-acc hover:text-acc">
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="flex flex-col">
          <h2 className="font-mono text-xs font-semibold text-acc">MATÉRIAS</h2>
          {posts.map((p) => (
            <PostRow key={p.url} post={p} />
          ))}
        </section>
      )}

      {q && total === 0 && (
        <p className="max-w-xl text-lg text-body">
          Tente outras palavras ou navegue pelas <Link to="/noticias" className="text-acc underline">últimas notícias</Link>.
        </p>
      )}
    </main>
  );
}
