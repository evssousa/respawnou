// Peças visuais pequenas e reutilizáveis do tema "Manchete Brutal".
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { ArtVariant } from "~/lib/types";

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");
export { cx };

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

/** Cantos de mira sobre uma imagem. */
export function Brackets({ label }: { label?: string }) {
  const base = "pointer-events-none absolute h-7 w-7 border-alert";
  return (
    <>
      <span aria-hidden className={cx(base, "top-3.5 left-3.5 border-t-[3px] border-l-[3px]")} />
      <span aria-hidden className={cx(base, "top-3.5 right-3.5 border-t-[3px] border-r-[3px]")} />
      <span aria-hidden className={cx(base, "bottom-3.5 left-3.5 border-b-[3px] border-l-[3px]")} />
      <span aria-hidden className={cx(base, "right-3.5 bottom-3.5 border-r-[3px] border-b-[3px]")} />
      {label && (
        <span aria-hidden className="absolute top-5 left-14 font-mono text-xs text-alert-soft">
          {label}
        </span>
      )}
    </>
  );
}

/** Título de seção com a régua grossa no topo. */
export function SectionTitle({
  children,
  accent,
  as: Tag = "h2",
  action,
  rule = "paper",
  size = "lg",
}: {
  children: ReactNode;
  accent?: ReactNode;
  as?: "h1" | "h2";
  action?: { to: string; label: string };
  rule?: "paper" | "alert";
  size?: "lg" | "xl";
}) {
  return (
    <div className={cx("flex flex-wrap items-baseline gap-4 border-t-[6px] pt-3", rule === "alert" ? "border-alert" : "border-paper")}>
      <Tag className={cx("font-display uppercase leading-none", size === "xl" ? "text-5xl sm:text-7xl" : "text-4xl sm:text-[52px]")}>
        {children} {accent && <span className="text-alert">{accent}</span>}
      </Tag>
      {action && (
        <Link to={action.to} className="ml-auto font-mono text-xs font-semibold text-alert hover:text-paper">
          {action.label} →
        </Link>
      )}
    </div>
  );
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("font-mono text-xs font-semibold uppercase leading-none text-alert", className)}>{children}</span>;
}

export function Badge({ children, tone = "alert" }: { children: ReactNode; tone?: "alert" | "paper" }) {
  return (
    <span
      className={cx(
        "inline-block self-start px-2.5 py-2 font-mono text-xs font-bold uppercase leading-none",
        tone === "alert" ? "bg-alert text-ink" : "bg-paper text-ink",
      )}
    >
      {children}
    </span>
  );
}

/** Botão de recurso que depende de login (ainda não existe). */
export function SoonButton({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      disabled
      title="Disponível quando as contas de usuário forem lançadas"
      className={cx(
        "h-11 cursor-not-allowed border border-dashed border-[#444] bg-transparent px-3.5 font-mono text-xs font-semibold text-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function PlatformTags({ platforms, labels }: { platforms: string[]; labels: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((p) => (
        <Link key={p} to={`/plataforma/${p}`} className="border border-line px-3 py-2 font-mono text-xs font-semibold uppercase hover:border-alert hover:text-alert">
          {labels[p] ?? p}
        </Link>
      ))}
    </div>
  );
}
