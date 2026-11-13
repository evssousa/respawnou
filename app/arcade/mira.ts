// Mira: alvos aparecem e encolhem; acerte antes que sumam. Acertos seguidos sobem o
// multiplicador; acertar no centro vale mais. Alvo que some tira uma vida (3 vidas).
// Dourado vale muito; o vermelho com X não pode ser clicado.
import { burst, C, createLoop, drawGrid, drawParticles, listen, MONO, rand, setupCanvas, stepParticles, toLocal, type GameFactory, type Particle } from "./engine";

const TOP = 44;
const R = 32;

type Target = { x: number; y: number; t: number; max: number; kind: "normal" | "ouro" | "bomba" };
type Popup = { x: number; y: number; text: string; t: number; color: string };

export const create: GameFactory = (canvas, hooks, { W, H }) => {
  const ctx = setupCanvas(canvas, W, H);
  let targets: Target[] = [];
  let particles: Particle[] = [];
  let popups: Popup[] = [];
  let lives = 3;
  let score = 0;
  let combo = 0;
  let time = 0;
  let spawnT = 0;
  let missFlash = 0;
  let state: "idle" | "play" | "over" = "idle";
  let overT = 0;

  const mult = () => 1 + Math.floor(combo / 5);
  const radius = (t: Target) => {
    const k = t.t / t.max;
    const grow = Math.min(1, k * 8); // surge rápido
    const base = t.kind === "ouro" ? R * 0.7 : R;
    return base * grow * (1 - k * 0.85);
  };

  const reset = () => {
    targets = [];
    particles = [];
    popups = [];
    lives = 3;
    score = 0;
    combo = 0;
    time = 0;
    spawnT = 0.5;
    missFlash = 0;
    hooks.onScore(0);
  };

  const spawn = () => {
    const roll = Math.random();
    const kind: Target["kind"] = time > 20 && roll < 0.12 ? "bomba" : roll > 0.93 ? "ouro" : "normal";
    // Posição livre (sem encostar em outro alvo).
    let x = 0;
    let y = 0;
    for (let i = 0; i < 20; i++) {
      x = rand(R + 8, W - R - 8);
      y = rand(TOP + R + 8, H - R - 8);
      if (targets.every((t) => Math.hypot(t.x - x, t.y - y) > R * 2.2)) break;
    }
    const life = Math.max(0.95, 2.3 - time * 0.018) * (kind === "ouro" ? 0.7 : 1);
    targets.push({ x, y, t: 0, max: life, kind });
  };

  const loseLife = (x: number, y: number) => {
    lives--;
    combo = 0;
    missFlash = 0.25;
    burst(particles, x, y, C.danger, 14, 200);
    if (lives <= 0) {
      state = "over";
      overT = 0.8;
    }
  };

  const shoot = (x: number, y: number) => {
    if (state !== "play") return;
    // O alvo mais "na frente" é o mais novo.
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      const r = radius(t);
      const d = Math.hypot(t.x - x, t.y - y);
      if (d > r + 4) continue;
      targets.splice(i, 1);
      if (t.kind === "bomba") {
        popups.push({ x: t.x, y: t.y, text: "BOMBA!", t: 0.8, color: C.danger });
        loseLife(t.x, t.y);
        return;
      }
      combo++;
      const bull = d < r * 0.35;
      const pts = ((t.kind === "ouro" ? 50 : 10) + (bull ? 10 : 0)) * mult();
      score += pts;
      hooks.onScore(score);
      burst(particles, t.x, t.y, t.kind === "ouro" ? C.warn : C.acc, bull ? 16 : 10, 220);
      popups.push({ x: t.x, y: t.y - 6, text: bull ? `NA MOSCA +${pts}` : `+${pts}`, t: 0.7, color: bull || t.kind === "ouro" ? C.warn : C.paper });
      return;
    }
    // Errou o tiro: zera a sequência (sem perder vida).
    if (combo > 0) popups.push({ x, y, text: "ERROU", t: 0.5, color: C.muted });
    combo = 0;
  };

  const update = (dt: number) => {
    stepParticles(particles, dt, 400);
    missFlash = Math.max(0, missFlash - dt);
    for (const p of popups) {
      p.t -= dt;
      p.y -= 40 * dt;
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
    time += dt;
    spawnT -= dt;
    const maxOn = Math.min(4, 1 + Math.floor(time / 15));
    if (spawnT <= 0 && targets.filter((t) => t.kind !== "bomba").length < maxOn) {
      spawn();
      spawnT = Math.max(0.3, 0.95 - time * 0.01) * rand(0.7, 1.2);
    }
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      t.t += dt;
      if (t.t >= t.max) {
        targets.splice(i, 1);
        if (t.kind !== "bomba") loseLife(t.x, t.y);
        if (state !== "play") return;
      }
    }
  };

  const drawTarget = (t: Target) => {
    const r = radius(t);
    if (r <= 0.5) return;
    if (t.kind === "bomba") {
      ctx.fillStyle = C.danger;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = Math.max(2, r * 0.18);
      ctx.beginPath();
      ctx.moveTo(t.x - r * 0.45, t.y - r * 0.45);
      ctx.lineTo(t.x + r * 0.45, t.y + r * 0.45);
      ctx.moveTo(t.x + r * 0.45, t.y - r * 0.45);
      ctx.lineTo(t.x - r * 0.45, t.y + r * 0.45);
      ctx.stroke();
      return;
    }
    const main = t.kind === "ouro" ? C.warn : C.acc;
    const rings = [
      [1, main],
      [0.72, C.ink],
      [0.5, main],
      [0.3, C.paper],
    ] as const;
    for (const [k, col] of rings) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r * k, 0, Math.PI * 2);
      ctx.fill();
    }
    // Arco de tempo restante.
    ctx.strokeStyle = "rgba(238,243,234,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - t.t / t.max));
    ctx.stroke();
  };

  const draw = () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, W, H, 40);
    if (missFlash > 0) {
      ctx.fillStyle = `rgba(255,90,60,${missFlash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = C.ink2;
    ctx.fillRect(0, 0, W, TOP);
    ctx.fillStyle = C.line;
    ctx.fillRect(0, TOP - 1, W, 1);
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = C.muted;
    ctx.fillText("VIDAS", 12, 27);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < lives ? C.acc : C.lineSoft;
      ctx.fillRect(62 + i * 16, 17, 11, 11);
    }
    ctx.textAlign = "right";
    ctx.fillStyle = mult() > 1 ? C.warn : C.muted;
    ctx.fillText(`SEQUÊNCIA ${combo}  ·  x${mult()}`, W - 12, 27);
    ctx.textAlign = "left";

    for (const t of targets) drawTarget(t);
    drawParticles(ctx, particles);
    ctx.textAlign = "center";
    ctx.font = `700 14px ${MONO}`;
    for (const p of popups) {
      ctx.globalAlpha = Math.min(1, p.t * 2.5);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  const onDown = (e: Event) => {
    e.preventDefault();
    const p = toLocal(canvas, e as PointerEvent, W, H);
    if (p.y > TOP) shoot(p.x, p.y);
  };
  const off = listen([canvas, "pointerdown", onDown]);
  canvas.style.cursor = "crosshair";

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
