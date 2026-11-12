// Respawn: corredor infinito. Pula blocos e buracos, não pula quando vem drone baixo.
// Segurar o pulo deixa o salto mais alto; a velocidade sobe com a distância.
import { burst, C, clamp, createLoop, drawGrid, drawParticles, listen, MONO, rand, setupCanvas, stepParticles, type GameFactory, type Particle } from "./engine";

const W = 640;
const H = 360;
const GROUND = 300;
const GRAVITY = 2400;
const JUMP_V = -780;
const CUT_V = -320;
const PX = 96;
const PW = 24;
const PH = 30;

type Obstacle = { kind: "block" | "pit" | "drone"; x: number; w: number; h: number; y: number; t: number };

export const create: GameFactory = (canvas, hooks) => {
  const ctx = setupCanvas(canvas, W, H);
  let py = GROUND - PH;
  let vy = 0;
  let grounded = true;
  let coyote = 0;
  let buffer = 0;
  let holding = false;
  let speed = 300;
  let dist = 0;
  let score = 0;
  let nextGap = 400;
  let obstacles: Obstacle[] = [];
  let particles: Particle[] = [];
  let state: "idle" | "play" | "dying" = "idle";
  let dyingT = 0;
  let spawnT = 0;
  let shake = 0;
  let time = 0;
  // Prédios do fundo (parallax), gerados uma vez.
  const skyline = Array.from({ length: 18 }, (_, i) => ({ x: i * 48, w: rand(28, 46), h: rand(30, 120) }));

  const reset = () => {
    py = GROUND - PH;
    vy = 0;
    grounded = true;
    coyote = 0;
    buffer = 0;
    holding = false;
    speed = 300;
    dist = 0;
    score = 0;
    nextGap = 380;
    obstacles = [];
    particles = [];
    spawnT = 0.35;
    shake = 0;
    hooks.onScore(0);
  };

  const press = () => {
    if (state !== "play") return;
    holding = true;
    buffer = 0.12;
  };
  const release = () => {
    holding = false;
    if (vy < CUT_V) vy = CUT_V;
  };

  const overPit = () => obstacles.some((o) => o.kind === "pit" && PX + 5 > o.x && PX + PW - 5 < o.x + o.w);

  const spawn = () => {
    const x = W + 20;
    const roll = Math.random();
    if (score > 120 && roll < 0.22) {
      // Buraco: sempre menor que o alcance do salto na velocidade atual.
      const w = clamp(rand(54, speed * 0.42), 54, 150);
      obstacles.push({ kind: "pit", x, w, h: 0, y: GROUND, t: 0 });
    } else if (score > 260 && roll < 0.42) {
      // Drone baixo: passa por cima de quem fica no chão, acerta quem pula.
      obstacles.push({ kind: "drone", x, w: 34, h: 16, y: GROUND - PH - 30, t: 0 });
    } else {
      const tall = Math.random() < 0.35;
      const w = tall ? rand(18, 26) : rand(22, 52);
      const h = tall ? rand(48, 66) : rand(22, 40);
      obstacles.push({ kind: "block", x, w, h, y: GROUND - h, t: 0 });
      // Às vezes, dois blocos colados viram um degrau.
      if (score > 60 && Math.random() < 0.25) obstacles.push({ kind: "block", x: x + w, w: rand(18, 30), h: h * 0.55, y: GROUND - h * 0.55, t: 0 });
    }
    const last = obstacles.at(-1)!;
    nextGap = last.x + last.w + speed * rand(0.62, 1.1) + rand(0, 160);
  };

  const die = () => {
    state = "dying";
    dyingT = 0.55;
    shake = 0.3;
    burst(particles, PX + PW / 2, py + PH / 2, C.acc, 30, 340);
    burst(particles, PX + PW / 2, py + PH / 2, C.paper, 10, 200);
  };

  const hit = (o: Obstacle) => {
    if (o.kind === "pit") return false;
    const m = 4; // margem generosa: colisão justa frustra
    return PX + m < o.x + o.w && PX + PW - m > o.x && py + m < o.y + o.h && py + PH - m > o.y;
  };

  const update = (dt: number) => {
    time += dt;
    if (state === "dying") {
      dyingT -= dt;
      shake = Math.max(0, shake - dt);
      stepParticles(particles, dt);
      if (dyingT <= 0) {
        loop.stop();
        state = "idle";
        hooks.onOver(score);
      }
      return;
    }
    if (state !== "play") return;

    speed = Math.min(760, speed + dt * 9);
    const dx = speed * dt;
    dist += dx;
    const s = Math.floor(dist / 12);
    if (s !== score) {
      score = s;
      hooks.onScore(score);
    }

    // Física do salto: buffer (aperta um pouco antes de cair) + coyote (pula logo após a borda).
    buffer = Math.max(0, buffer - dt);
    coyote = grounded ? 0.09 : Math.max(0, coyote - dt);
    if (buffer > 0 && coyote > 0) {
      vy = JUMP_V;
      grounded = false;
      coyote = 0;
      buffer = 0;
      burst(particles, PX + PW / 2, GROUND, C.accDeep, 6, 120);
    }
    if (!holding && vy < CUT_V) vy = CUT_V;
    vy += GRAVITY * dt;
    py += vy * dt;
    const pit = overPit();
    if (!pit && py + PH >= GROUND && py + PH - vy * dt <= GROUND + 2) {
      py = GROUND - PH;
      vy = 0;
      grounded = true;
    } else {
      grounded = false;
    }
    if (py > H) return die();

    for (const o of obstacles) {
      o.x -= dx;
      o.t += dt;
      if (o.kind === "drone") o.y = GROUND - PH - 30 + Math.sin(o.t * 6) * 3;
    }
    obstacles = obstacles.filter((o) => o.x + o.w > -40);
    nextGap -= dx;
    spawnT -= dt;
    if (nextGap <= W + 20 && spawnT <= 0) spawn();
    for (const o of obstacles) if (hit(o)) return die();
    stepParticles(particles, dt);
  };

  const draw = () => {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-5, 5) * shake * 3, rand(-5, 5) * shake * 3);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    drawGrid(ctx, W, H, 32, dist * 0.2, 0);

    // Prédios distantes.
    ctx.fillStyle = C.ink3;
    const off = (dist * 0.25) % (18 * 48);
    for (const b of skyline) {
      let x = b.x - off;
      if (x + b.w < 0) x += 18 * 48;
      ctx.fillRect(x, GROUND - b.h, b.w, b.h);
    }

    // Chão (com os buracos recortados).
    const pits = obstacles.filter((o) => o.kind === "pit");
    ctx.fillStyle = C.ink2;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = C.acc;
    ctx.fillRect(0, GROUND, W, 2);
    for (const p of pits) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(p.x, GROUND, p.w, H - GROUND);
      ctx.fillStyle = C.warn;
      ctx.fillRect(p.x - 2, GROUND, 2, 10);
      ctx.fillRect(p.x + p.w, GROUND, 2, 10);
    }
    ctx.fillStyle = C.lineSoft;
    const dash = dist % 40;
    for (let x = -dash; x < W; x += 40) {
      if (pits.some((p) => x + 16 > p.x && x < p.x + p.w)) continue;
      ctx.fillRect(x, GROUND + 14, 16, 2);
    }

    // Obstáculos.
    for (const o of obstacles) {
      if (o.kind === "block") {
        ctx.fillStyle = C.ink3;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = C.warn;
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
        ctx.fillStyle = C.warn;
        for (let y = o.y + 6; y < o.y + o.h - 4; y += 10) ctx.fillRect(o.x + 5, y, o.w - 10, 2);
      } else if (o.kind === "drone") {
        ctx.fillStyle = C.danger;
        ctx.fillRect(o.x, o.y + 4, o.w, o.h - 8);
        ctx.fillRect(o.x + 6, o.y, o.w - 12, o.h);
        ctx.fillStyle = C.ink;
        ctx.fillRect(o.x + o.w / 2 - 3, o.y + 5, 6, 6);
        // Hélices piscando.
        ctx.fillStyle = Math.sin(o.t * 40) > 0 ? C.paper : C.muted;
        ctx.fillRect(o.x - 4, o.y - 2, 14, 2);
        ctx.fillRect(o.x + o.w - 10, o.y - 2, 14, 2);
      }
    }

    // Jogador (some na explosão).
    if (state !== "dying") drawRunner(ctx, PX, py, grounded, time);
    drawParticles(ctx, particles);
    ctx.restore();

    // Velocidade (canto) para dar noção de progresso.
    ctx.font = `600 11px ${MONO}`;
    ctx.fillStyle = C.muted;
    ctx.textAlign = "right";
    ctx.fillText(`VEL ${Math.round(speed / 3)}`, W - 12, 20);
    ctx.textAlign = "left";
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  const onKey = (e: Event) => {
    const k = e as KeyboardEvent;
    if (!["Space", "ArrowUp", "KeyW"].includes(k.code)) return;
    if (state !== "play") return;
    k.preventDefault();
    if (k.type === "keydown" && !k.repeat) press();
    if (k.type === "keyup") release();
  };
  const onDown = (e: Event) => {
    e.preventDefault();
    press();
  };
  const off = listen(
    [window, "keydown", onKey],
    [window, "keyup", onKey],
    [canvas, "pointerdown", onDown],
    [window, "pointerup", release],
    [window, "pointercancel", release],
  );

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
      holding = false;
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

/** Bonequinho em pixel art: corpo verde, visor escuro, pernas alternando. */
function drawRunner(ctx: CanvasRenderingContext2D, x: number, y: number, grounded: boolean, t: number) {
  const step = grounded ? Math.floor(t * 12) % 2 : 2;
  ctx.fillStyle = C.acc;
  ctx.fillRect(x + 2, y, PW - 4, 18); // cabeça + tronco
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + 11, y + 4, 10, 5); // visor
  ctx.fillStyle = C.accSoft;
  ctx.fillRect(x + 13, y + 5, 3, 2);
  ctx.fillStyle = C.acc;
  ctx.fillRect(x - 2, y + 9, 5, 4); // mochila
  if (step === 0) {
    ctx.fillRect(x + 4, y + 18, 6, 12);
    ctx.fillRect(x + 14, y + 18, 6, 8);
  } else if (step === 1) {
    ctx.fillRect(x + 4, y + 18, 6, 8);
    ctx.fillRect(x + 14, y + 18, 6, 12);
  } else {
    ctx.fillRect(x + 2, y + 18, 6, 8);
    ctx.fillRect(x + 16, y + 18, 6, 10);
  }
}
