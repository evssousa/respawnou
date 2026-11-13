// Campo Minado infinito: limpou o campo, vem outro com mais minas. O primeiro toque de cada
// campo nunca é mina. Bandeira: botão direito, toque longo ou o modo bandeira (canto superior).
import { burst, C, createLoop, listen, MONO, setupCanvas, stepParticles, drawParticles, toLocal, type GameFactory, type Particle } from "./engine";

const COLS = 9;
const ROWS = 12;
const CELL = 40;
const TOP = 48;
const W = COLS * CELL;
const H = TOP + ROWS * CELL;
const NUM = ["", "#4fd8ff", C.acc, C.warn, C.danger, "#b48cff", C.paper, C.body, C.muted];
const FLAG_BTN = { x: W - 108, y: 8, w: 100, h: 32 };

type Cell = { mine: boolean; open: boolean; flag: boolean; n: number };

export const create: GameFactory = (canvas, hooks) => {
  const ctx = setupCanvas(canvas, W, H);
  let grid: Cell[] = [];
  let armed = false;
  let level = 1;
  let score = 0;
  let flagMode = false;
  let particles: Particle[] = [];
  let boom: number | null = null;
  let banner = "";
  let bannerT = 0;
  let nextT = 0;
  let state: "idle" | "play" | "over" = "idle";
  let overT = 0;
  let cursor = { r: 5, c: 4 };
  let showCursor = false;

  const mines = () => Math.min(32, 10 + (level - 1) * 3);
  const idx = (r: number, c: number) => r * COLS + c;
  const around = (i: number) => {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) out.push(idx(rr, cc));
      }
    return out;
  };

  const newField = () => {
    grid = Array.from({ length: ROWS * COLS }, () => ({ mine: false, open: false, flag: false, n: 0 }));
    armed = false;
    boom = null;
    banner = `CAMPO ${level} · ${mines()} MINAS`;
    bannerT = 1.2;
  };

  // Minas só são sorteadas no primeiro toque, longe dele (3×3 livre).
  const arm = (safe: number) => {
    const forbidden = new Set([safe, ...around(safe)]);
    let placed = 0;
    while (placed < mines()) {
      const i = Math.floor(Math.random() * grid.length);
      if (grid[i].mine || forbidden.has(i)) continue;
      grid[i].mine = true;
      placed++;
    }
    grid.forEach((g, i) => (g.n = around(i).filter((k) => grid[k].mine).length));
    armed = true;
  };

  const reset = () => {
    level = 1;
    score = 0;
    flagMode = false;
    particles = [];
    nextT = 0;
    newField();
    hooks.onScore(0);
  };

  const reveal = (start: number) => {
    const stack = [start];
    let opened = 0;
    while (stack.length) {
      const i = stack.pop()!;
      const g = grid[i];
      if (g.open || g.flag) continue;
      g.open = true;
      opened++;
      if (g.n === 0 && !g.mine) for (const k of around(i)) if (!grid[k].open) stack.push(k);
    }
    return opened;
  };

  const explode = (i: number) => {
    boom = i;
    for (const g of grid) if (g.mine) g.open = true;
    const x = (i % COLS) * CELL + CELL / 2;
    const y = TOP + Math.floor(i / COLS) * CELL + CELL / 2;
    burst(particles, x, y, C.danger, 30, 320);
    burst(particles, x, y, C.warn, 16, 220);
    state = "over";
    overT = 1.3;
  };

  const checkClear = () => {
    if (!grid.every((g) => g.mine || g.open)) return;
    score += 50 * level;
    hooks.onScore(score);
    banner = "CAMPO LIMPO!";
    bannerT = 1;
    nextT = 1.1;
    for (const g of grid) if (g.mine) g.flag = true;
  };

  const open = (i: number) => {
    if (state !== "play" || nextT > 0) return;
    const g = grid[i];
    if (g.flag) return;
    if (!armed) arm(i);
    if (g.open) {
      // "Acorde": número com as bandeiras certas ao redor abre os vizinhos.
      const nb = around(i);
      if (g.n > 0 && nb.filter((k) => grid[k].flag).length === g.n) {
        for (const k of nb) {
          if (grid[k].flag || grid[k].open) continue;
          if (grid[k].mine) return explode(k);
          score += reveal(k) * level;
        }
        hooks.onScore(score);
        checkClear();
      }
      return;
    }
    if (g.mine) return explode(i);
    score += reveal(i) * level;
    hooks.onScore(score);
    checkClear();
  };

  const flag = (i: number) => {
    if (state !== "play" || nextT > 0) return;
    const g = grid[i];
    if (g.open) return;
    g.flag = !g.flag;
  };

  const update = (dt: number) => {
    stepParticles(particles, dt, 500);
    bannerT = Math.max(0, bannerT - dt);
    if (state === "over") {
      overT -= dt;
      if (overT <= 0) {
        state = "idle";
        loop.stop();
        hooks.onOver(score);
      }
      return;
    }
    if (state === "play" && nextT > 0) {
      nextT -= dt;
      if (nextT <= 0) {
        level++;
        newField();
      }
    }
  };

  const draw = () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    // Barra: fase, minas restantes e modo bandeira.
    ctx.fillStyle = C.ink2;
    ctx.fillRect(0, 0, W, TOP);
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = C.acc;
    ctx.fillText(`CAMPO ${String(level).padStart(2, "0")}`, 12, 29);
    const left = mines() - grid.filter((g) => g.flag).length;
    ctx.fillStyle = C.muted;
    ctx.fillText(`MINAS ${left}`, 104, 29);
    ctx.fillStyle = flagMode ? C.warn : C.ink3;
    ctx.fillRect(FLAG_BTN.x, FLAG_BTN.y, FLAG_BTN.w, FLAG_BTN.h);
    ctx.fillStyle = flagMode ? C.ink : C.warn;
    ctx.fillText(flagMode ? "BANDEIRA ●" : "BANDEIRA ○", FLAG_BTN.x + 10, FLAG_BTN.y + 21);

    grid.forEach((g, i) => {
      const x = (i % COLS) * CELL;
      const y = TOP + Math.floor(i / COLS) * CELL;
      if (g.open) {
        ctx.fillStyle = i === boom ? C.danger : C.ink2;
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        if (g.mine) {
          ctx.fillStyle = i === boom ? C.ink : C.danger;
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(x + CELL / 2 - 1.5, y + 7, 3, CELL - 14);
          ctx.fillRect(x + 7, y + CELL / 2 - 1.5, CELL - 14, 3);
        } else if (g.n) {
          ctx.font = `700 20px ${MONO}`;
          ctx.textAlign = "center";
          ctx.fillStyle = NUM[g.n];
          ctx.fillText(String(g.n), x + CELL / 2, y + CELL / 2 + 7);
          ctx.textAlign = "left";
        }
      } else {
        ctx.fillStyle = C.ink3;
        ctx.fillRect(x, y, CELL, CELL);
        ctx.fillStyle = C.lineSoft;
        ctx.fillRect(x + 1, y + 1, CELL - 2, 3);
        ctx.fillRect(x + 1, y + 1, 3, CELL - 2);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(x + 1, y + CELL - 4, CELL - 2, 3);
        ctx.fillRect(x + CELL - 4, y + 1, 3, CELL - 2);
        if (g.flag) {
          ctx.fillStyle = C.paper;
          ctx.fillRect(x + 15, y + 9, 2, 22);
          ctx.fillStyle = C.warn;
          ctx.beginPath();
          ctx.moveTo(x + 17, y + 9);
          ctx.lineTo(x + 29, y + 15);
          ctx.lineTo(x + 17, y + 21);
          ctx.fill();
        }
      }
    });
    if (showCursor && state === "play") {
      ctx.strokeStyle = C.paper;
      ctx.lineWidth = 3;
      ctx.strokeRect(cursor.c * CELL + 2, TOP + cursor.r * CELL + 2, CELL - 4, CELL - 4);
    }
    drawParticles(ctx, particles);
    if (bannerT > 0 && state !== "idle") {
      ctx.globalAlpha = Math.min(1, bannerT * 2);
      ctx.fillStyle = "rgba(6,8,7,0.8)";
      ctx.fillRect(0, H / 2 - 24, W, 42);
      ctx.font = `700 17px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillStyle = C.paper;
      ctx.fillText(banner, W / 2, H / 2 + 3);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  // Toque longo (0,4 s) = bandeira; toque curto = abrir (ou bandeira no modo bandeira).
  let press: { i: number; t: number; x: number; y: number; long: boolean } | null = null;
  let longTimer = 0;
  const cellAt = (x: number, y: number) => {
    const c = Math.floor(x / CELL);
    const r = Math.floor((y - TOP) / CELL);
    return r >= 0 && r < ROWS && c >= 0 && c < COLS ? idx(r, c) : -1;
  };
  const onDown = (e: Event) => {
    const p = e as PointerEvent;
    p.preventDefault();
    if (state !== "play") return;
    showCursor = false;
    const l = toLocal(canvas, p, W, H);
    if (l.x >= FLAG_BTN.x && l.y <= FLAG_BTN.y + FLAG_BTN.h) {
      flagMode = !flagMode;
      return;
    }
    const i = cellAt(l.x, l.y);
    if (i < 0) return;
    if (p.button === 2) return flag(i);
    press = { i, t: performance.now(), x: l.x, y: l.y, long: false };
    clearTimeout(longTimer);
    longTimer = window.setTimeout(() => {
      if (!press) return;
      press.long = true;
      flag(press.i);
      navigator.vibrate?.(30);
    }, 400);
  };
  const onUp = () => {
    clearTimeout(longTimer);
    if (!press) return;
    const { i, long } = press;
    press = null;
    if (long) return;
    if (flagMode && !grid[i].open) flag(i);
    else open(i);
  };
  const onMove = (e: Event) => {
    if (!press) return;
    const l = toLocal(canvas, e as PointerEvent, W, H);
    if (Math.hypot(l.x - press.x, l.y - press.y) > 14) {
      clearTimeout(longTimer);
      press = null;
    }
  };
  const onKey = (e: Event) => {
    const k = e as KeyboardEvent;
    if (state !== "play") return;
    const m: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (m[k.code]) {
      k.preventDefault();
      showCursor = true;
      cursor = { r: Math.max(0, Math.min(ROWS - 1, cursor.r + m[k.code][0])), c: Math.max(0, Math.min(COLS - 1, cursor.c + m[k.code][1])) };
    } else if (k.code === "Space" || k.code === "Enter") {
      k.preventDefault();
      showCursor = true;
      open(idx(cursor.r, cursor.c));
    } else if (k.code === "KeyF") {
      k.preventDefault();
      showCursor = true;
      flag(idx(cursor.r, cursor.c));
    }
  };
  const noMenu = (e: Event) => e.preventDefault();
  const off = listen(
    [canvas, "pointerdown", onDown],
    [canvas, "pointermove", onMove],
    [window, "pointerup", onUp],
    [canvas, "contextmenu", noMenu],
    [window, "keydown", onKey],
  );

  reset();
  bannerT = 0;
  draw();

  return {
    start() {
      reset();
      state = "play";
      loop.start();
    },
    pause() {
      loop.stop();
      clearTimeout(longTimer);
      press = null;
    },
    resume() {
      if (state !== "idle") loop.start();
    },
    destroy() {
      loop.stop();
      clearTimeout(longTimer);
      off();
    },
  };
};
