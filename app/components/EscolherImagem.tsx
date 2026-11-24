// Seletor de imagem com miniaturas (no lugar de uma lista só de texto): mostra a escolhida e abre uma grade para trocar.
import { useEffect, useState } from "react";

export interface OpcaoImagem {
  /** Endereço da imagem (ou do vídeo). `arte:…` e vazio viram um quadro com texto. */
  src: string;
  alt: string;
}

const ehVideo = (s: string) => /\.(mp4|webm)$/i.test(s);
const ehLegado = (s: string) => s.startsWith("yt:");

function Miniatura({ op, className }: { op: OpcaoImagem; className: string }) {
  if (ehVideo(op.src)) return <video src={op.src} muted playsInline preload="metadata" className={className} />;
  if (op.src.startsWith("arte:") || ehLegado(op.src)) return <div className={`${className} flex items-center justify-center bg-ink text-[10px] text-muted`}>ARTE</div>;
  return <img src={op.src} alt="" loading="lazy" className={className} />;
}

export function EscolherImagem({
  opcoes,
  valor,
  onChange,
  rotulo,
  permitirAutomatica,
  semVideo,
}: {
  opcoes: OpcaoImagem[];
  /** Índice escolhido; vazio = automática (só quando `permitirAutomatica`). */
  valor: string;
  onChange: (v: string) => void;
  rotulo: string;
  permitirAutomatica?: string;
  semVideo?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto]);
  const atual = valor !== "" ? opcoes[Number(valor)] : undefined;
  const lista = opcoes.map((op, k) => ({ op, k })).filter(({ op }) => !ehLegado(op.src) && !(semVideo && (ehVideo(op.src) || op.src.startsWith("arte:"))));
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} aria-label={rotulo} className="flex min-h-10 items-center gap-2 border border-line bg-ink px-2 py-1 text-left text-xs text-paper hover:border-acc">
        {atual ? <Miniatura op={atual} className="h-12 w-16 border border-line object-cover" /> : <span className="flex h-12 w-16 items-center justify-center border border-line text-[10px] text-muted">AUTO</span>}
        <span className="flex flex-col">
          <span className="font-mono font-bold">{atual ? `Imagem ${Number(valor) + 1}` : "Automática"}</span>
          <span className="max-w-[180px] truncate text-muted">{atual ? atual.alt : (permitirAutomatica ?? "")}</span>
        </span>
        <span className="ml-auto font-mono text-[11px] text-acc">Trocar</span>
      </button>
      {aberto && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-auto bg-black/90 p-4" role="dialog" aria-modal="true" aria-label={rotulo} onClick={() => setAberto(false)}>
          <div className="flex max-h-full w-full max-w-[860px] flex-col gap-3 border border-line bg-ink p-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-mono text-xs font-bold uppercase text-acc">{rotulo}</p>
            <div className="grid max-h-[70vh] grid-cols-2 gap-2 overflow-auto sm:grid-cols-3 md:grid-cols-4">
              {permitirAutomatica != null && (
                <button type="button" onClick={() => { onChange(""); setAberto(false); }} className={`flex min-h-[120px] flex-col items-center justify-center gap-1 border p-2 text-xs ${valor === "" ? "border-acc text-acc" : "border-line text-paper hover:border-acc"}`}>
                  <span className="font-mono font-bold">AUTOMÁTICA</span>
                  <span className="text-center text-muted">{permitirAutomatica}</span>
                </button>
              )}
              {lista.map(({ op, k }) => (
                <button key={k} type="button" onClick={() => { onChange(String(k)); setAberto(false); }} className={`flex flex-col gap-1 border p-1 text-left text-xs ${valor === String(k) ? "border-acc" : "border-line hover:border-acc"}`}>
                  <Miniatura op={op} className="h-[120px] w-full object-cover" />
                  <span className="font-mono font-bold text-paper">{`${k + 1}${ehVideo(op.src) ? " · VÍDEO" : ""}`}</span>
                  <span className="line-clamp-2 text-muted">{op.alt}</span>
                </button>
              ))}
            </div>
            <button type="button" className="min-h-10 self-start px-4 font-mono text-xs text-muted underline" onClick={() => setAberto(false)}>Fechar (Esc)</button>
          </div>
        </div>
      )}
    </>
  );
}
