// Cabo de Força: um cabo de controle cresce a cada pilha que pega. Bater na parede ou no
// próprio cabo encerra. A velocidade sobe aos poucos; a pilha dourada vale mais e some rápido.
import { burst, C, createLoop, drawParticles, listen, MONO, setupCanvas, stepParticles, toLocal, type GameFactory, type Particle } from "./engine";

const COLS = 18;
const ROWS = 18;
const CELL = 20;
const TOP = 40;
const W = COLS * CELL;
const H = ROWS * CELL + TOP;

type P = { x: number; y: number };
const DIRS: Record<string, P> = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
const KEYS: Record<string, string> = { ArrowUp: "U", KeyW: "U", ArrowDown: "D", KeyS: "D", ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R" };

export const create: GameFactory = (canvas, hooks) => {
  const ctx = setupCanvas(canvas, W, H);
  let body: P[] = [];
  let prev: P[] = [];
  let dir: P = DIRS.R;
  let queue: P[] = [];
  let food: P = { x: 0, y: 0 };
  let gold: (P & { t: number }) | null = null;
  let eaten = 0;
  let score = 0;
  let tick = 0.14;
  let acc = 0;
  let grow = 0;
  let particles: Particle[] = [];
  let state: "idle" | "play" | "over" = "idle";
  let overT = 0;
  let time = 0;

  const free = (): P => {
    for (let i = 0; i < 400; i++) {
      const p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      if (!body.some((b) => b.x === p.x && b.y === p.y) && !(food.x === p.x && food.y === p.y) && !(gold && gold.x === p.x && gold.y === p.y)) return p;
    }
    return { x: 0, y: 0 };
  };

  const reset = () => {
    body = [
      { x: 6, y: 9 },
      { x: 5, y: 9 },
      { x: 4, y: 9 },
      { x: 3, y: 9 },
    ];
    prev = body.map((b) => ({ ...b }));
    dir = DIRS.R;
    queue = [];
    food = { x: -1, y: -1 };
    gold = null;
    food = free();
    eaten = 0;
    score = 0;
    tick = 0.14;
    acc = 0;
    grow = 0;
    particles = [];
    hooks.onScore(0);
  };

  const turn = (d: P) => {
    if (state !== "play") return;
    const last = queue.at(-1) ?? dir;
    // Não vira 180° nem repete a direção atual; guarda até 2 curvas rápidas.
    if ((d.x === -last.x && d.y === -last.y) || (d.x === last.x && d.y === last.y)) return;
    if (queue.length < 2) queue.push(d);
  };

  const step = () => {
    if (queue.length) dir = queue.shift()!;
    prev = body.map((b) => ({ ...b }));
    const head = { x: body[0].x + dir.x, y: body[0].y + dir.y };
    const tailMoves = grow === 0;
    const hitsSelf = body.some((b, i) => b.x === head.x && b.y === head.y && !(tailMoves && i === body.length - 1));
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || hitsSelf) {
      state = "over";
      overT = 0.7;
      burst(particles, body[0].x * CELL + CELL / 2, TOP + body[0].y * CELL + CELL / 2, C.danger, 24, 240);
      return;
    }
    body.unshift(head);
    if (grow > 0) grow--;
    else body.pop();
    if (head.x === food.x && head.y === food.y) {
      eaten++;
      grow += 2;
      score += 10;
      tick = Math.max(0.065, tick - 0.0035);
      burst(particles, head.x * CELL + CELL / 2, TOP + head.y * CELL + CELL / 2, C.acc, 10, 160);
      food = free();
      if (!gold && eaten % 5 === 0) gold = { ...free(), t: 6 };
      hooks.onScore(score);
    } else if (gold && head.x === gold.x && head.y === gold.y) {
      grow += 3;
      score += 50;
      burst(particles, head.x * CELL + CELL / 2, TOP + head.y * CELL + CELL / 2, C.warn, 18, 200);
      gold = null;
      hooks.onScore(score);
    }
  };

  const update = (dt: number) => {
    time += dt;
    stepParticles(particles, dt, 300);
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
    if (gold) {
      gold.t -= dt;
      if (gold.t <= 0) gold = null;
    }
    acc += dt;
    while (acc >= tick && state === "play") {
      acc -= tick;
      step();
    }
  };

  const cellCenter = (p: P) => ({ x: p.x * CELL + CELL / 2, y: TOP + p.y * CELL + CELL / 2 });

  const draw = () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    // Tabuleiro quadriculado discreto.
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 ? C.ink2 : C.ink;
        ctx.fillRect(x * CELL, TOP + y * CELL, CELL, CELL);
      }
    ctx.fillStyle = C.ink2;
    ctx.fillRect(0, 0, W, TOP);
    ctx.fillStyle = C.line;
    ctx.fillRect(0, TOP - 1, W, 1);
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = C.acc;
    ctx.fillText(`TAMANHO ${body.length}`, 12, 25);
    if (gold) {
      ctx.textAlign = "right";
      ctx.fillStyle = C.warn;
      ctx.fillText(`PILHA DOURADA ${Math.ceil(gold.t)}s`, W - 12, 25);
      ctx.textAlign = "left";
    }

    // Pilhas.
    const drawBattery = (p: P, color: string, pulse: number) => {
      const c = cellCenter(p);
      const s = 1 + Math.sin(time * 8) * pulse;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(s, s);
      ctx.fillStyle = color;
      ctx.fillRect(-5, -7, 10, 14);
      ctx.fillRect(-2, -9, 4, 2);
      ctx.fillStyle = C.ink;
      ctx.fillRect(-3, -1, 6, 2);
      ctx.restore();
    };
    drawBattery(food, C.acc, 0.08);
    if (gold && (gold.t > 2 || Math.floor(gold.t * 6) % 2 === 0)) drawBattery(gold, C.warn, 0.14);

    // Cabo: posição interpolada entre os passos, para andar liso.
    const k = state === "play" ? Math.min(1, acc / tick) : 1;
    const pts = body.map((b, i) => {
      const from = prev[i] ?? prev.at(-1) ?? b;
      return cellCenter({ x: from.x + (b.x - from.x) * k, y: from.y + (b.y - from.y) * k });
    });
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = C.accDeep;
    ctx.lineWidth = 12;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = C.acc;
    ctx.lineWidth = 7;
    ctx.stroke();

    // Cabeça: conector.
    const h = pts[0];
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(Math.atan2(dir.y, dir.x));
    ctx.fillStyle = C.paper;
    ctx.fillRect(-7, -8, 13, 16);
    ctx.fillStyle = C.muted;
    ctx.fillRect(6, -5, 4, 3);
    ctx.fillRect(6, 2, 4, 3);
    ctx.restore();

    drawParticles(ctx, particles);
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  const onKey = (e: Event) => {
    const k = e as KeyboardEvent;
    const d = KEYS[k.code];
    if (!d || state !== "play") return;
    k.preventDefault();
    turn(DIRS[d]);
  };
  // Toque: deslizar o dedo; ou tocar de um lado da cabeça (vira para aquele lado).
  let startP: P | null = null;
  let swiped = false;
  const onDown = (e: Event) => {
    e.preventDefault();
    startP = toLocal(canvas, e as PointerEvent, W, H);
    swiped = false;
  };
  const onMove = (e: Event) => {
    if (!startP || swiped) return;
    const p = toLocal(canvas, e as PointerEvent, W, H);
    const dx = p.x - startP.x;
    const dy = p.y - startP.y;
    if (Math.hypot(dx, dy) < 18) return;
    swiped = true;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.R : DIRS.L) : dy > 0 ? DIRS.D : DIRS.U);
  };
  const onUp = (e: Event) => {
    if (startP && !swiped) {
      const p = toLocal(canvas, e as PointerEvent, W, H);
      const c = cellCenter(body[0]);
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      // Anda na horizontal → toque decide cima/baixo; e vice-versa.
      if ((queue.at(-1) ?? dir).x !== 0) turn(dy < 0 ? DIRS.U : DIRS.D);
      else turn(dx < 0 ? DIRS.L : DIRS.R);
    }
    startP = null;
  };
  const off = listen([window, "keydown", onKey], [canvas, "pointerdown", onDown], [canvas, "pointermove", onMove], [window, "pointerup", onUp]);

  reset();
  draw();

  return {
    start() {
      reset();
      state = "play";
      loop.start();
    },
    pause() {
      loop.stop();
      startP = null;
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
