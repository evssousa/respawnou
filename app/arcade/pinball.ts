// Pinball simples: 3 bolas, 3 bumpers, 5 alvos e dois rebatedores. Acendeu os 5 alvos, o
// multiplicador sobe (até x5) e há bônus. O multiplicador zera quando a bola cai.
// A mesa tem sempre 360×560 em pé; no PC ela fica no centro e o painel vai ao lado.
import { burst, C, createLoop, drawParticles, listen, MONO, setupCanvas, stepParticles, toLocal, type GameFactory, type Particle } from "./engine";

const TW = 360;
const TH = 560;
const R = 8; // raio da bola
const G = 1000; // gravidade (px/s²)
const MAX_V = 1300;
const SUB = 6;

type Seg = { ax: number; ay: number; bx: number; by: number };

const walls: Seg[] = (() => {
  const w: Seg[] = [];
  // Arco do topo: centro (180,170), raio 164, de (16,170) até (344,170).
  let px = 16;
  let py = 170;
  for (let i = 1; i <= 16; i++) {
    const a = Math.PI + (Math.PI * i) / 16;
    const x = 180 + 164 * Math.cos(a);
    const y = 170 + 164 * Math.sin(a);
    w.push({ ax: px, ay: py, bx: x, by: y });
    px = x;
    py = y;
  }
  w.push({ ax: 16, ay: 170, bx: 16, by: 430 }, { ax: 344, ay: 170, bx: 344, by: 430 });
  // Guias que levam a bola até os rebatedores.
  w.push({ ax: 16, ay: 430, bx: 104, by: 498 }, { ax: 344, ay: 430, bx: 256, by: 498 });
  return w;
})();

const BUMPERS = [
  { x: 125, y: 215, r: 24, flash: 0 },
  { x: 235, y: 215, r: 24, flash: 0 },
  { x: 180, y: 292, r: 24, flash: 0 },
];
const TARGET_Y = 112;
const TARGET_XS = [88, 134, 180, 226, 272];

interface Flipper {
  px: number;
  py: number;
  s: 1 | -1; // 1 aponta para a direita, -1 para a esquerda
  len: number;
  ang: number;
  tipX: number;
  tipY: number;
  prevX: number;
  prevY: number;
  held: boolean;
}
const REST = 0.5;
const UP = -0.48;
const FLIP_SPEED = 22;

const tipOf = (f: Flipper) => ({ x: f.px + f.s * f.len * Math.cos(f.ang), y: f.py + f.len * Math.sin(f.ang) });

export const create: GameFactory = (canvas, hooks, { W, H, landscape }) => {
  const ctx = setupCanvas(canvas, W, H);
  const scale = landscape ? H / TH : W / TW;
  const OX = landscape ? 56 : 0;

  const mk = (px: number, s: 1 | -1): Flipper => {
    const f: Flipper = { px, py: 505, s, len: 62, ang: REST, tipX: 0, tipY: 0, prevX: 0, prevY: 0, held: false };
    const t = tipOf(f);
    f.tipX = f.prevX = t.x;
    f.tipY = f.prevY = t.y;
    return f;
  };
  const left = mk(110, 1);
  const right = mk(250, -1);

  let ball: { x: number; y: number; vx: number; vy: number } | null = null;
  let serveT = 0;
  let balls = 3;
  let score = 0;
  let mult = 1;
  let lit = [false, false, false, false, false];
  let state: "idle" | "play" | "over" = "idle";
  let overT = 0;
  let bannerT = 0;
  let banner = "";
  let stuckT = 0;
  let particles: Particle[] = [];
  const keys = { l: false, r: false };
  const touches = new Map<number, "l" | "r">();

  const leftOn = () => keys.l || [...touches.values()].includes("l");
  const rightOn = () => keys.r || [...touches.values()].includes("r");

  const add = (n: number) => {
    score += n * mult;
    hooks.onScore(score);
  };

  const serve = () => {
    ball = { x: 150 + Math.random() * 60, y: 60, vx: (Math.random() - 0.5) * 160, vy: 40 };
    stuckT = 0;
  };

  const reset = () => {
    balls = 3;
    score = 0;
    mult = 1;
    lit = [false, false, false, false, false];
    particles = [];
    ball = null;
    serveT = 0.8;
    for (const b of BUMPERS) b.flash = 0;
    left.ang = right.ang = REST;
    banner = "BOLA 1 DE 3";
    bannerT = 1;
    hooks.onScore(0);
  };

  /** Colisão da bola contra um segmento grosso; vs = velocidade da superfície no ponto de contato. */
  const hitSeg = (ax: number, ay: number, bx: number, by: number, rad: number, e: number, svx = 0, svy = 0, t0?: number) => {
    const b = ball!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((b.x - ax) * dx + (b.y - ay) * dy) / len2));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    let nx = b.x - cx;
    let ny = b.y - cy;
    const d = Math.hypot(nx, ny);
    if (d >= R + rad) return false;
    if (d < 1e-6) {
      nx = 0;
      ny = -1;
    } else {
      nx /= d;
      ny /= d;
    }
    b.x = cx + nx * (R + rad);
    b.y = cy + ny * (R + rad);
    const k = t0 === undefined ? 1 : Math.max(0.15, t); // quanto mais perto da ponta, mais rápido
    const rvx = b.vx - svx * k;
    const rvy = b.vy - svy * k;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx;
      b.vy -= (1 + e) * vn * ny;
    }
    return true;
  };

  const flipperStep = (f: Flipper, on: boolean, dt: number) => {
    f.prevX = f.tipX;
    f.prevY = f.tipY;
    const target = on ? UP : REST;
    const step = FLIP_SPEED * dt;
    f.ang = f.ang < target ? Math.min(target, f.ang + step) : Math.max(target, f.ang - step);
    const t = tipOf(f);
    f.tipX = t.x;
    f.tipY = t.y;
  };

  const physics = (dt: number) => {
    flipperStep(left, leftOn(), dt);
    flipperStep(right, rightOn(), dt);
    const b = ball;
    if (!b) return;
    b.vy += G * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    for (const w of walls) hitSeg(w.ax, w.ay, w.bx, w.by, 0, 0.55);
    for (const f of [left, right]) {
      // O ganho vem da velocidade da superfície do rebatedor no ponto de contato.
      hitSeg(f.px, f.py, f.tipX, f.tipY, 6, 0.45, (f.tipX - f.prevX) / dt, (f.tipY - f.prevY) / dt, 0);
    }
    for (const bp of BUMPERS) {
      const dx = b.x - bp.x;
      const dy = b.y - bp.y;
      const d = Math.hypot(dx, dy);
      if (d < bp.r + R) {
        const nx = d ? dx / d : 0;
        const ny = d ? dy / d : -1;
        b.x = bp.x + nx * (bp.r + R);
        b.y = bp.y + ny * (bp.r + R);
        const vn = b.vx * nx + b.vy * ny;
        const target = 460;
        b.vx += (Math.max(target, vn + 120) - vn) * nx;
        b.vy += (Math.max(target, vn + 120) - vn) * ny;
        bp.flash = 0.18;
        add(100);
        burst(particles, bp.x + nx * bp.r, bp.y + ny * bp.r, C.acc, 8, 200);
      }
    }
    TARGET_XS.forEach((x, i) => {
      const dx = b.x - x;
      const dy = b.y - TARGET_Y;
      const d = Math.hypot(dx, dy);
      if (d < 10 + R) {
        const nx = dx / (d || 1);
        const ny = dy / (d || 1);
        b.x = x + nx * (10 + R);
        b.y = TARGET_Y + ny * (10 + R);
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= 1.8 * vn * nx;
          b.vy -= 1.8 * vn * ny;
        }
        if (!lit[i]) {
          lit[i] = true;
          add(50);
          burst(particles, x, TARGET_Y, C.warn, 8, 180);
          if (lit.every(Boolean)) {
            add(500);
            mult = Math.min(5, mult + 1);
            lit = [false, false, false, false, false];
            banner = `ALVOS! MULTIPLICADOR x${mult}`;
            bannerT = 1.2;
          }
        }
      }
    });
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAX_V) {
      b.vx *= MAX_V / sp;
      b.vy *= MAX_V / sp;
    }
  };

  const update = (dt: number) => {
    stepParticles(particles, dt, 300);
    bannerT = Math.max(0, bannerT - dt);
    for (const bp of BUMPERS) bp.flash = Math.max(0, bp.flash - dt);
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
    if (!ball) {
      flipperStep(left, leftOn(), dt);
      flipperStep(right, rightOn(), dt);
      serveT -= dt;
      if (serveT <= 0) serve();
      return;
    }
    for (let i = 0; i < SUB; i++) physics(dt / SUB);
    const b = ball;
    // Bola parada por muito tempo (presa em algum canto): dá um empurrão.
    if (Math.hypot(b.vx, b.vy) < 25) {
      stuckT += dt;
      if (stuckT > 2.5) {
        b.vx += (Math.random() - 0.5) * 500;
        b.vy -= 300;
        stuckT = 0;
      }
    } else stuckT = 0;
    if (b.y > TH + 30) {
      ball = null;
      balls--;
      mult = 1;
      lit = [false, false, false, false, false];
      if (balls <= 0) {
        state = "over";
        overT = 1;
        banner = "FIM DAS BOLAS";
        bannerT = 1;
      } else {
        serveT = 0.9;
        banner = `BOLA ${3 - balls + 1} DE 3`;
        bannerT = 1;
      }
    }
  };

  const drawFlipper = (f: Flipper) => {
    ctx.lineCap = "round";
    ctx.strokeStyle = C.accDeep;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(f.px, f.py);
    ctx.lineTo(f.tipX, f.tipY);
    ctx.stroke();
    ctx.strokeStyle = C.acc;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(f.px, f.py);
    ctx.lineTo(f.tipX, f.tipY);
    ctx.stroke();
    ctx.lineCap = "butt";
  };

  const draw = () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(OX, 0);
    ctx.scale(scale, scale);
    // Mesa
    ctx.fillStyle = C.ink2;
    ctx.fillRect(0, 0, TW, TH);
    ctx.strokeStyle = C.acc;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (const w of walls) {
      ctx.moveTo(w.ax, w.ay);
      ctx.lineTo(w.bx, w.by);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (const bp of BUMPERS) {
      ctx.fillStyle = bp.flash > 0 ? C.paper : C.accDeep;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.acc;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = C.acc;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    TARGET_XS.forEach((x, i) => {
      ctx.fillStyle = lit[i] ? C.warn : C.ink3;
      ctx.beginPath();
      ctx.arc(x, TARGET_Y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.warn;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    drawFlipper(left);
    drawFlipper(right);
    if (ball) {
      ctx.fillStyle = "rgba(238,243,234,0.2)";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, R + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.paper;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2);
      ctx.fill();
    }
    drawParticles(ctx, particles);
    // HUD na base da mesa (cabe tanto em pé quanto deitado).
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = C.muted;
    ctx.fillText(`BOLAS ${"●".repeat(Math.max(0, balls))}${"○".repeat(Math.max(0, 3 - balls))}`, 14, 553);
    ctx.textAlign = "right";
    ctx.fillStyle = mult > 1 ? C.warn : C.muted;
    ctx.fillText(`x${mult}`, TW - 14, 553);
    ctx.textAlign = "left";
    if (bannerT > 0 && state !== "idle") {
      ctx.globalAlpha = Math.min(1, bannerT * 2);
      ctx.fillStyle = "rgba(6,8,7,0.82)";
      ctx.fillRect(16, 340, TW - 32, 40);
      ctx.font = `700 15px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillStyle = C.paper;
      ctx.fillText(banner, TW / 2, 365);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (landscape) {
      const x = OX + TW * scale + 36;
      ctx.font = `700 12px ${MONO}`;
      ctx.fillStyle = C.acc;
      ctx.fillText("PINBALL", x, 60);
      ctx.fillStyle = C.body;
      ctx.font = `13px ${MONO}`;
      const lines = [
        "Bumpers: 100 pontos.",
        "Alvos: acenda os 5 para",
        "subir o multiplicador.",
        "",
        "← ou A: rebatedor esquerdo",
        "→ ou D: rebatedor direito",
        "Espaço: os dois juntos",
        "Toque: metade esquerda ou",
        "direita da tela",
      ];
      lines.forEach((t, i) => ctx.fillText(t, x, 92 + i * 22));
    }
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  const press = (e: Event, on: boolean) => {
    const k = e as KeyboardEvent;
    if (state !== "play") return;
    if (k.code === "ArrowLeft" || k.code === "KeyA" || k.code === "KeyZ") {
      k.preventDefault();
      keys.l = on;
    } else if (k.code === "ArrowRight" || k.code === "KeyD" || k.code === "KeyM" || k.code === "Slash") {
      k.preventDefault();
      keys.r = on;
    } else if (k.code === "Space") {
      k.preventDefault();
      keys.l = keys.r = on;
    }
  };
  const onDown = (e: Event) => {
    const p = e as PointerEvent;
    p.preventDefault();
    if (state !== "play") return;
    const l = toLocal(canvas, p, W, H);
    touches.set(p.pointerId, l.x < W / 2 ? "l" : "r");
  };
  const onUp = (e: Event) => touches.delete((e as PointerEvent).pointerId);
  const off = listen(
    [canvas, "pointerdown", onDown],
    [window, "pointerup", onUp],
    [window, "pointercancel", onUp],
    [window, "keydown", (e) => press(e, true)],
    [window, "keyup", (e) => press(e, false)],
  );

  reset();
  bannerT = 0;
  serve();
  draw();

  return {
    start() {
      reset();
      state = "play";
      loop.start();
    },
    pause() {
      loop.stop();
      keys.l = keys.r = false;
      touches.clear();
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
