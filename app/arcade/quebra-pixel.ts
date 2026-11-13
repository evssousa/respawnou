// Quebra-Pixel: raquete e bolinha contra blocos. Cada fase é gerada na hora (desenho
// espelhado), com blocos mais resistentes e bola mais rápida conforme avança. 3 vidas.
import { burst, C, clamp, createLoop, drawGrid, drawParticles, listen, MONO, rand, setupCanvas, stepParticles, toLocal, type GameFactory, type Particle } from "./engine";

const GAP = 4;
const SIDE = 12;
const TOP = 76;
const BHT = 16;
const PAD_H = 10;
const R = 5;

type Brick = { x: number; y: number; hp: number; max: number };

const HP_COLOR = ["", C.acc, C.warn, C.danger];

export const create: GameFactory = (canvas, hooks, { W, H, landscape }) => {
  // Tela larga: mais colunas de blocos e raquete maior.
  const COLS = landscape ? 14 : 8;
  const BW = (W - SIDE * 2 - GAP * (COLS - 1)) / COLS;
  const PAD_Y = H - 44;
  const PAD0 = landscape ? 92 : 68;
  const ctx = setupCanvas(canvas, W, H);
  let padX = W / 2;
  let padW = PAD0;
  let target: number | null = null;
  let keys = 0; // -1 esquerda, 1 direita
  let ball = { x: W / 2, y: PAD_Y - R, vx: 0, vy: 0, stuck: true };
  let bricks: Brick[] = [];
  let particles: Particle[] = [];
  let level = 1;
  let lives = 3;
  let score = 0;
  let banner = "";
  let bannerT = 0;
  let state: "idle" | "play" | "over" = "idle";
  let overT = 0;

  const ballSpeed = () => Math.min(560, 310 + (level - 1) * 22);

  const build = () => {
    const rows = Math.min(9, 4 + Math.floor(level / 2));
    const fill = Math.min(0.85, 0.55 + level * 0.03);
    bricks = [];
    while (bricks.length < COLS * 1.5) {
      bricks = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < COLS / 2; c++) {
          if (Math.random() > fill) continue;
          const roll = Math.random();
          const hp = level >= 4 && roll < 0.08 + level * 0.01 ? 3 : level >= 2 && roll < 0.2 + level * 0.03 ? 2 : 1;
          for (const col of [c, COLS - 1 - c]) bricks.push({ x: SIDE + col * (BW + GAP), y: TOP + r * (BHT + GAP), hp, max: hp });
        }
      }
    }
  };

  const stick = () => {
    ball = { x: padX, y: PAD_Y - R - 1, vx: 0, vy: 0, stuck: true };
  };

  const launch = () => {
    if (state !== "play" || !ball.stuck) return;
    const a = rand(-0.35, 0.35);
    ball.vx = Math.sin(a) * ballSpeed();
    ball.vy = -Math.cos(a) * ballSpeed();
    ball.stuck = false;
  };

  const reset = () => {
    level = 1;
    lives = 3;
    score = 0;
    padX = W / 2;
    padW = PAD0;
    particles = [];
    build();
    stick();
    banner = "FASE 1";
    bannerT = 1.2;
    hooks.onScore(0);
  };

  const addScore = (n: number) => {
    score += n;
    hooks.onScore(score);
  };

  const collideBricks = (axis: "x" | "y") => {
    for (const b of bricks) {
      if (ball.x + R <= b.x || ball.x - R >= b.x + BW || ball.y + R <= b.y || ball.y - R >= b.y + BHT) continue;
      if (axis === "x") {
        ball.vx = -ball.vx;
        ball.x = ball.vx > 0 ? b.x + BW + R : b.x - R;
      } else {
        ball.vy = -ball.vy;
        ball.y = ball.vy > 0 ? b.y + BHT + R : b.y - R;
      }
      b.hp--;
      addScore(10 * level);
      burst(particles, b.x + BW / 2, b.y + BHT / 2, HP_COLOR[b.max] ?? C.acc, b.hp > 0 ? 4 : 12, 180);
      if (b.hp <= 0) bricks.splice(bricks.indexOf(b), 1);
      return;
    }
  };

  const update = (dt: number) => {
    bannerT = Math.max(0, bannerT - dt);
    stepParticles(particles, dt, 500);
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

    // Raquete: segue o dedo/mouse; no teclado, setas.
    if (keys) target = null;
    if (target !== null) padX += (target - padX) * Math.min(1, dt * 22);
    else padX += keys * 460 * dt;
    padX = clamp(padX, padW / 2, W - padW / 2);

    if (ball.stuck) {
      ball.x = padX;
      return;
    }

    // Subpassos: a bola nunca atravessa um bloco, mesmo rápida.
    const steps = Math.ceil((Math.hypot(ball.vx, ball.vy) * dt) / 3);
    for (let i = 0; i < steps; i++) {
      ball.x += (ball.vx * dt) / steps;
      if (ball.x < R) {
        ball.x = R;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x > W - R) {
        ball.x = W - R;
        ball.vx = -Math.abs(ball.vx);
      }
      collideBricks("x");
      ball.y += (ball.vy * dt) / steps;
      if (ball.y < R + 40) {
        ball.y = R + 40;
        ball.vy = Math.abs(ball.vy);
      }
      collideBricks("y");

      // Raquete: o ponto de contato define o ângulo de saída.
      if (ball.vy > 0 && ball.y + R >= PAD_Y && ball.y + R <= PAD_Y + PAD_H + 6 && Math.abs(ball.x - padX) <= padW / 2 + R) {
        const hitPos = clamp((ball.x - padX) / (padW / 2), -1, 1);
        const a = hitPos * 1.05;
        const sp = ballSpeed();
        ball.vx = Math.sin(a) * sp;
        ball.vy = -Math.cos(a) * sp;
        ball.y = PAD_Y - R;
      }
    }
    // Evita ficar "preso" quicando na horizontal.
    if (Math.abs(ball.vy) < 60) ball.vy = ball.vy < 0 ? -60 : 60;

    if (ball.y - R > H) {
      lives--;
      burst(particles, ball.x, H - 6, C.danger, 16, 220);
      if (lives <= 0) {
        state = "over";
        overT = 0.6;
        return;
      }
      banner = lives === 1 ? "ÚLTIMA VIDA" : `${lives} VIDAS`;
      bannerT = 1;
      stick();
    }

    if (bricks.length === 0) {
      addScore(100 * level);
      level++;
      if (level % 3 === 1 && lives < 5) lives++;
      padW = Math.max(PAD0 - 16, PAD0 - (level - 1) * 1.5);
      banner = `FASE ${level}`;
      bannerT = 1.4;
      build();
      stick();
    }
  };

  const draw = () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, W, H, 24);

    // Placar interno: fase e vidas.
    ctx.fillStyle = C.ink2;
    ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = C.line;
    ctx.fillRect(0, 40, W, 1);
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = C.acc;
    ctx.fillText(`FASE ${String(level).padStart(2, "0")}`, 12, 25);
    ctx.textAlign = "right";
    for (let i = 0; i < lives; i++) ctx.fillRect(W - 14 - i * 16, 16, 10, 10);
    ctx.textAlign = "left";

    for (const b of bricks) {
      const col = HP_COLOR[b.hp] ?? C.acc;
      ctx.fillStyle = col;
      ctx.globalAlpha = b.hp < b.max ? 0.75 : 1;
      ctx.fillRect(b.x, b.y, BW, BHT);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(b.x, b.y, BW, 2);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(b.x, b.y + BHT - 3, BW, 3);
    }

    // Raquete.
    ctx.fillStyle = C.paper;
    ctx.fillRect(padX - padW / 2, PAD_Y, padW, PAD_H);
    ctx.fillStyle = C.acc;
    ctx.fillRect(padX - padW / 2, PAD_Y, 6, PAD_H);
    ctx.fillRect(padX + padW / 2 - 6, PAD_Y, 6, PAD_H);

    // Bola.
    if (state !== "over") {
      ctx.fillStyle = C.paper;
      ctx.fillRect(ball.x - R, ball.y - R, R * 2, R * 2);
    }
    drawParticles(ctx, particles);

    ctx.textAlign = "center";
    if (bannerT > 0) {
      ctx.globalAlpha = Math.min(1, bannerT * 2);
      ctx.font = `700 22px ${MONO}`;
      ctx.fillStyle = C.paper;
      ctx.fillText(banner, W / 2, H * 0.62);
      ctx.globalAlpha = 1;
    }
    if (state === "play" && ball.stuck && bannerT <= 0.3) {
      ctx.font = `600 12px ${MONO}`;
      ctx.fillStyle = C.muted;
      ctx.fillText("TOQUE OU ESPAÇO PARA LANÇAR", W / 2, PAD_Y - 40);
    }
    ctx.textAlign = "left";
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  const onKey = (e: Event) => {
    const k = e as KeyboardEvent;
    if (state !== "play") return;
    const down = k.type === "keydown";
    if (k.code === "ArrowLeft" || k.code === "KeyA") keys = down ? -1 : keys === -1 ? 0 : keys;
    else if (k.code === "ArrowRight" || k.code === "KeyD") keys = down ? 1 : keys === 1 ? 0 : keys;
    else if ((k.code === "Space" || k.code === "ArrowUp") && down) launch();
    else return;
    k.preventDefault();
  };
  const onMove = (e: Event) => {
    if (state !== "play") return;
    target = toLocal(canvas, e as PointerEvent, W, H).x;
  };
  const onDown = (e: Event) => {
    e.preventDefault();
    onMove(e);
    launch();
  };
  const off = listen([window, "keydown", onKey], [window, "keyup", onKey], [canvas, "pointermove", onMove], [canvas, "pointerdown", onDown]);

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
      keys = 0;
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
