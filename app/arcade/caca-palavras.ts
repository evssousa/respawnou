// Caça-palavras de games infinito: ache as palavras escondidas na grade antes do tempo acabar.
// Passou de rodada, vem outra com mais palavras e direções mais difíceis (diagonais e de trás
// para frente). Arraste do começo ao fim da palavra, ou use o teclado.
import { burst, C, createLoop, drawParticles, listen, MONO, setupCanvas, stepParticles, toLocal, type GameFactory, type Particle } from "./engine";

// Palavras do universo dos games, sem nome de jogo, marca ou personagem. Sem acento na grade.
const WORDS = [
  "JOGADOR", "FASE", "CHEFAO", "VIDA", "MOEDA", "NIVEL", "PONTO", "MAPA", "ARMA", "ESPADA", "ESCUDO", "MAGIA",
  "TESOURO", "MISSAO", "HEROI", "VILAO", "DRAGAO", "CASTELO", "PORTAL", "CHAVE", "ITEM", "RECORDE", "COMBO", "PULO",
  "EQUIPE", "SERVIDOR", "CONSOLE", "JOYSTICK", "TECLADO", "CONTROLE", "TELA", "PIXEL", "MODO", "ALIADO", "INIMIGO",
  "ARENA", "BONUS", "SEGREDO", "ZUMBI", "ROBO", "NAVE", "PLANETA", "CORRIDA", "PISTA", "TURBO", "GOLPE", "DEFESA",
  "RESPAWN", "CHECKPOINT", "PODER", "ENIGMA", "ARQUEIRO", "GUERREIRO", "PIRATA", "NINJA", "CAVERNA", "FLORESTA",
];

const TOP = 40;
const DIRS: [number, number][] = [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1], [-1, 1]];
// Rodadas 1–2: → e ↓; 3–4: + diagonal; 5–6: + de trás para frente; 7+: todas as direções.
const dirsFor = (level: number) => DIRS.slice(0, level <= 2 ? 2 : level <= 4 ? 3 : level <= 6 ? 5 : 8);
const countFor = (level: number) => Math.min(8, 4 + level);
const timeFor = (n: number) => 25 + 12 * n;

const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export interface Placed {
  word: string;
  r: number;
  c: number;
  dr: number;
  dc: number;
  found: boolean;
}

/** Sorteia palavras e as encaixa na grade (cruzamentos só com a mesma letra); completa com letras. */
export function makeBoard(cols: number, rows: number, level: number) {
  const dirs = dirsFor(level);
  const n = countFor(level);
  const pool = shuffle(WORDS.filter((w) => w.length <= Math.max(cols, rows)));
  for (let attempt = 0; attempt < 40; attempt++) {
    const grid: string[] = new Array(cols * rows).fill("");
    const placed: Placed[] = [];
    const pick = shuffle(pool.slice()).slice(0, n).sort((a, b) => b.length - a.length);
    let ok = true;
    for (const word of pick) {
      let done = false;
      for (let t = 0; t < 150 && !done; t++) {
        const [dc, dr] = dirs[Math.floor(Math.random() * dirs.length)];
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        const er = r + dr * (word.length - 1);
        const ec = c + dc * (word.length - 1);
        if (er < 0 || er >= rows || ec < 0 || ec >= cols) continue;
        let fits = true;
        for (let k = 0; k < word.length; k++) {
          const cur = grid[(r + dr * k) * cols + c + dc * k];
          if (cur && cur !== word[k]) {
            fits = false;
            break;
          }
        }
        if (!fits) continue;
        for (let k = 0; k < word.length; k++) grid[(r + dr * k) * cols + c + dc * k] = word[k];
        placed.push({ word, r, c, dr, dc, found: false });
        done = true;
      }
      if (!done) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const letters = "AAAEEEIIOOOUUSSRRNNTTMMCCLLDDPBGFVHQJXZ";
    for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = letters[Math.floor(Math.random() * letters.length)];
    return { grid, placed };
  }
  throw new Error("não coube");
}

export const create: GameFactory = (canvas, hooks, { W, H, landscape }) => {
  const ctx = setupCanvas(canvas, W, H);
  const COLS = landscape ? 12 : 9;
  const ROWS = 9;
  const CELL = landscape ? 40 : 38;
  const GX = landscape ? 16 : Math.round((W - COLS * CELL) / 2);
  const GY = landscape ? 50 : 48;

  let grid: string[] = [];
  let words: Placed[] = [];
  let level = 1;
  let score = 0;
  let timeLeft = 0;
  let state: "idle" | "play" | "over" = "idle";
  let overT = 0;
  let bannerT = 0;
  let banner = "";
  let nextT = 0;
  let particles: Particle[] = [];
  let paintCells: number[][] = []; // casas de cada palavra achada (para colorir)
  let anchor: { r: number; c: number } | null = null;
  let head: { r: number; c: number } | null = null; // ponta atual da seleção
  let dragging = false;
  let cursor = { r: 4, c: 5 };
  let showCursor = false;
  let missT = 0;

  const cx = (c: number) => GX + c * CELL + CELL / 2;
  const cy = (r: number) => GY + r * CELL + CELL / 2;

  const newRound = () => {
    const b = makeBoard(COLS, ROWS, level);
    grid = b.grid;
    words = b.placed.sort((a, b2) => a.word.localeCompare(b2.word));
    paintCells = [];
    anchor = head = null;
    dragging = false;
    timeLeft = timeFor(words.length);
    banner = `RODADA ${level} · ${words.length} PALAVRAS`;
    bannerT = 1.2;
  };

  const reset = () => {
    level = 1;
    score = 0;
    particles = [];
    nextT = 0;
    missT = 0;
    newRound();
    hooks.onScore(0);
  };

  /** Casas do segmento do anchor até a ponta, na direção mais próxima das 8 possíveis. */
  const lineCells = (a: { r: number; c: number }, h: { r: number; c: number }) => {
    const dx = h.c - a.c;
    const dy = h.r - a.r;
    if (!dx && !dy) return [a.r * COLS + a.c];
    const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const sx = Math.round(Math.cos((ang * Math.PI) / 4));
    const sy = Math.round(Math.sin((ang * Math.PI) / 4));
    const len = Math.max(1, Math.round(Math.hypot(dx, dy) / (sx && sy ? Math.SQRT2 : 1)));
    const out: number[] = [];
    for (let k = 0; k <= len; k++) {
      const r = a.r + sy * k;
      const c = a.c + sx * k;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      out.push(r * COLS + c);
    }
    return out;
  };

  const submit = (cells: number[]) => {
    if (cells.length < 2 || state !== "play" || nextT > 0) return;
    const text = cells.map((i) => grid[i]).join("");
    const rev = [...text].reverse().join("");
    const hit = words.find((w) => !w.found && (w.word === text || w.word === rev));
    if (!hit) {
      missT = 0.25;
      return;
    }
    hit.found = true;
    paintCells.push(cells);
    score += 10 * hit.word.length;
    hooks.onScore(score);
    burst(particles, cx(hit.c + (hit.dc * (hit.word.length - 1)) / 2), cy(hit.r + (hit.dr * (hit.word.length - 1)) / 2), C.acc, 16, 220);
    navigator.vibrate?.(20);
    if (words.every((w) => w.found)) {
      score += Math.round(timeLeft) * 2 + 50 * level;
      hooks.onScore(score);
      banner = "RODADA COMPLETA!";
      bannerT = 1.1;
      nextT = 1.1;
    }
  };

  const update = (dt: number) => {
    stepParticles(particles, dt, 350);
    bannerT = Math.max(0, bannerT - dt);
    missT = Math.max(0, missT - dt);
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
        newRound();
      }
      return;
    }
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      state = "over";
      overT = 1;
      banner = "TEMPO ESGOTADO";
      bannerT = 1;
    }
  };

  const draw = () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.ink2;
    ctx.fillRect(0, 0, W, TOP);
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = C.acc;
    ctx.fillText(`RODADA ${String(level).padStart(2, "0")}`, 12, 25);
    ctx.fillStyle = C.muted;
    ctx.fillText(`${words.filter((w) => w.found).length}/${words.length}`, landscape ? 110 : 98, 25);
    ctx.textAlign = "right";
    ctx.fillStyle = timeLeft < 10 ? C.danger : C.muted;
    ctx.fillText(`${Math.ceil(timeLeft)}s`, W - 12, 25);
    ctx.textAlign = "left";
    // Barra de tempo no pé da barra superior.
    const total = timeFor(words.length || 1);
    ctx.fillStyle = timeLeft < 10 ? C.danger : C.acc;
    ctx.fillRect(0, TOP - 3, (W * Math.max(0, timeLeft)) / total, 3);

    const found = new Set(paintCells.flat());
    const sel = new Set<number>();
    const liveEnd = dragging ? head : showCursor && anchor ? cursor : null;
    if (anchor && liveEnd) for (const i of lineCells(anchor, liveEnd)) sel.add(i);
    else if (anchor) sel.add(anchor.r * COLS + anchor.c);

    ctx.font = `700 ${Math.round(CELL * 0.5)}px ${MONO}`;
    ctx.textAlign = "center";
    for (let i = 0; i < grid.length; i++) {
      const r = Math.floor(i / COLS);
      const c = i % COLS;
      const x = GX + c * CELL;
      const y = GY + r * CELL;
      let fill = (r + c) % 2 ? C.ink2 : C.ink;
      if (found.has(i)) fill = "#26360f";
      if (sel.has(i)) fill = missT > 0 ? "#5a1f12" : C.accDeep;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, CELL, CELL);
      ctx.fillStyle = sel.has(i) ? C.paper : found.has(i) ? C.acc : C.body;
      ctx.fillText(grid[i], x + CELL / 2, y + CELL * 0.67);
    }
    ctx.textAlign = "left";
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(GX + 0.5, GY + 0.5, COLS * CELL - 1, ROWS * CELL - 1);
    if (showCursor && state === "play") {
      ctx.strokeStyle = C.paper;
      ctx.lineWidth = 2;
      ctx.strokeRect(GX + cursor.c * CELL + 2, GY + cursor.r * CELL + 2, CELL - 4, CELL - 4);
    }

    // Lista de palavras: ao lado (PC) ou embaixo (celular).
    ctx.font = `700 ${landscape ? 14 : 12}px ${MONO}`;
    words.forEach((w, i) => {
      const x = landscape ? 520 : 12 + (i % 3) * 116;
      const y = landscape ? 78 + i * 30 : 410 + Math.floor(i / 3) * 28;
      ctx.fillStyle = w.found ? C.accDeep : C.paper;
      ctx.fillText(w.word, x, y);
      if (w.found) ctx.fillRect(x - 2, y - 5, ctx.measureText(w.word).width + 4, 2);
    });
    if (landscape) {
      ctx.font = `12px ${MONO}`;
      ctx.fillStyle = C.muted;
      ctx.fillText("Arraste do começo ao fim.", 520, 336);
      ctx.fillText("Vale de trás para frente.", 520, 356);
    }

    drawParticles(ctx, particles);
    if (bannerT > 0 && state !== "idle") {
      ctx.globalAlpha = Math.min(1, bannerT * 2);
      const bw = COLS * CELL;
      ctx.fillStyle = "rgba(6,8,7,0.82)";
      ctx.fillRect(GX, GY + (ROWS * CELL) / 2 - 22, bw, 42);
      ctx.font = `700 17px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillStyle = C.paper;
      ctx.fillText(banner, GX + bw / 2, GY + (ROWS * CELL) / 2 + 5);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  const cellAt = (x: number, y: number) => {
    const c = Math.floor((x - GX) / CELL);
    const r = Math.floor((y - GY) / CELL);
    return r >= 0 && r < ROWS && c >= 0 && c < COLS ? { r, c } : null;
  };
  const clampCell = (x: number, y: number) => ({
    r: Math.max(0, Math.min(ROWS - 1, Math.floor((y - GY) / CELL))),
    c: Math.max(0, Math.min(COLS - 1, Math.floor((x - GX) / CELL))),
  });
  const onDown = (e: Event) => {
    const p = e as PointerEvent;
    p.preventDefault();
    if (state !== "play") return;
    showCursor = false;
    const l = toLocal(canvas, p, W, H);
    const cell = cellAt(l.x, l.y);
    if (!cell) return;
    anchor = head = cell;
    dragging = true;
  };
  const onMove = (e: Event) => {
    if (!dragging) return;
    const l = toLocal(canvas, e as PointerEvent, W, H);
    head = clampCell(l.x, l.y);
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    if (anchor && head) submit(lineCells(anchor, head));
    anchor = head = null;
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
      if (!anchor) anchor = { ...cursor };
      else {
        submit(lineCells(anchor, cursor));
        anchor = null;
      }
    } else if (k.code === "Backspace") {
      k.preventDefault();
      anchor = null;
    }
  };
  const off = listen([canvas, "pointerdown", onDown], [window, "pointermove", onMove], [window, "pointerup", onUp], [window, "keydown", onKey]);

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
      dragging = false;
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
