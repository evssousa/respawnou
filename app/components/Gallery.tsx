// Galeria de imagens com ampliação: miniaturas clicáveis que abrem a imagem grande numa camada
// sobre a página. Setas (teclado ou botões) passam as imagens; Esc, o botão ou clicar fora fecha.
import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "./ui";

export interface GalleryImage {
  /** Miniatura (leve). */
  thumb: string;
  /** Versão grande, carregada só ao abrir. */
  full: string;
  alt: string;
}

/** fill: as miniaturas esticam para ocupar a altura do contêiner (ex.: ao lado do trailer). */
export function Gallery({ images, className, fill }: { images: GalleryImage[]; className?: string; fill?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(null);
    lastTrigger.current?.focus(); // volta o foco para a miniatura que abriu
  }, []);
  const step = useCallback((dir: 1 | -1) => setOpen((i) => (i === null ? i : (i + dir + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (open === null) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // página de trás não rola com a imagem aberta
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, close, step]);

  const navBtn = "chs flex h-12 w-12 shrink-0 items-center justify-center bg-ink-3 text-acc hover:bg-acc hover:text-ink";

  return (
    <>
      <ul className={cx("grid gap-3", className)}>
        {images.map((img, i) => (
          <li key={img.full} className={fill ? "min-h-0" : undefined}>
            <button
              type="button"
              onClick={(e) => {
                lastTrigger.current = e.currentTarget;
                setOpen(i);
              }}
              aria-label={`Ampliar: ${img.alt}`}
              className={cx("group chs relative block w-full overflow-hidden", fill && "lg:h-full")}
            >
              <img src={img.thumb} alt={img.alt} loading="lazy" decoding="async" className={cx("aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]", fill && "lg:aspect-auto lg:h-full")} />
              <span aria-hidden className="absolute right-2 bottom-2 bg-ink/80 px-2 py-1 font-mono text-[10px] font-bold text-acc opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                AMPLIAR +
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Imagem ${open + 1} de ${images.length}`}
          className="fixed inset-0 z-[60] flex flex-col bg-ink/95 p-3 sm:p-6"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="flex items-center justify-between gap-3 pb-3">
            <span className="font-mono text-xs font-bold text-muted">
              {String(open + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
            </span>
            <button ref={closeRef} type="button" onClick={close} className={navBtn} aria-label="Fechar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center gap-2 sm:gap-4" onClick={(e) => e.target === e.currentTarget && close()}>
            {images.length > 1 && (
              <button type="button" onClick={() => step(-1)} className={navBtn} aria-label="Imagem anterior">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
            )}
            <img key={images[open].full} src={images[open].full} alt={images[open].alt} className="mx-auto max-h-full min-w-0 max-w-full flex-1 object-contain" />
            {images.length > 1 && (
              <button type="button" onClick={() => step(1)} className={navBtn} aria-label="Próxima imagem">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
