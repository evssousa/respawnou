// Moldura comum dos jogos do Arcade: carrega o código do jogo só no navegador, mostra as
// telas de início / pausa / fim, guarda recorde e partidas (localStorage) e pausa sozinho
// quando a aba perde o foco. Os jogos em si só desenham no canvas (app/arcade/*.ts).
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameFactory, GameInstance } from "~/arcade/engine";
import { readRecord, saveRecord, type ArcadeGame, type ArcadeRecord } from "~/lib/arcade";
import { cx } from "./ui";

const LOADERS: Record<string, () => Promise<{ create: GameFactory }>> = {
  respawn: () => import("~/arcade/respawn"),
  torre: () => import("~/arcade/torre"),
  "quebra-pixel": () => import("~/arcade/quebra-pixel"),
  meteoros: () => import("~/arcade/meteoros"),
  "cabo-de-forca": () => import("~/arcade/cabo"),
  trinca: () => import("~/arcade/trinca"),
  mira: () => import("~/arcade/mira"),
  memoria: () => import("~/arcade/memoria"),
  "campo-minado": () => import("~/arcade/campo-minado"),
  paciencia: () => import("~/arcade/paciencia"),
};

type Phase = "loading" | "ready" | "play" | "paused" | "over" | "error";
type Orient = "landscape" | "portrait";

// Tela larga (PC, tablet ou celular deitado) joga na horizontal; celular em pé, na vertical.
const pickOrient = (): Orient => (window.innerWidth >= 768 && window.innerWidth > window.innerHeight ? "landscape" : "portrait");

export function ArcadeShell({ game }: { game: ArcadeGame }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const inst = useRef<GameInstance | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const phaseRef = useRef<Phase>("loading");
  const [score, setScore] = useState(0);
  const [rec, setRec] = useState<ArcadeRecord>({ best: 0, plays: 0 });
  const [newBest, setNewBest] = useState(false);
  const [fs, setFs] = useState(false);
  const [canFs, setCanFs] = useState(false);
  // Formato só é conhecido no navegador; até lá a área do jogo fica reservada.
  const [orient, setOrient] = useState<Orient | null>(null);
  const startAfterLoad = useRef(false);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => {
    setRec(readRecord(game.slug));
    setCanFs(Boolean(document.fullscreenEnabled));
    setOrient(pickOrient());
  }, [game.slug]);

  // Girou o celular ou redimensionou a janela: troca o formato fora de uma partida
  // (no meio do jogo, a troca fica para quando ele recomeçar).
  useEffect(() => {
    const onResize = () => {
      const p = phaseRef.current;
      if (p === "ready" || p === "error") setOrient(pickOrient());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!orient) return;
    let alive = true;
    go("loading");
    LOADERS[game.slug]?.()
      .then(({ create }) => {
        if (!alive || !canvasRef.current) return;
        const [W, H] = game.size[orient];
        inst.current = create(canvasRef.current, {
          onScore: setScore,
          onOver: (final) => {
            const prev = readRecord(game.slug);
            const best = Math.max(prev.best, final);
            setNewBest(final > prev.best && final > 0);
            const next = { best, plays: prev.plays };
            saveRecord(game.slug, next);
            setRec(next);
            go("over");
          },
        }, { W, H, landscape: orient === "landscape" });
        go("ready");
        if (startAfterLoad.current) {
          startAfterLoad.current = false;
          startRef.current();
        }
      })
      .catch(() => alive && go("error"));
    return () => {
      alive = false;
      inst.current?.destroy();
      inst.current = null;
    };
  }, [game.slug, orient, go]);

  // No celular o título empurra o jogo para baixo: ao começar, rola até a tela do jogo
  // ficar inteira à vista (descontando o cabeçalho fixo).
  const reveal = () => {
    const el = hudRef.current;
    if (!el || document.fullscreenElement) return;
    const r = el.getBoundingClientRect();
    const bottom = frameRef.current?.getBoundingClientRect().bottom ?? r.bottom;
    const header = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
    if (r.top < header || bottom > window.innerHeight) window.scrollBy({ top: r.top - header - 8, behavior: "smooth" });
  };

  const start = useCallback(() => {
    if (!inst.current) return;
    // O formato mudou desde a última partida: recria o jogo no formato novo e começa.
    const now = pickOrient();
    if (orient && now !== orient) {
      startAfterLoad.current = true;
      setOrient(now);
      return;
    }
    const prev = readRecord(game.slug);
    const next = { ...prev, plays: prev.plays + 1 };
    saveRecord(game.slug, next);
    setRec(next);
    setNewBest(false);
    setScore(0);
    go("play");
    inst.current.start();
    canvasRef.current?.focus({ preventScroll: true });
    reveal();
  }, [game.slug, go, orient]);
  const startRef = useRef(start);
  startRef.current = start;

  const pause = useCallback(() => {
    if (phaseRef.current !== "play") return;
    inst.current?.pause();
    go("paused");
  }, [go]);

  const resume = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    go("play");
    inst.current?.resume();
    canvasRef.current?.focus({ preventScroll: true });
  }, [go]);

  // Teclado das telas (Espaço/Enter começa ou continua; Esc/P pausa). Roda antes do jogo
  // (fase de captura) para o mesmo Espaço não virar também um pulo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const p = phaseRef.current;
      const confirm = e.code === "Space" || e.code === "Enter";
      // Botões e links fora da tela do jogo (ex.: "tela cheia") seguem o comportamento normal.
      if (confirm && (el?.tagName === "BUTTON" || el?.tagName === "A") && !el.closest("[data-arcade-overlay]")) return;
      if ((p === "ready" || p === "over") && confirm) {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) start();
      } else if (p === "paused" && (confirm || e.code === "KeyP" || e.code === "Escape")) {
        e.preventDefault();
        e.stopPropagation();
        resume();
      } else if (p === "play" && (e.code === "KeyP" || e.code === "Escape")) {
        if (e.code === "Escape" && document.fullscreenElement) return; // Esc sai da tela cheia
        e.preventDefault();
        pause();
      }
    };
    const onHide = () => document.hidden && pause();
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [start, pause, resume]);

  useEffect(() => {
    const onFs = () => setFs(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else frameRef.current?.requestFullscreen().catch(() => {});
  };

  const [gw, gh] = game.size[orient ?? "portrait"];
  const ratio = gw / gh;
  // Cabe na tela: largura total, mas sem passar da altura visível (jogos em pé no celular).
  const canvasWidth = fs ? `min(100vw, calc(100vh * ${ratio}))` : `min(100%, calc((100dvh - 170px) * ${ratio}))`;
  const overTitle = game.slug === "respawn" ? "Você caiu" : "Fim de jogo";

  return (
    <div className="flex flex-col gap-2">
      <div ref={hudRef} className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs font-bold">
        <span className="text-muted">
          PONTOS <span className="text-lg text-acc tabular-nums">{score}</span>
        </span>
        <span className="text-muted">
          RECORDE <span className="text-lg text-paper tabular-nums">{rec.best}</span>
        </span>
        <span className="ml-auto flex gap-2">
          {phase === "play" && (
            <button type="button" onClick={pause} className="chs min-h-10 bg-ink-3 px-3 text-acc hover:bg-acc hover:text-ink">
              PAUSAR
            </button>
          )}
          {canFs && (
            <button type="button" onClick={toggleFs} className="chs min-h-10 bg-ink-3 px-3 text-acc hover:bg-acc hover:text-ink">
              {fs ? "SAIR DA TELA CHEIA" : "TELA CHEIA"}
            </button>
          )}
        </span>
      </div>

      <div ref={frameRef} className={cx("relative flex items-center justify-center bg-ink", fs ? "h-full w-full" : "border border-line")}>
        <div className="relative" style={orient ? { width: canvasWidth, aspectRatio: `${gw} / ${gh}` } : { width: "100%", height: "min(60vh, 520px)" }}>
          <canvas
            ref={canvasRef}
            tabIndex={-1}
            aria-label={`Tela do jogo ${game.name}`}
            className="block h-full w-full touch-none select-none outline-none"
            onContextMenu={(e) => e.preventDefault()}
          />

          {phase !== "play" && (
            <div data-arcade-overlay className="absolute inset-0 flex touch-none flex-col items-center justify-center gap-4 bg-ink/80 p-4 text-center backdrop-blur-[2px]">
              {phase === "loading" && <p className="font-mono text-xs font-bold text-muted">&gt; CARREGANDO...</p>}
              {phase === "error" && <p className="font-mono text-xs font-bold text-warn">&gt; NÃO FOI POSSÍVEL CARREGAR O JOGO. RECARREGUE A PÁGINA.</p>}
              {phase === "ready" && (
                <>
                  <p className="font-display text-4xl uppercase leading-none sm:text-5xl">{game.name}</p>
                  <ShellButton onClick={start}>JOGAR</ShellButton>
                  <p className="font-mono text-[11px] text-muted">ESPAÇO OU TOQUE PARA COMEÇAR</p>
                </>
              )}
              {phase === "paused" && (
                <>
                  <p className="font-display text-4xl uppercase leading-none">Pausado</p>
                  <ShellButton onClick={resume} autoFocus>
                    CONTINUAR
                  </ShellButton>
                </>
              )}
              {phase === "over" && (
                <>
                  <p className="font-mono text-xs font-bold text-acc">&gt; {overTitle.toUpperCase()}</p>
                  <p className="font-display text-6xl leading-none text-paper tabular-nums">{score}</p>
                  {newBest ? (
                    <p className="chs bg-acc px-3 py-1.5 font-mono text-xs font-bold text-ink">★ NOVO RECORDE</p>
                  ) : (
                    <p className="font-mono text-xs text-muted">RECORDE {rec.best}</p>
                  )}
                  <ShellButton onClick={start} autoFocus>
                    {game.slug === "respawn" ? "RESPAWN" : "JOGAR DE NOVO"}
                  </ShellButton>
                  <p className="font-mono text-[11px] text-muted">
                    {game.playsLabel.toUpperCase()}: {rec.plays}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShellButton({ children, onClick, autoFocus }: { children: React.ReactNode; onClick: () => void; autoFocus?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Foca sem rolar a página (o autoFocus nativo pode pular para o jogo).
      ref={(el) => {
        if (autoFocus && el && document.activeElement !== el) el.focus({ preventScroll: true });
      }}
      className="chs min-h-12 bg-acc px-8 font-mono text-sm font-bold text-ink hover:bg-acc-soft"
    >
      {children}
    </button>
  );
}
