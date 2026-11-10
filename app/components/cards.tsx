import { Link } from "react-router";
import { formatScore } from "~/lib/format";
import type { FreeGame, PostView, Release } from "~/lib/types";
import { Art, Brackets, Badge, Kicker, SectionTitle, cx } from "./ui";

/** Nota da review em destaque. */
export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span className={cx("inline-flex h-14 w-14 shrink-0 items-center justify-center bg-alert font-display text-2xl text-ink", className)} aria-label={`Nota ${formatScore(score)}`}>
      {formatScore(score)}
    </span>
  );
}

/** Card padrão de grade: capa, kicker e título em Anton. */
export function PostCard({ post, size = "md" }: { post: PostView; size?: "md" | "sm" }) {
  return (
    <Link to={post.url} className="group flex flex-col gap-3">
      <Art variant={post.art} image={post.image} className="aspect-[4/3] w-full">
        {post.review && <ScoreBadge score={post.review.score} className="absolute right-0 bottom-0" />}
      </Art>
      <Kicker>
        {post.kicker} · {post.ago}
      </Kicker>
      <h3 className={cx("font-display uppercase leading-none transition-colors group-hover:text-alert", size === "md" ? "text-[28px]" : "text-2xl")}>
        {post.title}
      </h3>
    </Link>
  );
}

export function PostGrid({ posts }: { posts: PostView[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-6 gap-y-8">
      {posts.map((p) => (
        <PostCard key={p.url} post={p} />
      ))}
    </div>
  );
}

/** Linha de listagem com resumo (páginas de seção, busca). */
export function PostRow({ post }: { post: PostView }) {
  return (
    <Link to={post.url} className="group flex flex-col gap-5 border-b border-line-soft py-6 sm:flex-row sm:items-start">
      <Art variant={post.art} image={post.image} className="aspect-[16/10] w-full shrink-0 sm:w-72">
        {post.review && <ScoreBadge score={post.review.score} className="absolute right-0 bottom-0" />}
      </Art>
      <div className="flex min-w-0 flex-col gap-3">
        <Kicker>
          {post.kicker} · {post.ago}
        </Kicker>
        <h3 className="font-display text-3xl uppercase leading-none transition-colors group-hover:text-alert">{post.title}</h3>
        <p className="text-base leading-relaxed text-body">{post.excerpt}</p>
        <span className="font-mono text-xs text-muted">
          {post.author.toUpperCase()} · {post.readMinutes} MIN
        </span>
      </div>
    </Link>
  );
}

/** Destaque principal da home. */
export function HeroPost({ post }: { post: PostView }) {
  return (
    <Link to={post.url} className="group flex flex-wrap gap-8">
      <Art variant={post.art} image={post.image} eager className="min-h-[300px] flex-[1_1_560px] sm:min-h-[480px]">
        <Brackets label="ALVO TRAVADO" />
      </Art>
      <div className="flex min-w-0 flex-[1_1_420px] flex-col justify-end gap-5">
        <Badge>URGENTE · {post.kicker}</Badge>
        <h1 className="font-display text-5xl uppercase leading-[0.9] transition-colors group-hover:text-alert sm:text-[80px]">{post.title}</h1>
        <p className="text-lg leading-relaxed text-body">{post.excerpt}</p>
        <span className="font-mono text-xs text-muted">
          POR {post.author.toUpperCase()} · {post.ago} · {post.readMinutes} MIN
        </span>
      </div>
    </Link>
  );
}

export function MostRead({ posts, title = "Mais lidas" }: { posts: PostView[]; title?: string }) {
  return (
    <div>
      <h2 className="mb-1.5 border-t-[6px] border-alert pt-3 font-display text-[40px] uppercase leading-none">{title}</h2>
      <ol>
        {posts.map((p, i) => (
          <li key={p.url}>
            <Link to={p.url} className="group flex gap-4 border-b border-line-soft py-4">
              <span aria-hidden className="stroke-num w-9 shrink-0 font-display text-[54px] leading-[0.85]">
                {i + 1}
              </span>
              <h3 className="text-[17px] leading-snug font-semibold transition-colors group-hover:text-alert">{p.title}</h3>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function FreeGamesBox({ games }: { games: FreeGame[] }) {
  return (
    <div className="bg-paper p-6 text-ink">
      <h2 className="mb-3.5 font-display text-[34px] uppercase leading-none">Grátis agora</h2>
      {games.length === 0 && <p className="text-sm">Nenhum jogo grátis no momento. Volte amanhã!</p>}
      <ul>
        {games.map((g) => (
          <li key={g.name} className="border-b border-[#cfcac0] py-3 last:border-b-0">
            <a href={g.url} className="flex items-baseline justify-between gap-3 text-ink hover:text-alert-deep">
              <span className="font-bold">{g.name}</span>
              <span className="font-mono text-xs font-semibold text-alert-deep">{g.platform.toUpperCase()}</span>
            </a>
            <span className="font-mono text-[11px] text-[#57534b]">
              {g.store} · até {g.untilLabel}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReleasesStrip({ releases, labels }: { releases: Release[]; labels: Record<string, string> }) {
  return (
    <section className="flex flex-col gap-5">
      <SectionTitle accent="da semana" action={{ to: "/lancamentos", label: "CALENDÁRIO" }}>
        Lançamentos
      </SectionTitle>
      {releases.length === 0 ? (
        <p className="text-body">Nenhum lançamento previsto para os próximos dias.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] border-l border-line">
          {releases.map((r) => (
            <Link key={r.game.slug} to={`/jogos/${r.game.slug}`} className="group flex flex-col gap-1.5 border-r border-b border-line px-5 py-4 sm:border-b-0">
              <span className="font-display text-[64px] leading-[0.9] text-alert">{r.day}</span>
              <h3 className="font-display text-[26px] uppercase leading-none transition-colors group-hover:text-alert">{r.game.name}</h3>
              <span className="font-mono text-xs text-muted">
                {r.monthShort} · {r.game.platforms.map((p) => labels[p]).join(" · ").toUpperCase()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** Paginação simples via ?pagina= preservando os outros parâmetros. */
export function Pagination({ page, totalPages, pathname, search }: { page: number; totalPages: number; pathname: string; search: string }) {
  if (totalPages <= 1) return null;
  const href = (n: number) => {
    const params = new URLSearchParams(search);
    if (n === 1) params.delete("pagina");
    else params.set("pagina", String(n));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-4 border-t border-line pt-6 font-mono text-sm font-semibold">
      {page > 1 ? (
        <Link to={href(page - 1)} className="border border-line px-4 py-3 hover:border-alert hover:text-alert">
          ← ANTERIOR
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        PÁGINA {page} DE {totalPages}
      </span>
      {page < totalPages ? (
        <Link to={href(page + 1)} className="border border-line px-4 py-3 hover:border-alert hover:text-alert">
          PRÓXIMA →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
