// Sudoku infinito: resolveu o quadro, vem outro mais difícil (fácil → médio → difícil).
// Cada quadro é gerado na hora, com solução única. Número errado custa uma vida e não é
// colocado; resolver um quadro devolve uma vida (máximo 3).
import { burst, C, createLoop, drawParticles, listen, MONO, setupCanvas, stepParticles, toLocal, type GameFactory, type Particle } from "./engine";

const LEVELS = [
  { name: "FÁCIL", clues: 40, mult: 1 },
  { name: "MÉDIO", clues: 33, mult: 2 },
  { name: "DIFÍCIL", clues: 27, mult: 3 },
];
// Quadros 1–2 fáceis, 3–4 médios, do 5 em diante difíceis.
const levelOf = (n: number) => LEVELS[n <= 2 ? 0 : n <= 4 ? 1 : 2];
const MAX_LIVES = 3;
const TOP = 40;

const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const bits = (m: number) => {
  let n = 0;
  for (; m; m &= m - 1) n++;
  return n;
};
const boxOf = (i: number) => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);

/** Quadro completo válido, embaralhando um padrão base (linhas/colunas por faixa e dígitos). */
function solvedGrid(): number[] {
  const order = () => shuffle([0, 1, 2]).flatMap((g) => shuffle([0, 1, 2]).map((k) => g * 3 + k));
  const rows = order();
  const cols = order();
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const g: number[] = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) g.push(nums[(3 * (rows[r] % 3) + Math.floor(rows[r] / 3) + cols[c]) % 9]);
  return g;
}

/** Conta soluções (para no limite). Usa a casa com menos candidatos primeiro. */
function countSolutions(src: number[], limit = 2) {
  const g = src.slice();
  const R = new Array(9).fill(0);
  const K = new Array(9).fill(0);
  const B = new Array(9).fill(0);
  g.forEach((v, i) => {
    if (!v) return;
    const b = 1 << (v - 1);
    R[Math.floor(i / 9)] |= b;
    K[i % 9] |= b;
    B[boxOf(i)] |= b;
  });
  let count = 0;
  const rec = () => {
    let best = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const mask = ~(R[Math.floor(i / 9)] | K[i % 9] | B[boxOf(i)]) & 0x1ff;
      const n = bits(mask);
      if (n < bestN) {
        best = i;
        bestMask = mask;
        bestN = n;
        if (n === 0) return;
      }
    }
    if (best < 0) {
      count++;
      return;
    }
    const r = Math.floor(best / 9);
    const c = best % 9;
    const b = boxOf(best);
    for (let d = 0; d < 9; d++) {
      const bit = 1 << d;
      if (!(bestMask & bit)) continue;
      g[best] = d + 1;
      R[r] |= bit;
      K[c] |= bit;
      B[b] |= bit;
      rec();
      g[best] = 0;
      R[r] &= ~bit;
      K[c] &= ~bit;
      B[b] &= ~bit;
      if (count >= limit) return;
    }
  };
  rec();
  return count;
}

/** Tira números do quadro completo até sobrar `clues` pistas, sempre com solução única. */
function makePuzzle(clues: number) {
  const solution = solvedGrid();
  const puzzle = solution.slice();
  let left = 81;
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k))) {
    if (left <= clues) break;
    const v = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle) === 1) left--;
    else puzzle[i] = v;
  }
  return { solution, puzzle };
}

type Btn = { x: number; y: number; w: number; h: number; kind: "num" | "notes" | "clear"; d: number };

export const create: GameFactory = (canvas, hooks, { W, H, landscape }) => {
  const ctx = setupCanvas(canvas, W, H);
  const CELL = landscape ? 44 : 38;
  const GX = landscape ? 24 : Math.round((W - CELL * 9) / 2);
  const GY = landscape ? 46 : 48;

  const buttons: Btn[] = [];
  if (landscape) {
    for (let d = 1; d <= 9; d++) buttons.push({ x: 456 + ((d - 1) % 3) * 84, y: 62 + Math.floor((d - 1) / 3) * 68, w: 72, h: 56, kind: "num", d });
    buttons.push({ x: 456, y: 282, w: 114, h: 46, kind: "notes", d: 0 });
    buttons.push({ x: 582, y: 282, w: 114, h: 46, kind: "clear", d: 0 });
  } else {
    for (let d = 1; d <= 9; d++) buttons.push({ x: 6 + (d - 1) * 39, y: 404, w: 35, h: 52, kind: "num", d });
    buttons.push({ x: 8, y: 470, w: 168, h: 46, kind: "notes", d: 0 });
    buttons.push({ x: 184, y: 470, w: 168, h: 46, kind: "clear", d: 0 });
  }

  let solution: number[] = [];
  let given: boolean[] = [];
  let board: number[] = [];
  let notes: number[] = [];
  let sel = 40;
  let notesMode = false;
  let level = 1;
  let lives = MAX_LIVES;
  let score = 0;
  let time = 0;
  let state: "idle" | "play" | "over" = "idle";
  let overT = 0;
  let bannerT = 0;
  let banner = "";
  let nextT = 0;
  let flash: { i: number; t: number } | null = null;
  let particles: Particle[] = [];
  let showCursor = false;

  const cx = (i: number) => GX + (i % 9) * CELL + CELL / 2;
  const cy = (i: number) => GY + Math.floor(i / 9) * CELL + CELL / 2;

  const newBoard = () => {
    const lv = levelOf(level);
    const p = makePuzzle(lv.clues);
    solution = p.solution;
    board = p.puzzle.slice();
    given = p.puzzle.map((v) => v !== 0);
    notes = new Array(81).fill(0);
    flash = null;
    time = 0;
    const first = board.findIndex((v) => v === 0);
    sel = first < 0 ? 40 : first;
    banner = `QUADRO ${level} · ${lv.name}`;
    bannerT = 1.3;
  };

  const reset = () => {
    level = 1;
    lives = MAX_LIVES;
    score = 0;
    notesMode = false;
    particles = [];
    nextT = 0;
    newBoard();
    hooks.onScore(0);
  };

  const count = (d: number) => board.filter((v) => v === d).length;

  const lose = (i: number) => {
    lives--;
    flash = { i, t: 0.5 };
    burst(particles, cx(i), cy(i), C.danger, 14, 200);
    navigator.vibrate?.(40);
    if (lives <= 0) {
      state = "over";
      overT = 1.1;
      banner = "SEM VIDAS";
      bannerT = 1.1;
    }
  };

  const finish = () => {
    const lv = levelOf(level);
    score += 200 * lv.mult + Math.max(0, Math.floor((300 - time) / 3)) * lv.mult;
    hooks.onScore(score);
    if (lives < MAX_LIVES) lives++;
    banner = "QUADRO RESOLVIDO!";
    bannerT = 1.2;
    nextT = 1.2;
    for (let i = 0; i < 81; i += 4) burst(particles, cx(i), cy(i), C.acc, 6, 260);
  };

  const place = (d: number) => {
    if (state !== "play" || nextT > 0 || given[sel] || board[sel]) return;
    if (notesMode) {
      notes[sel] ^= 1 << (d - 1);
      return;
    }
    if (solution[sel] !== d) return lose(sel);
    board[sel] = d;
    notes[sel] = 0;
    score += 10 * levelOf(level).mult;
    hooks.onScore(score);
    burst(particles, cx(sel), cy(sel), C.acc, 8, 150);
    // Limpa o número das anotações da linha, coluna e quadrado.
    const r = Math.floor(sel / 9);
    const c = sel % 9;
    for (let k = 0; k < 81; k++) if (Math.floor(k / 9) === r || k % 9 === c || boxOf(k) === boxOf(sel)) notes[k] &= ~(1 << (d - 1));
    if (board.every((v) => v)) finish();
  };

  const clear = () => {
    if (state === "play" && nextT <= 0 && !board[sel]) notes[sel] = 0;
  };

  const update = (dt: number) => {
    stepParticles(particles, dt, 400);
    bannerT = Math.max(0, bannerT - dt);
    if (flash) {
      flash.t -= dt;
      if (flash.t <= 0) flash = null;
    }
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
    if (nextT > 0) {
      nextT -= dt;
      if (nextT <= 0) {
        level++;
        newBoard();
      }
    } else time += dt;
  };

  const btn = (b: Btn, label: string, fill: string, ink: string, size = 22) => {
    ctx.fillStyle = fill;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = C.lineSoft;
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.font = `700 ${size}px ${MONO}`;
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + size * 0.35);
    ctx.textAlign = "left";
  };

  const draw = () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    // Barra: quadro, nível, vidas e tempo.
    ctx.fillStyle = C.ink2;
    ctx.fillRect(0, 0, W, TOP);
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = C.acc;
    ctx.fillText(`QUADRO ${String(level).padStart(2, "0")}`, 12, 25);
    ctx.fillStyle = C.muted;
    ctx.fillText(levelOf(level).name, landscape ? 110 : 98, 25);
    const m = Math.floor(time / 60);
    const s = String(Math.floor(time % 60)).padStart(2, "0");
    ctx.textAlign = "right";
    ctx.fillText(`${m}:${s}`, W - 12, 25);
    ctx.fillStyle = C.danger;
    ctx.fillText("♥".repeat(Math.max(0, lives)) + "·".repeat(MAX_LIVES - Math.max(0, lives)), W - 66, 25);
    ctx.textAlign = "left";

    const selV = board[sel];
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const x = GX + c * CELL;
      const y = GY + r * CELL;
      const related = r === Math.floor(sel / 9) || c === sel % 9 || boxOf(i) === boxOf(sel);
      let fill = related ? C.ink3 : C.ink2;
      if (selV && board[i] === selV) fill = "#26360f";
      if (i === sel) fill = C.accDeep;
      if (flash && flash.i === i) fill = C.danger;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, CELL, CELL);
      if (board[i]) {
        ctx.font = `700 ${Math.round(CELL * 0.55)}px ${MONO}`;
        ctx.textAlign = "center";
        ctx.fillStyle = given[i] ? C.paper : C.acc;
        ctx.fillText(String(board[i]), x + CELL / 2, y + CELL * 0.69);
        ctx.textAlign = "left";
      } else if (notes[i]) {
        ctx.font = `700 ${Math.round(CELL * 0.26)}px ${MONO}`;
        ctx.fillStyle = C.muted;
        ctx.textAlign = "center";
        for (let d = 0; d < 9; d++)
          if (notes[i] & (1 << d)) ctx.fillText(String(d + 1), x + CELL * (0.2 + (d % 3) * 0.3), y + CELL * (0.34 + Math.floor(d / 3) * 0.28));
        ctx.textAlign = "left";
      }
    }
    // Linhas: finas por casa, grossas por quadrado 3×3.
    for (let k = 0; k <= 9; k++) {
      const thick = k % 3 === 0;
      ctx.strokeStyle = thick ? C.acc : C.line;
      ctx.globalAlpha = thick ? 0.55 : 1;
      ctx.lineWidth = thick ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(GX + k * CELL, GY);
      ctx.lineTo(GX + k * CELL, GY + 9 * CELL);
      ctx.moveTo(GX, GY + k * CELL);
      ctx.lineTo(GX + 9 * CELL, GY + k * CELL);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (showCursor && state === "play") {
      ctx.strokeStyle = C.paper;
      ctx.lineWidth = 2;
      ctx.strokeRect(GX + (sel % 9) * CELL + 2, GY + Math.floor(sel / 9) * CELL + 2, CELL - 4, CELL - 4);
    }

    for (const b of buttons) {
      if (b.kind === "num") {
        const done = count(b.d) >= 9;
        btn(b, done ? "" : String(b.d), done ? C.ink : C.ink3, notesMode ? C.warn : C.paper, landscape ? 26 : 22);
      } else if (b.kind === "notes") btn(b, notesMode ? "ANOTAR ●" : "ANOTAR ○", notesMode ? C.warn : C.ink3, notesMode ? C.ink : C.warn, 13);
      else btn(b, "LIMPAR", C.ink3, C.body, 13);
    }
    if (landscape) {
      ctx.font = `12px ${MONO}`;
      ctx.fillStyle = C.muted;
      ctx.fillText("Número errado custa uma vida.", 456, 364);
      ctx.fillText("Quadro resolvido devolve uma.", 456, 384);
    }

    drawParticles(ctx, particles);
    if (bannerT > 0 && state !== "idle") {
      ctx.globalAlpha = Math.min(1, bannerT * 2);
      ctx.fillStyle = "rgba(6,8,7,0.82)";
      ctx.fillRect(0, GY + CELL * 4.5 - 22, landscape ? GX * 2 + CELL * 9 : W, 42);
      ctx.font = `700 17px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillStyle = C.paper;
      ctx.fillText(banner, (landscape ? GX * 2 + CELL * 9 : W) / 2, GY + CELL * 4.5 + 5);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  const onDown = (e: Event) => {
    const p = e as PointerEvent;
    p.preventDefault();
    if (state !== "play") return;
    showCursor = false;
    const l = toLocal(canvas, p, W, H);
    for (const b of buttons) {
      if (l.x < b.x || l.x > b.x + b.w || l.y < b.y || l.y > b.y + b.h) continue;
      if (b.kind === "num") place(b.d);
      else if (b.kind === "notes") notesMode = !notesMode;
      else clear();
      return;
    }
    const c = Math.floor((l.x - GX) / CELL);
    const r = Math.floor((l.y - GY) / CELL);
    if (c >= 0 && c < 9 && r >= 0 && r < 9) sel = r * 9 + c;
  };
  const onKey = (e: Event) => {
    const k = e as KeyboardEvent;
    if (state !== "play") return;
    const m: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const digit = /^(Digit|Numpad)([1-9])$/.exec(k.code);
    if (m[k.code]) {
      k.preventDefault();
      showCursor = true;
      const r = Math.max(0, Math.min(8, Math.floor(sel / 9) + m[k.code][0]));
      const c = Math.max(0, Math.min(8, (sel % 9) + m[k.code][1]));
      sel = r * 9 + c;
    } else if (digit) {
      k.preventDefault();
      showCursor = true;
      place(Number(digit[2]));
    } else if (k.code === "Backspace" || k.code === "Delete" || k.code === "Digit0" || k.code === "Numpad0") {
      k.preventDefault();
      clear();
    } else if (k.code === "KeyN") {
      k.preventDefault();
      notesMode = !notesMode;
    }
  };
  const off = listen([canvas, "pointerdown", onDown], [window, "keydown", onKey]);

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
