import { Link } from "react-router";
import { formatScore } from "~/lib/format";
import type { PostView } from "~/lib/types";
import { Art, Kicker, cx } from "./ui";

/** Nota da review em destaque. */
export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cx("chs inline-flex h-14 w-14 shrink-0 items-center justify-center bg-acc font-display text-2xl text-ink", className)}
      aria-label={`Nota ${formatScore(score)}`}
    >
      {formatScore(score)}
    </span>
  );
}

/** Card padrão de grade: painel chanfrado com capa, kicker e título em Anton. */
export function PostCard({ post, size = "md" }: { post: PostView; size?: "md" | "sm" }) {
  return (
    <Link to={post.url} className="group ch flex flex-col bg-ink-2 transition-colors hover:bg-ink-3">
      <Art variant={post.art} image={post.image} className={size === "md" ? "h-40" : "h-32"}>
        {post.review && <ScoreBadge score={post.review.score} className="absolute right-0 bottom-0" />}
      </Art>
      <div className="flex flex-col gap-2.5 p-4 pb-5">
        <Kicker>
          {"// "}{post.kicker} · {post.ago}
        </Kicker>
        <h3 className={cx("font-display uppercase leading-[1.02] transition-colors group-hover:text-acc", size === "md" ? "text-[26px]" : "text-[22px]")}>
          {post.title}
        </h3>
      </div>
    </Link>
  );
}

export function PostGrid({ posts }: { posts: PostView[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
      {posts.map((p) => (
        <PostCard key={p.url} post={p} />
      ))}
    </div>
  );
}

/** Linha de listagem com resumo (páginas de seção, busca). */
export function PostRow({ post }: { post: PostView }) {
  return (
    <Link to={post.url} className="group flex flex-col gap-5 border-b border-dashed border-line-soft py-6 sm:flex-row sm:items-start">
      <Art variant={post.art} image={post.image} className="chs aspect-[16/10] w-full shrink-0 sm:w-72">
        {post.review && <ScoreBadge score={post.review.score} className="absolute right-0 bottom-0" />}
      </Art>
      <div className="flex min-w-0 flex-col gap-3">
        <Kicker>
          {"// "}{post.kicker} · {post.ago}
        </Kicker>
        <h3 className="font-display text-3xl uppercase leading-none transition-colors group-hover:text-acc">{post.title}</h3>
        <p className="text-base leading-relaxed text-body">{post.excerpt}</p>
        <span className="font-mono text-[11px] text-muted">
          {post.author.toUpperCase()} · {post.readMinutes} MIN
        </span>
      </div>
    </Link>
  );
}

/** Ranking de mais lidas com barra proporcional às visualizações. */
export function MostRead({ posts, title = "Ranking 24h" }: { posts: PostView[]; title?: string }) {
  const max = Math.max(1, ...posts.map((p) => p.views));
  return (
    <div className="ch bg-ink-2 p-5">
      <h2 className="mb-2 font-mono text-xs font-bold text-acc">&gt; {title.toUpperCase()}</h2>
      <ol>
        {posts.map((p, i) => (
          <li key={p.url}>
            <Link to={p.url} className="group flex gap-4 border-b border-dashed border-line-soft py-3.5 last:border-b-0">
              <span aria-hidden className="w-7 shrink-0 font-mono text-sm font-bold text-acc">
                #{String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="text-[15px] leading-snug font-semibold transition-colors group-hover:text-acc">{p.title}</span>
                <span aria-hidden className="h-1 bg-line">
                  <span className="block h-full bg-acc" style={{ width: `${Math.round((p.views / max) * 100)}%` }} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
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
  const btn = "chs bg-ink-3 px-4 py-3 text-acc hover:bg-acc hover:text-ink";
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-4 pt-6 font-mono text-xs font-bold">
      {page > 1 ? (
        <Link to={href(page - 1)} className={btn}>
          ← ANTERIOR
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        PÁGINA {String(page).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
      </span>
      {page < totalPages ? (
        <Link to={href(page + 1)} className={btn}>
          PRÓXIMA →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
