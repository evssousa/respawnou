import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "./ui";

/**
 * Carrossel horizontal: no toque rola com o dedo (com snap); no desktop
 * ganha botões de anterior/próximo, já que mouse comum não rola na horizontal.
 */
export function Rail({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const btn =
    "chs absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center bg-acc text-ink shadow-[0_0_0_6px_var(--color-ink)] transition-opacity md:flex disabled:pointer-events-none disabled:opacity-0";

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={update}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cx("rail -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0", className)}
      >
        {children}
      </div>
      <button type="button" onClick={() => go(-1)} disabled={edges.start} aria-label="Itens anteriores" className={cx(btn, "-left-3")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <button type="button" onClick={() => go(1)} disabled={edges.end} aria-label="Próximos itens" className={cx(btn, "-right-3")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
