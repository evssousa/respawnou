// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Escolha do formato da tela do vídeo: tela dividida (vídeo enviado em cima, imagem embaixo) ou tela cheia. Só aparece quando o job
// tem vídeo enviado. Campos do formulário: layout, topo, focot.
import { useRef } from "react";
import { ENQUADRAMENTOS_TOPO } from "~/video/layout";

type Formato = "dividido" | "cheio";

function Diagrama({ tipo }: { tipo: Formato }) {
  return (
    <svg width="36" height="64" viewBox="0 0 36 64" aria-hidden="true" className="shrink-0 border border-[#243022]">
      {tipo === "dividido" ? (
        <>
          <rect x="0" y="0" width="36" height="31" fill="#1c241a" />
          <path d="M15 11 L23 15.5 L15 20 Z" fill="#c8ff2e" />
          <rect x="0" y="30.5" width="36" height="3" fill="#c8ff2e" />
          <rect x="0" y="33.5" width="36" height="30.5" fill="#243022" />
          {[42, 48, 54].map((y) => <rect key={y} x="7" y={y} width={y === 54 ? 14 : 22} height="2" fill="#8a9787" />)}
        </>
      ) : (
        <>
          <rect x="0" y="0" width="36" height="64" fill="#1c241a" />
          <path d="M15 22 L23 26.5 L15 31 Z" fill="#c8ff2e" />
          <rect x="4" y="44" width="28" height="12" fill="#060807" />
          <rect x="4" y="44" width="2" height="12" fill="#c8ff2e" />
        </>
      )}
    </svg>
  );
}

const OPCOES: { id: Formato; titulo: string; texto: string }[] = [
  { id: "dividido", titulo: "Tela dividida", texto: "Vídeo em cima, imagem da matéria embaixo, legenda no meio. Começa já com o vídeo rodando." },
  { id: "cheio", titulo: "Tela cheia", texto: "Uma imagem ou trecho por vez em tela inteira, com o cartão de título no começo." },
];

export function FormatoTela({ valor, onChange, videos, topo, onTopo, enquadramento, onEnquadramento }: { valor: Formato; onChange: (v: Formato) => void; videos: { indice: number; alt: string }[]; topo: number; onTopo: (i: number) => void; enquadramento: string; onEnquadramento: (v: string) => void }) {
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const teclas = (e: React.KeyboardEvent, k: number) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const n = (k + 1) % OPCOES.length;
    onChange(OPCOES[n].id);
    botoes.current[n]?.focus();
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-mono text-xs font-bold uppercase text-body">Formato da tela</legend>
      <input type="hidden" name="layout" value={valor} />
      <input type="hidden" name="topo" value={valor === "dividido" ? topo : ""} />
      <input type="hidden" name="focot" value={valor === "dividido" ? enquadramento : ""} />
      <div role="radiogroup" aria-label="Formato da tela" className="grid gap-2 sm:grid-cols-2">
        {OPCOES.map((o, k) => {
          const sel = valor === o.id;
          return (
            <button
              key={o.id}
              ref={(el) => {
                botoes.current[k] = el;
              }}
              type="button"
              role="radio"
              aria-checked={sel}
              tabIndex={sel ? 0 : -1}
              onClick={() => onChange(o.id)}
              onKeyDown={(e) => teclas(e, k)}
              className={`flex min-h-[88px] items-center gap-3 border-2 p-3 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc ${sel ? "border-acc bg-acc/10" : "border-line hover:border-line-soft"}`}
            >
              <Diagrama tipo={o.id} />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-xs font-bold uppercase text-paper">{o.titulo}</span>
                <span className="text-[11px] text-muted">{o.texto}</span>
              </span>
              {sel && <span className="ml-auto shrink-0 self-start font-mono text-[10px] font-bold text-acc">✓ ESCOLHIDO</span>}
            </button>
          );
        })}
      </div>
      {valor === "dividido" && (
        <>
          <div className="flex flex-wrap gap-2">
            {videos.length > 1 && (
              <select value={topo} onChange={(e) => onTopo(Number(e.target.value))} aria-label="Vídeo de cima" className="min-h-9 border border-line bg-ink px-2 text-xs text-paper">
                {videos.map((v) => <option key={v.indice} value={v.indice}>{`Vídeo de cima: ${v.alt}`}</option>)}
              </select>
            )}
            <select value={enquadramento} onChange={(e) => onEnquadramento(e.target.value)} aria-label="Enquadramento do vídeo" className="min-h-9 border border-line bg-ink px-2 text-xs text-paper">
              {ENQUADRAMENTOS_TOPO.map((x) => <option key={x.id} value={x.id}>{`Enquadramento do vídeo: ${x.rotulo}`}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-muted">O vídeo ocupa a metade de cima o tempo todo, em cortes de até 4,5 s, sem o áudio original. O crédito fica na tela. Vídeo vertical? Use "Inteiro".</p>
        </>
      )}
    </fieldset>
  );
}
