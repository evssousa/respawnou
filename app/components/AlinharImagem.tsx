// Ver a imagem grande e alinhar o recorte à mão: arrasta a imagem dentro do quadro (com a proporção em que ela aparece na arte)
// ou usa os controles. O resultado é um foco "x,y" em porcentagem, o mesmo que o servidor usa para cortar (object-position).
import { useEffect, useRef, useState } from "react";

const MANUAL = /^(\d{1,3}),(\d{1,3})$/;
const lerFoco = (v?: string | null): [number, number] => {
  const m = v ? MANUAL.exec(v) : null;
  return m ? [Math.min(100, Number(m[1])), Math.min(100, Number(m[2]))] : [50, 50];
};
const limita = (n: number) => Math.max(0, Math.min(100, n));

export function AlinharImagem({ src, aspecto, inicial, titulo, onSalvar, onFechar }: { src: string; aspecto: number; inicial?: string | null; titulo: string; onSalvar: (foco: string) => void; onFechar: () => void }) {
  const [x0, y0] = lerFoco(inicial);
  const [x, setX] = useState(x0);
  const [y, setY] = useState(y0);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFechar]);

  // Quanto a imagem "sobra" além do quadro (object-fit: cover), em pixels do quadro: define a velocidade do arrasto.
  const sobra = () => {
    const el = caixa.current;
    if (!el || !nat) return { sx: 0, sy: 0 };
    const bw = el.clientWidth;
    const bh = el.clientHeight;
    const escala = Math.max(bw / nat.w, bh / nat.h);
    return { sx: Math.max(0, nat.w * escala - bw), sy: Math.max(0, nat.h * escala - bh) };
  };

  const mover = (e: React.PointerEvent) => {
    if (!arrasto.current) return;
    const { sx, sy } = sobra();
    const a = arrasto.current;
    if (sx > 0) setX(limita(a.x - ((e.clientX - a.px) / sx) * 100));
    if (sy > 0) setY(limita(a.y - ((e.clientY - a.py) / sy) * 100));
  };

  const largura = Math.min(520, Math.round(560 * Math.min(1, aspecto)));
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-auto bg-black/90 p-4" role="dialog" aria-modal="true" aria-label={titulo} onClick={onFechar}>
      <div className="flex max-h-full w-full max-w-[640px] flex-col gap-3 border border-line bg-ink p-4" onClick={(e) => e.stopPropagation()}>
        <p className="font-mono text-xs font-bold uppercase text-acc">{titulo}</p>
        <p className="text-xs text-muted">Arraste a imagem para escolher o que aparece. O quadro tem a proporção em que ela entra na arte.</p>
        <div className="flex justify-center">
          <div
            ref={caixa}
            className="relative touch-none select-none overflow-hidden border-2 border-acc bg-black"
            style={{ width: largura, aspectRatio: String(aspecto), cursor: "grab" }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              arrasto.current = { px: e.clientX, py: e.clientY, x, y };
            }}
            onPointerMove={mover}
            onPointerUp={() => (arrasto.current = null)}
            onPointerCancel={() => (arrasto.current = null)}
          >
            <img src={src} alt="" draggable={false} onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} className="h-full w-full object-cover" style={{ objectPosition: `${x}% ${y}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 font-mono text-xs text-body">
            Horizontal ({Math.round(x)}%)
            <input type="range" min={0} max={100} value={x} onChange={(e) => setX(Number(e.target.value))} className="accent-[var(--color-acc)]" />
          </label>
          <label className="flex flex-col gap-1 font-mono text-xs text-body">
            Vertical ({Math.round(y)}%)
            <input type="range" min={0} max={100} value={y} onChange={(e) => setY(Number(e.target.value))} className="accent-[var(--color-acc)]" />
          </label>
        </div>
        <details>
          <summary className="cursor-pointer font-mono text-xs text-muted">Ver a imagem inteira</summary>
          <img src={src} alt="" className="mt-2 max-h-[50vh] w-full border border-line object-contain" />
        </details>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-h-10 bg-acc px-4 font-mono text-xs font-bold text-ink" onClick={() => onSalvar(`${Math.round(x)},${Math.round(y)}`)}>Salvar alinhamento</button>
          <button type="button" className="min-h-10 border border-line-soft px-4 font-mono text-xs font-bold text-paper hover:border-acc" onClick={() => { setX(50); setY(50); }}>Centralizar</button>
          <button type="button" className="min-h-10 border border-line-soft px-4 font-mono text-xs font-bold text-paper hover:border-acc" onClick={() => onSalvar("auto")}>Voltar ao automático</button>
          <button type="button" className="min-h-10 px-4 font-mono text-xs text-muted underline" onClick={onFechar}>Fechar (Esc)</button>
        </div>
      </div>
    </div>
  );
}
