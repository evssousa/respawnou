// Peças visuais pequenas e reutilizáveis do tema "Central de Comando".
import type { ReactNode } from "react";
import { gameThumb } from "~/lib/game-images";
import type { Game } from "~/lib/types";
import { Link } from "react-router";
import type { ArtVariant } from "~/lib/types";

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

/** Capa do post: imagem real quando existir, senão a arte provisória. */
export function Art({
  variant = "a",
  image,
  className,
  children,
  eager,
}: {
  variant?: ArtVariant;
  image?: { src: string; alt: string };
  className?: string;
  children?: ReactNode;
  eager?: boolean;
}) {
  return (
    <div className={cx("relative overflow-hidden", !image && (variant === "a" ? "art" : `art art-${variant}`), className)}>
      {image && (
        <img
          src={image.src}
          alt={image.alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {children}
    </div>
  );
}

/** Rótulos de HUD nos cantos superiores de uma imagem. */
export function Hud({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div aria-hidden className="pointer-events-none absolute top-4 right-5 left-6 z-10 flex justify-between font-mono text-xs font-semibold text-acc">
      <span>{left}</span>
      {right && <span>{right}</span>}
    </div>
  );
}

/**
 * Cabeçalho de módulo da home e das páginas internas:
 * "MÓDULO 03" em mono + título em Anton + linha tracejada + ação.
 */
export function SectionTitle({
  children,
  accent,
  as: Tag = "h2",
  action,
  code,
  size = "lg",
}: {
  children: ReactNode;
  accent?: ReactNode;
  as?: "h1" | "h2";
  action?: { to: string; label: string };
  /** Código curto acima do título, ex.: "MÓDULO 03 // REVIEWS". */
  code?: string;
  size?: "lg" | "xl";
}) {
  return (
    <div className="flex flex-col gap-2">
      {code && <span className="font-mono text-xs font-semibold text-acc">&gt; {code}</span>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Tag className={cx("font-display uppercase leading-none", size === "xl" ? "text-5xl sm:text-7xl" : "text-4xl sm:text-[44px]")}>
          {children} {accent && <span className="text-acc">{accent}</span>}
        </Tag>
        <span aria-hidden className="hidden min-w-8 flex-1 border-t border-dashed border-line-soft sm:block" />
        {action && (
          <Link to={action.to} className="-my-3 ml-auto inline-block py-3 font-mono text-xs font-bold text-acc hover:text-paper sm:ml-0">
            {action.label} →
          </Link>
        )}
      </div>
    </div>
  );
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("font-mono text-[11px] font-bold uppercase leading-none text-acc", className)}>{children}</span>;
}

export function Badge({ children, tone = "acc" }: { children: ReactNode; tone?: "acc" | "warn" }) {
  return (
    <span
      className={cx(
        "chs inline-block self-start px-3 py-2 font-mono text-xs font-bold uppercase leading-none text-ink",
        tone === "acc" ? "bg-acc" : "bg-warn",
      )}
    >
      {children}
    </span>
  );
}

export function PlatformTags({ platforms, labels }: { platforms: string[]; labels: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((p) => (
        <Link key={p} to={`/plataforma/${p}`} className="chs inline-flex min-h-11 items-center bg-ink-3 px-3.5 font-mono text-xs font-semibold uppercase text-acc hover:bg-acc hover:text-ink">
          {labels[p] ?? p}
        </Link>
      ))}
    </div>
  );
}

/** Link de filtro (plataformas) usado nas listagens. */
export function FilterLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cx("chs inline-flex min-h-11 items-center px-3.5 font-mono text-xs font-bold", active ? "bg-acc text-ink" : "bg-ink-3 text-acc hover:bg-line-soft")}
    >
      {children}
    </Link>
  );
}

/** Miniatura da capa de um jogo (calendário e plataformas). Sem imagem: bloco vazio do mesmo tamanho. */
export function GameCover({ game, className }: { game: Pick<Game, "cover" | "image" | "name">; className?: string }) {
  const thumb = gameThumb(game);
  return (
    <span className={cx("chs block aspect-[3/4] w-[60px] shrink-0 overflow-hidden bg-ink-3 sm:w-[72px]", className)}>
      {thumb && <img src={thumb.src} alt={thumb.alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />}
    </span>
  );
}
