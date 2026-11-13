// Torre: um bloco vai e volta; toque para soltar. O que sobra para fora é cortado.
// Encaixe perfeito mantém a largura (3 seguidos devolvem um pedaço). Errar tudo encerra.
import { burst, C, createLoop, drawGrid, drawParticles, listen, MONO, setupCanvas, stepParticles, type GameFactory, type Particle } from "./engine";

const BH = 26;
const PERFECT = 5;

type Block = { x: number; w: number; level: number };
type Debris = { x: number; y: number; w: number; vy: number; vx: number; rot: number; vr: number; level: number };

const color = (level: number, light = 0) => `hsl(${(78 + level * 7) % 360} 95% ${56 + light}%)`;

export const create: GameFactory = (canvas, hooks, { W, H, landscape }) => {
  const BASE_W = landscape ? 240 : 200;
  // Tela larga: o bloco anda mais rápido para levar o mesmo tempo de um lado ao outro.
  const SPEED_K = 0.5 + (0.5 * W) / 360;
  // Quantos andares ficam visíveis abaixo do topo (a câmera sobe a partir daí).
  const KEEP = Math.floor((H - 80 - H * 0.45) / BH);
  const ctx = setupCanvas(canvas, W, H);
  let stack: Block[] = [];
  let cur: Block & { dir: number } = { x: 0, w: BASE_W, level: 1, dir: 1 };
  let debris: Debris[] = [];
  let particles: Particle[] = [];
  let cam = 0;
  let camTarget = 0;
  let combo = 0;
  let flash = 0;
  let label = "";
  let labelT = 0;
  let state: "idle" | "play" | "over" = "idle";
  let overT = 0;

  const yOf = (level: number) => H - 80 - level * BH; // posição no "mundo" (cresce para cima)
  const speedOf = (level: number) => Math.min(420, 150 + level * 7) * SPEED_K;

  const reset = () => {
    stack = [{ x: (W - BASE_W) / 2, w: BASE_W, level: 0 }];
    debris = [];
    particles = [];
    cam = camTarget = 0;
    combo = 0;
    flash = 0;
    labelT = 0;
    next();
    hooks.onScore(0);
  };

  const next = () => {
    const top = stack.at(-1)!;
    const fromLeft = top.level % 2 === 0;
    cur = { x: fromLeft ? -top.w * 0.6 : W - top.w * 0.4, w: top.w, level: top.level + 1, dir: fromLeft ? 1 : -1 };
    camTarget = Math.max(0, (top.level - KEEP) * BH);
  };

  const drop = () => {
    if (state !== "play") return;
    const top = stack.at(-1)!;
    const left = Math.max(cur.x, top.x);
    const right = Math.min(cur.x + cur.w, top.x + top.w);
    const overlap = right - left;
    const y = yOf(cur.level);

    if (overlap <= 0) {
      debris.push({ x: cur.x, y, w: cur.w, vy: 0, vx: cur.dir * 60, rot: 0, vr: cur.dir * 2, level: cur.level });
      state = "over";
      overT = 0.9;
      return;
    }

    if (Math.abs(cur.x - top.x) <= PERFECT) {
      combo++;
      let w = top.w;
      // Três perfeitos seguidos devolvem um pedaço da largura perdida.
      if (combo >= 3) w = Math.min(BASE_W, w + 10);
      const x = top.x - (w - top.w) / 2;
      stack.push({ x, w, level: cur.level });
      flash = 0.25;
      label = combo >= 3 ? `PERFEITO x${combo}` : "PERFEITO";
      labelT = 0.8;
      burst(particles, x, y + BH / 2, C.paper, 6, 160);
      burst(particles, x + w, y + BH / 2, C.paper, 6, 160);
    } else {
      combo = 0;
      // Pedaço cortado cai do lado que passou.
      const cutX = cur.x < top.x ? cur.x : right;
      const cutW = cur.w - overlap;
      debris.push({ x: cutX, y, w: cutW, vy: 0, vx: (cur.x < top.x ? -1 : 1) * 40, rot: 0, vr: (cur.x < top.x ? -1 : 1) * 1.6, level: cur.level });
      stack.push({ x: left, w: overlap, level: cur.level });
    }
    hooks.onScore(stack.length - 1);
    next();
  };

  const update = (dt: number) => {
    cam += (camTarget - cam) * Math.min(1, dt * 6);
    flash = Math.max(0, flash - dt);
    labelT = Math.max(0, labelT - dt);
    for (const d of debris) {
      d.vy += 1400 * dt;
      d.y += d.vy * dt;
      d.x += d.vx * dt;
      d.rot += d.vr * dt;
    }
    debris = debris.filter((d) => d.y - cam < H + 200);
    stepParticles(particles, dt, 400);

    if (state === "play") {
      cur.x += cur.dir * speedOf(cur.level) * dt;
      const min = -cur.w * 0.6;
      const max = W - cur.w * 0.4;
      if (cur.x < min) {
        cur.x = min;
        cur.dir = 1;
      } else if (cur.x > max) {
        cur.x = max;
        cur.dir = -1;
      }
    } else if (state === "over") {
      overT -= dt;
      if (overT <= 0) {
        state = "idle";
        loop.stop();
        hooks.onOver(stack.length - 1);
      }
    }
  };

  const rect = (b: { x: number; w: number; level: number }, y: number) => {
    ctx.fillStyle = color(b.level);
    ctx.fillRect(b.x, y, b.w, BH);
    ctx.fillStyle = color(b.level, 18);
    ctx.fillRect(b.x, y, b.w, 3);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(b.x, y + BH - 4, b.w, 4);
  };

  const draw = () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, W, H, 30, 0, -cam * 0.5);

    ctx.save();
    ctx.translate(0, cam);
    // Base / chão.
    ctx.fillStyle = C.ink2;
    ctx.fillRect(0, yOf(0) + BH, W, 400);
    ctx.fillStyle = C.acc;
    ctx.fillRect(0, yOf(0) + BH, W, 2);
    // Só desenha o que está na tela.
    for (const b of stack) {
      const y = yOf(b.level);
      if (y + cam > H + BH || y + cam < -BH) continue;
      rect(b, y);
    }
    if (state === "play") rect(cur, yOf(cur.level));
    for (const d of debris) {
      ctx.save();
      ctx.translate(d.x + d.w / 2, d.y + BH / 2);
      ctx.rotate(d.rot);
      ctx.globalAlpha = 0.85;
      rect({ x: -d.w / 2, w: d.w, level: d.level }, -BH / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    drawParticles(ctx, particles);
    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = `rgba(238,243,234,${flash * 0.25})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Altura grande no fundo + aviso de perfeito.
    ctx.textAlign = "center";
    ctx.font = `700 64px ${MONO}`;
    ctx.fillStyle = "rgba(200,255,46,0.10)";
    ctx.fillText(String(stack.length - 1), W / 2, 120);
    if (labelT > 0) {
      ctx.globalAlpha = Math.min(1, labelT * 2);
      ctx.font = `700 16px ${MONO}`;
      ctx.fillStyle = C.paper;
      ctx.fillText(label, W / 2, 160);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  const onKey = (e: Event) => {
    const k = e as KeyboardEvent;
    if (state !== "play" || !["Space", "Enter", "ArrowDown", "KeyS"].includes(k.code)) return;
    k.preventDefault();
    if (!k.repeat) drop();
  };
  const onDown = (e: Event) => {
    e.preventDefault();
    drop();
  };
  const off = listen([window, "keydown", onKey], [canvas, "pointerdown", onDown]);

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
