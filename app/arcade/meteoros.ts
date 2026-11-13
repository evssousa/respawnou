// Chuva de Meteoros: a nave atira sozinha; você só desvia e mira. Meteoros grandes se partem
// em dois menores. Itens: tiro triplo (8 s) e escudo (aguenta uma batida). 3 vidas.
import { burst, C, clamp, createLoop, drawParticles, listen, MONO, rand, setupCanvas, stepParticles, toLocal, type GameFactory, type Particle } from "./engine";

const SHIP_R = 12;
const FIRE_EVERY = 0.16;

type Rock = { x: number; y: number; r: number; vx: number; vy: number; hp: number; rot: number; vr: number; shape: number[]; flash: number };
type Shot = { x: number; y: number; vx: number; vy: number };
type Item = { x: number; y: number; kind: "triplo" | "escudo"; t: number };
type Star = { x: number; y: number; s: number; z: number };

const SIZES = [
  { r: 10, hp: 1, pts: 10 },
  { r: 17, hp: 2, pts: 20 },
  { r: 26, hp: 4, pts: 40 },
];

const makeShape = () => Array.from({ length: 9 }, () => rand(0.75, 1.1));

export const create: GameFactory = (canvas, hooks, { W, H }) => {
  // Tela larga recebe mais meteoros (mesma densidade por área).
  const DENS = 360 / W;
  const ctx = setupCanvas(canvas, W, H);
  let x = W / 2;
  let y = H - 70;
  let tx: number | null = null;
  let ty: number | null = null;
  let keyX = 0;
  let keyY = 0;
  let rocks: Rock[] = [];
  let shots: Shot[] = [];
  let items: Item[] = [];
  let particles: Particle[] = [];
  let lives = 3;
  let score = 0;
  let time = 0;
  let fireT = 0;
  let spawnT = 0;
  let triple = 0;
  let shield = false;
  let invul = 0;
  let shake = 0;
  let state: "idle" | "play" | "over" = "idle";
  let overT = 0;
  const stars: Star[] = Array.from({ length: 60 }, () => ({ x: rand(0, W), y: rand(0, H), s: rand(1, 2.2), z: rand(0.3, 1) }));

  const reset = () => {
    x = W / 2;
    y = H - 70;
    tx = ty = null;
    keyX = keyY = 0;
    rocks = [];
    shots = [];
    items = [];
    particles = [];
    lives = 3;
    score = 0;
    time = 0;
    fireT = 0;
    spawnT = 0.8;
    triple = 0;
    shield = false;
    invul = 0;
    shake = 0;
    hooks.onScore(0);
  };

  const addScore = (n: number) => {
    score += n;
    hooks.onScore(score);
  };

  const spawnRock = (size: number, px?: number, py?: number, dir = 0) => {
    const s = SIZES[size];
    const speed = rand(70, 120) + time * 1.6;
    rocks.push({
      x: px ?? rand(s.r, W - s.r),
      y: py ?? -s.r - 4,
      r: s.r,
      vx: dir ? dir * rand(40, 90) : rand(-30, 30),
      vy: Math.min(340, speed) * (size === 2 ? 0.75 : 1),
      hp: s.hp,
      rot: rand(0, Math.PI * 2),
      vr: rand(-2, 2),
      shape: makeShape(),
      flash: 0,
    });
  };

  const sizeOf = (r: Rock) => SIZES.findIndex((s) => s.r === r.r);

  const destroy = (r: Rock) => {
    const i = sizeOf(r);
    addScore(SIZES[i].pts);
    burst(particles, r.x, r.y, i === 2 ? C.warn : C.body, 8 + i * 6, 200);
    rocks.splice(rocks.indexOf(r), 1);
    if (i > 0) {
      spawnRock(i - 1, r.x - 6, r.y, -1);
      spawnRock(i - 1, r.x + 6, r.y, 1);
    }
    if (Math.random() < 0.06 + i * 0.03) items.push({ x: r.x, y: r.y, kind: Math.random() < 0.55 ? "triplo" : "escudo", t: 0 });
  };

  const hitShip = () => {
    if (invul > 0) return;
    shake = 0.3;
    if (shield) {
      shield = false;
      invul = 1;
      burst(particles, x, y, C.acc, 16, 220);
      return;
    }
    lives--;
    burst(particles, x, y, C.danger, 26, 300);
    if (lives <= 0) {
      state = "over";
      overT = 0.8;
      return;
    }
    invul = 1.8;
    triple = 0;
  };

  const update = (dt: number) => {
    shake = Math.max(0, shake - dt);
    for (const s of stars) {
      s.y += (40 + s.z * 120) * dt;
      if (s.y > H) {
        s.y = 0;
        s.x = rand(0, W);
      }
    }
    stepParticles(particles, dt, 0);
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
    invul = Math.max(0, invul - dt);
    triple = Math.max(0, triple - dt);

    // Movimento: segue o dedo/mouse; teclado move direto.
    if (keyX || keyY) tx = ty = null;
    if (tx !== null && ty !== null) {
      x += (tx - x) * Math.min(1, dt * 14);
      y += (ty - y) * Math.min(1, dt * 14);
    } else {
      x += keyX * 300 * dt;
      y += keyY * 300 * dt;
    }
    x = clamp(x, SHIP_R, W - SHIP_R);
    y = clamp(y, H * 0.45, H - SHIP_R - 8);

    // Tiro automático.
    fireT -= dt;
    if (fireT <= 0) {
      fireT = FIRE_EVERY;
      shots.push({ x, y: y - 14, vx: 0, vy: -620 });
      if (triple > 0) shots.push({ x: x - 6, y: y - 10, vx: -150, vy: -600 }, { x: x + 6, y: y - 10, vx: 150, vy: -600 });
    }
    for (const s of shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    shots = shots.filter((s) => s.y > -10 && s.x > -10 && s.x < W + 10);

    // Meteoros: chegam mais rápido e com mais frequência com o tempo.
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = Math.max(0.28, 1.1 - time * 0.012) * rand(0.6, 1.3) * DENS;
      const roll = Math.random();
      spawnRock(roll < 0.25 + Math.min(0.25, time * 0.003) ? 2 : roll < 0.6 ? 1 : 0);
    }
    for (const r of rocks) {
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.rot += r.vr * dt;
      r.flash = Math.max(0, r.flash - dt);
      if (r.x < r.r || r.x > W - r.r) r.vx = -r.vx;
    }
    rocks = rocks.filter((r) => r.y - r.r < H + 10);

    for (const s of [...shots]) {
      const r = rocks.find((k) => (k.x - s.x) ** 2 + (k.y - s.y) ** 2 < (k.r + 3) ** 2);
      if (!r) continue;
      shots.splice(shots.indexOf(s), 1);
      r.hp--;
      r.flash = 0.08;
      if (r.hp <= 0) destroy(r);
    }
    // Piscando (logo após uma batida) a nave atravessa os meteoros.
    const crash = invul > 0 ? undefined : rocks.find((r) => (r.x - x) ** 2 + (r.y - y) ** 2 < (r.r * 0.85 + SHIP_R * 0.7) ** 2);
    if (crash) {
      hitShip();
      burst(particles, crash.x, crash.y, C.body, 10, 180);
      rocks.splice(rocks.indexOf(crash), 1);
    }

    for (const it of items) {
      it.y += 90 * dt;
      it.t += dt;
      if ((it.x - x) ** 2 + (it.y - y) ** 2 < 24 ** 2) {
        if (it.kind === "triplo") triple = 8;
        else shield = true;
        addScore(25);
        it.y = H + 99;
        burst(particles, x, y, C.acc, 10, 140);
      }
    }
    items = items.filter((it) => it.y < H + 20);
  };

  const drawRock = (r: Rock) => {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    ctx.beginPath();
    r.shape.forEach((k, i) => {
      const a = (i / r.shape.length) * Math.PI * 2;
      const px = Math.cos(a) * r.r * k;
      const py = Math.sin(a) * r.r * k;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = r.flash > 0 ? C.paper : C.ink3;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = r.hp >= 3 ? C.warn : r.hp === 2 ? C.body : C.muted;
    ctx.stroke();
    ctx.fillStyle = C.lineSoft;
    ctx.fillRect(-r.r * 0.3, -r.r * 0.2, r.r * 0.25, r.r * 0.25);
    ctx.restore();
  };

  const drawShip = () => {
    if (invul > 0 && Math.floor(invul * 12) % 2 === 0) return;
    ctx.save();
    ctx.translate(x, y);
    // Chama do motor.
    ctx.fillStyle = Math.random() < 0.5 ? C.warn : C.danger;
    ctx.fillRect(-3, 10, 6, rand(5, 10));
    ctx.fillStyle = C.acc;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(12, 11);
    ctx.lineTo(4, 7);
    ctx.lineTo(-4, 7);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.fillRect(-2, -5, 4, 6);
    if (shield) {
      ctx.strokeStyle = `rgba(200,255,46,${0.5 + Math.sin(time * 8) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 21, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  const draw = () => {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-4, 4) * shake * 3, rand(-4, 4) * shake * 3);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    for (const s of stars) {
      ctx.fillStyle = `rgba(238,243,234,${0.15 + s.z * 0.45})`;
      ctx.fillRect(s.x, s.y, s.s, s.s * (1 + s.z * 2));
    }
    ctx.fillStyle = C.accSoft;
    for (const s of shots) ctx.fillRect(s.x - 1.5, s.y - 6, 3, 10);
    for (const r of rocks) drawRock(r);
    for (const it of items) {
      const pulse = 1 + Math.sin(it.t * 8) * 0.1;
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = it.kind === "triplo" ? C.warn : C.acc;
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = C.ink;
      ctx.font = `700 13px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillText(it.kind === "triplo" ? "3" : "E", 0, 5);
      ctx.restore();
    }
    if (state !== "over") drawShip();
    drawParticles(ctx, particles);
    ctx.restore();

    // Vidas e bônus ativo.
    ctx.textAlign = "left";
    ctx.fillStyle = C.acc;
    for (let i = 0; i < lives; i++) {
      ctx.beginPath();
      ctx.moveTo(14 + i * 18, 14);
      ctx.lineTo(21 + i * 18, 28);
      ctx.lineTo(7 + i * 18, 28);
      ctx.fill();
    }
    if (triple > 0) {
      ctx.font = `700 11px ${MONO}`;
      ctx.fillStyle = C.warn;
      ctx.textAlign = "right";
      ctx.fillText(`TIRO TRIPLO ${Math.ceil(triple)}s`, W - 10, 26);
      ctx.textAlign = "left";
    }
  };

  const loop = createLoop((dt) => {
    update(dt);
    draw();
  });

  const pressed = new Set<string>();
  const syncKeys = () => {
    keyX = (pressed.has("R") ? 1 : 0) - (pressed.has("L") ? 1 : 0);
    keyY = (pressed.has("D") ? 1 : 0) - (pressed.has("U") ? 1 : 0);
  };
  const KEYS: Record<string, string> = { ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R", ArrowUp: "U", KeyW: "U", ArrowDown: "D", KeyS: "D" };
  const onKey = (e: Event) => {
    const k = e as KeyboardEvent;
    const dir = KEYS[k.code];
    if (!dir || state !== "play") return;
    k.preventDefault();
    if (k.type === "keydown") pressed.add(dir);
    else pressed.delete(dir);
    syncKeys();
  };
  const onPointer = (e: Event) => {
    const p = e as PointerEvent;
    if (state !== "play") return;
    if (p.type === "pointermove" && p.pointerType !== "mouse" && p.buttons === 0) return;
    p.preventDefault();
    const l = toLocal(canvas, p, W, H);
    tx = l.x;
    // No toque a nave fica acima do dedo, para o dedo não cobrir a nave.
    ty = l.y - (p.pointerType === "mouse" ? 0 : 56);
  };
  const off = listen([window, "keydown", onKey], [window, "keyup", onKey], [canvas, "pointerdown", onPointer], [canvas, "pointermove", onPointer]);

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
      pressed.clear();
      syncKeys();
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
