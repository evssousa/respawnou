// Trinca: troque peças vizinhas para alinhar 3 ou mais iguais. Cada peça quebrada devolve
// tempo ao relógio, que corre cada vez mais rápido. Cascatas multiplicam os pontos.
// Peças têm cor E formato diferentes (dá para jogar sem distinguir cores).
import { burst, C, createLoop, drawParticles, listen, MONO, setupCanvas, stepParticles, toLocal, type GameFactory, type Particle } from "./engine";

const CELL = 48;
const OX = 12;
const TOP = 72;
const TYPES = 6;
const COLORS = [C.acc, C.warn, C.danger, "#4fd8ff", "#b48cff", C.paper];
const START_TIME = 45;
const MAX_TIME = 60;

type Gem = { t: number; oy: number; fade: number };
type Cell = { r: number; c: number };

export const create: GameFactory = (canvas, hooks, { W, H }) => {
  // 7×8 em pé, 10×7 deitado.
  const COLS = Math.round((W - OX * 2) / CELL);
  const ROWS = Math.round((H - TOP - 12) / CELL);
  const ctx = setupCanvas(canvas, W, H);
  let grid: (Gem | null)[][] = [];
  let sel: Cell | null = null;
  let cursor: Cell = { r: 3, c: 3 };
  let showCursor = false;
  let swap: { a: Cell; b: Cell; t: number; back: boolean } | null = null;
  let phase: "idle" | "swap" | "clear" | "fall" = "idle";
  let clearing = new Set<string>();
  let clearT = 0;
  let combo = 0;
  let score = 0;
  let timeLeft = START_TIME;
  let elapsed = 0;
  let particles: Particle[] = [];
  let popups: { x: number; y: number; text: string; t: number }[] = [];
  let state: "idle" | "play" | "over" = "idle";
  let overT = 0;
  let hint = 0;

  const rnd = () => Math.floor(Math.random() * TYPES);
  const at = (r: number, c: number) => (r >= 0 && r < ROWS && c >= 0 && c < COLS ? grid[r][c] : null);

  const findMatches = () => {
    const out = new Set<string>();
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; ) {
        const t = at(r, c)?.t;
        let n = 1;
        while (t !== undefined && at(r, c + n)?.t === t) n++;
        if (t !== undefined && n >= 3) for (let i = 0; i < n; i++) out.add(`${r},${c + i}`);
        c += n;
      }
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; ) {
        const t = at(r, c)?.t;
        let n = 1;
        while (t !== undefined && at(r + n, c)?.t === t) n++;
        if (t !== undefined && n >= 3) for (let i = 0; i < n; i++) out.add(`${r + i},${c}`);
        r += n;
      }
    return out;
  };

  const swapCells = (a: Cell, b: Cell) => {
    const g = grid[a.r][a.c];
    grid[a.r][a.c] = grid[b.r][b.c];
    grid[b.r][b.c] = g;
  };

  const findMove = (): [Cell, Cell] | null => {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        for (const [dr, dc] of [
          [0, 1],
          [1, 0],
        ]) {
          const b = { r: r + dr, c: c + dc };
          if (b.r >= ROWS || b.c >= COLS) continue;
          swapCells({ r, c }, b);
          const ok = findMatches().size > 0;
          swapCells({ r, c }, b);
          if (ok) return [{ r, c }, b];
        }
    return null;
  };

  // Tabuleiro sem trinca pronta e com pelo menos uma jogada possível.
  const fill = () => {
    do {
      grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ t: 0, oy: 0, fade: 0 })));
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          let t: number;
          do t = rnd();
          while ((c >= 2 && grid[r][c - 1]!.t === t && grid[r][c - 2]!.t === t) || (r >= 2 && grid[r - 1][c]!.t === t && grid[r - 2][c]!.t === t));
          grid[r][c]!.t = t;
        }
    } while (!findMove());
  };

  const reset = () => {
    fill();
    // Peças entram caindo.
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) grid[r][c]!.oy = -(ROWS + 1) * CELL + r * 6;
    phase = "fall";
    sel = null;
    swap = null;
    combo = 0;
    score = 0;
    timeLeft = START_TIME;
    elapsed = 0;
    particles = [];
    popups = [];
    hint = 0;
    hooks.onScore(0);
  };

  const trySwap = (a: Cell, b: Cell) => {
    if (phase !== "idle" || state !== "play") return;
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1 || b.r < 0 || b.r >= ROWS || b.c < 0 || b.c >= COLS) return;
    sel = null;
    hint = 0;
    swap = { a, b, t: 0, back: false };
    phase = "swap";
  };

  const startClear = (m: Set<string>) => {
    clearing = m;
    clearT = 0.2;
    phase = "clear";
  };

  const collapse = () => {
    let gained = 0;
    let sx = 0;
    let sy = 0;
    for (const k of clearing) {
      const [r, c] = k.split(",").map(Number);
      const g = grid[r][c];
      const x = OX + c * CELL + CELL / 2;
      const y = TOP + r * CELL + CELL / 2;
      if (g) burst(particles, x, y, COLORS[g.t], 6, 170);
      grid[r][c] = null;
      gained++;
      sx += x;
      sy += y;
    }
    const pts = gained * 10 * combo + (gained > 3 ? (gained - 3) * 20 : 0);
    score += pts;
    hooks.onScore(score);
    timeLeft = Math.min(MAX_TIME, timeLeft + gained * 0.5 + (combo - 1) * 0.6);
    popups.push({ x: sx / gained, y: sy / gained, text: combo > 1 ? `+${pts} x${combo}` : `+${pts}`, t: 0.9 });
    // Gravidade: as peças descem e novas caem do alto.
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const g = grid[r][c];
        if (!g) continue;
        if (write !== r) {
          grid[write][c] = g;
          grid[r][c] = null;
          g.oy -= (write - r) * CELL;
        }
        write--;
      }
      const missing = write + 1;
      for (let r = write; r >= 0; r--) grid[r][c] = { t: rnd(), oy: -missing * CELL - 8, fade: 0 };
    }
    clearing = new Set();
    phase = "fall";
  };

  const update = (dt: number) => {
    stepParticles(particles, dt, 500);
    for (const p of popups) {
      p.t -= dt;
      p.y -= 30 * dt;
    }
    popups = popups.filter((p) => p.t > 0);
    if (state === "over") {
      overT -= dt;
      if (overT <= 0) {
        state = "idle";
        loop.stop();
        hooks.onOver(score);
      }
      return;
    }
    if (state !== "play") return;

    elapsed += dt;
    hint += dt;
    // O relógio acelera: 1 s por segundo no começo, até 2,5 s por segundo.
    timeLeft -= dt * Math.min(2.5, 1 + elapsed / 100);
    if (timeLeft <= 0 && phase === "idle") {
      timeLeft = 0;
      state = "over";
      overT = 0.9;
      return;
    }

    if (phase === "swap" && swap) {
      swap.t += dt / 0.14;
      if (swap.t >= 1) {
        swapCells(swap.a, swap.b);
        if (swap.back) {
          swap = null;
          phase = "idle";
        } else {
          const m = findMatches();
          if (m.size) {
            swap = null;
            combo = 1;
            startClear(m);
          } else {
            // Não formou trinca: anima a volta (a grade só é destrocada no fim).
            swap = { a: swap.b, b: swap.a, t: 0, back: true };
          }
        }
      }
    } else if (phase === "clear") {
      clearT -= dt;
      if (clearT <= 0) collapse();
    } else if (phase === "fall") {
      let moving = false;
      for (const row of grid)
        for (const g of row) {
          if (!g || g.oy >= 0) continue;
          g.oy = Math.min(0, g.oy + 1100 * dt);
          moving = true;
        }
      if (!moving) {
        const m = findMatches();
        if (m.size) {
          combo++;
          startClear(m);
        } else {
          combo = 0;
          phase = "idle";
          if (!findMove()) {
            // Sem jogada possível: embaralha (as peças caem de novo).
            fill();
            for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) grid[r][c]!.oy = -(ROWS + 1) * CELL;
            popups.push({ x: W / 2, y: TOP + (ROWS * CELL) / 2, text: "EMBARALHANDO", t: 1.2 });
            phase = "fall";
          }
        }
      }
    }
  };

  const drawGem = (t: number, x: number, y: number, s: number) => {
    const r = s / 2;
    ctx.fillStyle = COLORS[t];
    ctx.beginPath();
    switch (t) {
      case 0: // quadrado
        ctx.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6);
        break;
      case 1: // losango
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        break;
      case 2: // círculo
        ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
        break;
      case 3: // triângulo
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y + r * 0.8);
        ctx.lineTo(x - r, y + r * 0.8);
        break;
      case 4: {
        // cruz
        const k = r * 0.38;
        ctx.rect(x - k, y - r, k * 2, r * 2);
        ctx.rect(x - r, y - k, r * 2, k * 2);
        break;
      }
      default: // hexágono
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          const px = x + Math.cos(a) * r * 0.95;
          const py = y + Math.sin(a) * r * 0.95;
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x - r * 0.35, y - r * 0.45, r * 0.3, r * 0.2);
  };

  const draw = () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);

    // Relógio.
    const frac = Math.max(0, timeLeft / MAX_TIME);
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = C.muted;
    ctx.fillText("TEMPO", OX, 24);
    ctx.textAlign = "right";
    ctx.fillStyle = timeLeft < 10 ? C.danger : C.paper;
    ctx.fillText(`${Math.ceil(timeLeft)}s`, W - OX, 24);
    ctx.fillStyle = C.muted;
    ctx.fillText(`RITMO x${Math.min(2.5, 1 + elapsed / 100).toFixed(1)}`, W - OX - 40, 24);
    ctx.textAlign = "left";
    ctx.fillStyle = C.ink3;
    ctx.fillRect(OX, 34, W - OX * 2, 12);
    ctx.fillStyle = timeLeft < 10 ? (Math.floor(elapsed * 4) % 2 ? C.danger : C.warn) : C.acc;
    ctx.fillRect(OX, 34, (W - OX * 2) * frac, 12);

    // Tabuleiro.
    ctx.fillStyle = C.ink2;
    ctx.fillRect(OX, TOP, COLS * CELL, ROWS * CELL);
    ctx.save();
    ctx.beginPath();
    ctx.rect(OX, TOP, COLS * CELL, ROWS * CELL);
    ctx.clip();
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if ((r + c) % 2) {
          ctx.fillStyle = C.ink3;
          ctx.fillRect(OX + c * CELL, TOP + r * CELL, CELL, CELL);
        }
      }
    const pos = (r: number, c: number) => ({ x: OX + c * CELL + CELL / 2, y: TOP + r * CELL + CELL / 2 });
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const g = grid[r]?.[c];
        if (!g) continue;
        let { x, y } = pos(r, c);
        y += g.oy;
        if (swap) {
          const k = swap.t < 0.5 ? 2 * swap.t * swap.t : 1 - (-2 * swap.t + 2) ** 2 / 2;
          const other = r === swap.a.r && c === swap.a.c ? swap.b : r === swap.b.r && c === swap.b.c ? swap.a : null;
          if (other) {
            const o = pos(other.r, other.c);
            x += (o.x - x) * k;
            y += (o.y - y) * k;
          }
        }
        let size = CELL * 0.62;
        if (clearing.has(`${r},${c}`)) {
          ctx.globalAlpha = Math.max(0, clearT / 0.2);
          size *= 1 + (0.2 - clearT) * 2;
        }
        if (sel && sel.r === r && sel.c === c) size *= 1 + Math.sin(elapsed * 10) * 0.08;
        drawGem(g.t, x, y, size);
        ctx.globalAlpha = 1;
      }
    // Seleção, cursor do teclado e dica após 6 s parado.
    const box = (cell: Cell, color: string, w = 2) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.strokeRect(OX + cell.c * CELL + 2, TOP + cell.r * CELL + 2, CELL - 4, CELL - 4);
    };
    if (sel) box(sel, C.paper, 3);
    if (showCursor && state === "play") box(cursor, C.acc);
    if (hint > 6 && phase === "idle" && state === "play") {
      const mv = findMove();
      if (mv && Math.floor(elapsed * 3) % 2) for (const m of mv) box(m, "rgba(238,243,234,0.6)");
    }
    ctx.restore();

    drawParticles(ctx, particles);
    ctx.textAlign = "center";
    ctx.font = `700 16px ${MONO}`;
    for (const p of popups) {
      ctx.globalAlpha = Math.min(1, p.t * 2);
      ctx.fillStyle = C.paper;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  const cellAt = (e: Event): Cell | null => {
    const p = toLocal(canvas, e as PointerEvent, W, H);
    const c = Math.floor((p.x - OX) / CELL);
    const r = Math.floor((p.y - TOP) / CELL);
    return r >= 0 && r < ROWS && c >= 0 && c < COLS ? { r, c } : null;
  };
  let down: { cell: Cell; x: number; y: number } | null = null;
  const onDown = (e: Event) => {
    e.preventDefault();
    if (state !== "play") return;
    showCursor = false;
    const cell = cellAt(e);
    if (!cell) return;
    const p = toLocal(canvas, e as PointerEvent, W, H);
    down = { cell, x: p.x, y: p.y };
    if (sel && Math.abs(sel.r - cell.r) + Math.abs(sel.c - cell.c) === 1) {
      trySwap(sel, cell);
      down = null;
    } else sel = sel && sel.r === cell.r && sel.c === cell.c ? null : cell;
  };
  const onMove = (e: Event) => {
    if (!down) return;
    const p = toLocal(canvas, e as PointerEvent, W, H);
    const dx = p.x - down.x;
    const dy = p.y - down.y;
    if (Math.hypot(dx, dy) < CELL * 0.4) return;
    const d = Math.abs(dx) > Math.abs(dy) ? { r: 0, c: Math.sign(dx) } : { r: Math.sign(dy), c: 0 };
    trySwap(down.cell, { r: down.cell.r + d.r, c: down.cell.c + d.c });
    down = null;
  };
  const onUp = () => {
    down = null;
  };
  const ARROWS: Record<string, Cell> = { ArrowUp: { r: -1, c: 0 }, ArrowDown: { r: 1, c: 0 }, ArrowLeft: { r: 0, c: -1 }, ArrowRight: { r: 0, c: 1 } };
  const onKey = (e: Event) => {
    const k = e as KeyboardEvent;
    if (state !== "play") return;
    const d = ARROWS[k.code];
    if (d) {
      k.preventDefault();
      showCursor = true;
      const next = { r: cursor.r + d.r, c: cursor.c + d.c };
      if (sel) {
        trySwap(sel, next);
        sel = null;
      }
      if (next.r >= 0 && next.r < ROWS && next.c >= 0 && next.c < COLS) cursor = next;
    } else if (k.code === "Space" || k.code === "Enter") {
      k.preventDefault();
      showCursor = true;
      sel = sel ? null : { ...cursor };
    }
  };
  const off = listen([window, "keydown", onKey], [canvas, "pointerdown", onDown], [canvas, "pointermove", onMove], [window, "pointerup", onUp]);

  reset();
  phase = "idle";
  for (const row of grid) for (const g of row) g!.oy = 0;
  draw();

  return {
    start() {
      reset();
      state = "play";
      loop.start();
    },
    pause() {
      loop.stop();
      down = null;
    },
    resume() {
      if (state !== "idle") loop.start();
    },
    destroy() {
      loop.stop();
      off();
    },
  };
};
