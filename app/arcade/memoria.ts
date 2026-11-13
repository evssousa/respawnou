// Memória: ache os pares. Cada fase tem mais cartas (de 6 até 36). Errar um par cuja
// carta você já tinha visto custa uma vida; passar de fase devolve uma (máximo 6).
import { burst, C, createLoop, drawGrid, drawParticles, listen, MONO, setupCanvas, stepParticles, toLocal, type GameFactory, type Particle } from "./engine";

const TOP = 44;
const PINK = "#ff7ad9";
const CYAN = "#4fd8ff";
const VIOLET = "#b48cff";

// Ícones 8×8: "#" cor principal, "o" cor secundária.
const ICONS: { px: string[]; c: string; o?: string }[] = [
  { c: C.danger, px: [".##..##.", "########", "########", "########", ".######.", "..####..", "...##...", "........"] }, // coração
  { c: C.warn, px: ["...##...", "...##...", "########", ".######.", "..####..", ".######.", "##....##", "........"] }, // estrela
  { c: C.warn, px: ["..####..", ".#oooo#.", "#oo##oo#", "#oo##oo#", "#oo##oo#", "#oo##oo#", ".#oooo#.", "..####.."], o: "#c98a10" }, // moeda
  { c: C.paper, px: [".###....", "#...#...", "#...#...", ".###....", "..#.....", "..###...", "..#.....", "..##...."] }, // chave
  { c: C.paper, px: [".......#", "......##", ".....##.", "o...##..", ".o.##...", "..oo....", ".oo.o...", "oo......"], o: C.warn }, // espada
  { c: CYAN, px: ["########", "#oooooo#", "#o####o#", "#o####o#", "#o####o#", ".#o##o#.", "..#oo#..", "...##..."], o: C.ink }, // escudo
  { c: VIOLET, px: ["..ooo...", "...o....", "...#....", "..###...", ".#####..", "#######.", "#######.", ".#####.."], o: C.paper }, // poção
  { c: C.muted, px: ["......o.", ".....o..", "..###...", ".#####..", "##.####.", "#######.", ".#####..", "..###..."], o: C.warn }, // bomba
  { c: CYAN, px: ["..####..", ".######.", "#o##o###", "########", "########", "########", "########", "#.##.##."], o: C.ink }, // fantasma
  { c: C.acc, px: ["........", ".######.", "#.####o#", "...##...", "#.####o#", "########", "##....##", "........"], o: C.danger }, // controle
  { c: C.warn, px: ["#.####.#", "#.####.#", ".######.", "..####..", "...##...", "...##...", "..####..", ".######."] }, // troféu
  { c: VIOLET, px: ["..####..", ".#oo###.", "#oo#####", "########", ".######.", "..####..", "...##...", "........"], o: "#e4d4ff" }, // gema
  { c: C.danger, px: ["..####..", ".#o##o#.", "########", "#o####o#", "########", "..oooo..", "..oooo..", "..oooo.."], o: C.paper }, // cogumelo
  { c: C.acc, px: ["..#..#..", "...##...", ".######.", "##o##o##", "########", ".#.##.#.", "#......#", "........"], o: C.ink }, // alien
  { c: C.warn, px: ["....###.", "...###..", "..###...", ".######.", "....##..", "...##...", "..##....", ".#......"] }, // raio
  { c: C.paper, px: [".######.", "########", "#..##..#", "#..##..#", "########", ".##..##.", ".######.", ".#.##.#."] }, // caveira
  { c: PINK, px: ["######..", "#oooo##.", "#oooo###", "########", "#......#", "#.####.#", "#......#", "########"], o: C.ink }, // disquete
  { c: C.warn, px: ["........", "#..##..#", "##.##.##", "########", "########", "#o#o#o##", "########", "........"], o: C.danger }, // coroa
];

// Tamanho de cada fase: pares, colunas em pé, colunas deitado.
const LEVELS = [
  [3, 3, 6],
  [4, 4, 4],
  [6, 4, 6],
  [8, 4, 8],
  [10, 5, 10],
  [12, 6, 8],
  [15, 6, 10],
  [18, 6, 12],
];

type Card = { icon: number; up: boolean; done: boolean; flip: number; seen: boolean; x: number; y: number };

export const create: GameFactory = (canvas, hooks, { W, H, landscape }) => {
  const ctx = setupCanvas(canvas, W, H);
  let cards: Card[] = [];
  let size = 60;
  let open: number[] = [];
  let lockT = 0;
  let pendingMiss = false;
  let lives = 4;
  let level = 1;
  let score = 0;
  let banner = "";
  let bannerT = 0;
  let nextT = 0;
  let particles: Particle[] = [];
  let state: "idle" | "play" | "over" = "idle";
  let overT = 0;
  let cursor = 0;
  let showCursor = false;
  let cols = 3;

  const deal = () => {
    const [pairs, cp, cl] = LEVELS[Math.min(level, LEVELS.length) - 1];
    cols = landscape ? cl : cp;
    const rows = Math.ceil((pairs * 2) / cols);
    const pool = [...ICONS.keys()].sort(() => Math.random() - 0.5).slice(0, pairs);
    const deck = [...pool, ...pool].sort(() => Math.random() - 0.5);
    const gap = 6;
    size = Math.min(landscape ? 100 : 84, (W - 24 - gap * (cols - 1)) / cols, (H - TOP - 24 - gap * (rows - 1)) / rows);
    const ox = (W - (cols * size + (cols - 1) * gap)) / 2;
    const oy = TOP + (H - TOP - (rows * size + (rows - 1) * gap)) / 2;
    cards = deck.map((icon, i) => ({ icon, up: false, done: false, flip: 0, seen: false, x: ox + (i % cols) * (size + gap), y: oy + Math.floor(i / cols) * (size + gap) }));
    open = [];
    lockT = 0;
    cursor = 0;
    banner = `FASE ${level}`;
    bannerT = 1;
  };

  const reset = () => {
    lives = 4;
    level = 1;
    score = 0;
    particles = [];
    nextT = 0;
    deal();
    hooks.onScore(0);
  };

  const pick = (i: number) => {
    if (state !== "play" || lockT > 0 || nextT > 0) return;
    const card = cards[i];
    if (!card || card.up || card.done) return;
    card.up = true;
    open.push(i);
    if (open.length < 2) return;
    const [a, b] = open.map((k) => cards[k]);
    if (a.icon === b.icon) {
      a.done = b.done = true;
      open = [];
      const pts = 10 * level;
      score += pts;
      hooks.onScore(score);
      for (const c of [a, b]) burst(particles, c.x + size / 2, c.y + size / 2, ICONS[c.icon].c, 10, 160);
      if (cards.every((c) => c.done)) {
        score += 50 * level;
        hooks.onScore(score);
        lives = Math.min(6, lives + 1);
        banner = "FASE COMPLETA";
        bannerT = 1;
        nextT = 1.1;
      }
    } else {
      // Vida só se perde quando dava para saber: o par da 1ª carta já tinha aparecido,
      // ou a 2ª carta já era conhecida (e, portanto, sabidamente errada).
      const knew = cards.some((c, k) => !c.done && c.seen && !open.includes(k) && c.icon === a.icon) || b.seen;
      pendingMiss = knew;
      lockT = 0.75;
    }
  };

  const update = (dt: number) => {
    stepParticles(particles, dt, 300);
    bannerT = Math.max(0, bannerT - dt);
    for (const c of cards) {
      const target = c.up || c.done ? 1 : 0;
      c.flip += Math.sign(target - c.flip) * Math.min(Math.abs(target - c.flip), dt * 7);
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
        deal();
      }
      return;
    }
    if (lockT > 0) {
      lockT -= dt;
      if (lockT <= 0) {
        for (const k of open) {
          cards[k].up = false;
          cards[k].seen = true;
        }
        open = [];
        if (pendingMiss) {
          lives--;
          banner = lives > 0 ? "-1 VIDA" : "";
          bannerT = 0.7;
          if (lives <= 0) {
            state = "over";
            overT = 0.6;
          }
        }
        pendingMiss = false;
      }
    }
  };

  const drawIcon = (icon: number, cx: number, cy: number, s: number) => {
    const { px, c, o } = ICONS[icon];
    const p = s / 8;
    const x0 = cx - s / 2;
    const y0 = cy - s / 2;
    for (let r = 0; r < 8; r++)
      for (let k = 0; k < 8; k++) {
        const ch = px[r][k];
        if (ch === ".") continue;
        ctx.fillStyle = ch === "o" ? (o ?? c) : c;
        ctx.fillRect(Math.floor(x0 + k * p), Math.floor(y0 + r * p), Math.ceil(p), Math.ceil(p));
      }
  };

  const draw = () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, W, H, 24);
    ctx.fillStyle = C.ink2;
    ctx.fillRect(0, 0, W, TOP);
    ctx.fillStyle = C.line;
    ctx.fillRect(0, TOP - 1, W, 1);
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = C.acc;
    ctx.fillText(`FASE ${String(level).padStart(2, "0")}`, 12, 27);
    ctx.textAlign = "right";
    for (let i = 0; i < lives; i++) drawIcon(0, W - 18 - i * 18, 22, 14);
    ctx.textAlign = "left";

    cards.forEach((c, i) => {
      const k = Math.abs(Math.cos(c.flip * Math.PI)); // largura durante a virada
      const face = c.flip > 0.5;
      const w = size * k;
      const x = c.x + (size - w) / 2;
      if (c.done && c.flip >= 1) ctx.globalAlpha = 0.35;
      ctx.fillStyle = face ? C.ink3 : C.accDeep;
      ctx.fillRect(x, c.y, w, size);
      if (face) {
        ctx.strokeStyle = c.done ? C.acc : C.lineSoft;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, c.y + 1, w - 2, size - 2);
        if (k > 0.2) {
          ctx.save();
          ctx.translate(c.x + size / 2, 0);
          ctx.scale(k, 1);
          drawIcon(c.icon, 0, c.y + size / 2, size * 0.62);
          ctx.restore();
        }
      } else {
        // Verso: grade verde do tema.
        ctx.fillStyle = "rgba(200,255,46,0.25)";
        for (let gy = 6; gy < size - 4; gy += 8) ctx.fillRect(x + 4, c.y + gy, Math.max(0, w - 8), 1);
        ctx.fillStyle = C.acc;
        ctx.fillRect(c.x + size / 2 - 3 * k, c.y + size / 2 - 3, 6 * k, 6);
      }
      ctx.globalAlpha = 1;
      if (showCursor && i === cursor && state === "play") {
        ctx.strokeStyle = C.paper;
        ctx.lineWidth = 3;
        ctx.strokeRect(c.x - 3, c.y - 3, size + 6, size + 6);
      }
    });
    drawParticles(ctx, particles);
    if (bannerT > 0 && banner) {
      ctx.globalAlpha = Math.min(1, bannerT * 2);
      ctx.fillStyle = "rgba(6,8,7,0.75)";
      ctx.fillRect(0, H / 2 - 26, W, 44);
      ctx.font = `700 20px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillStyle = banner.startsWith("-") ? C.danger : C.paper;
      ctx.fillText(banner, W / 2, H / 2 + 3);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  const onDown = (e: Event) => {
    e.preventDefault();
    showCursor = false;
    const p = toLocal(canvas, e as PointerEvent, W, H);
    const i = cards.findIndex((c) => p.x >= c.x && p.x <= c.x + size && p.y >= c.y && p.y <= c.y + size);
    if (i >= 0) pick(i);
  };
  const onKey = (e: Event) => {
    const k = e as KeyboardEvent;
    if (state !== "play") return;
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
    if (k.code in moves) {
      k.preventDefault();
      showCursor = true;
      const n = cursor + moves[k.code];
      if (n >= 0 && n < cards.length) cursor = n;
    } else if (k.code === "Space" || k.code === "Enter") {
      k.preventDefault();
      showCursor = true;
      pick(cursor);
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
