// Motor mínimo dos jogos do Arcade: canvas nítido (devicePixelRatio), laço de animação
// com dt limitado, coordenadas de toque/mouse no espaço lógico do jogo e cores do tema.
// Cada jogo exporta `create(canvas, hooks)` e o ArcadeShell cuida de telas, recorde e pausa.

export interface GameHooks {
  /** Pontuação atual (o shell mostra acima do canvas). */
  onScore(score: number): void;
  /** Fim de partida; o shell mostra a tela de "fim de jogo" e salva o recorde. */
  onOver(score: number): void;
}

export interface GameInstance {
  /** Começa (ou recomeça do zero) uma partida. */
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

/** Tamanho lógico escolhido pela moldura: horizontal no PC, vertical no celular. */
export interface GameSize {
  W: number;
  H: number;
  landscape: boolean;
}

export type GameFactory = (canvas: HTMLCanvasElement, hooks: GameHooks, size: GameSize) => GameInstance;

export const C = {
  ink: "#060807",
  ink2: "#0c110c",
  ink3: "#111611",
  line: "#1c241a",
  lineSoft: "#243022",
  paper: "#eef3ea",
  body: "#b4bfb0",
  muted: "#8a9787",
  acc: "#c8ff2e",
  accSoft: "#dcff7a",
  accDeep: "#3d5200",
  warn: "#ffb020",
  danger: "#ff5a3c",
};

export const MONO = '"JetBrains Mono", ui-monospace, monospace';

/** Ajusta o canvas à densidade da tela e devolve o contexto já na escala lógica W×H. */
export function setupCanvas(canvas: HTMLCanvasElement, W: number, H: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Laço de requestAnimationFrame; dt em segundos, limitado para não "teleportar" após travadas. */
export function createLoop(step: (dt: number) => void) {
  let raf = 0;
  let last = 0;
  let on = false;
  const frame = (t: number) => {
    if (!on) return;
    const dt = Math.min(0.033, Math.max(0, (t - last) / 1000));
    last = t;
    step(dt);
    if (on) raf = requestAnimationFrame(frame);
  };
  return {
    start() {
      if (on) return;
      on = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      on = false;
      cancelAnimationFrame(raf);
    },
    get running() {
      return on;
    },
  };
}

/** Posição do ponteiro no espaço lógico do jogo. */
export function toLocal(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }, W: number, H: number) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}

/** Registra listeners e devolve uma função que remove todos. */
export function listen(...items: [EventTarget, string, EventListenerOrEventListenerObject, AddEventListenerOptions?][]) {
  for (const [t, ev, fn, o] of items) t.addEventListener(ev, fn, o);
  return () => {
    for (const [t, ev, fn, o] of items) t.removeEventListener(ev, fn, o);
  };
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

export function burst(list: Particle[], x: number, y: number, color: string, n = 18, speed = 260) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(speed * 0.3, speed);
    const life = rand(0.35, 0.8);
    list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: rand(2, 5), color });
  }
}

export function stepParticles(list: Particle[], dt: number, gravity = 900) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[]) {
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

/** Grade de fundo do tema "Central de Comando", com deslocamento opcional (parallax). */
export function drawGrid(ctx: CanvasRenderingContext2D, W: number, H: number, size = 32, offX = 0, offY = 0, color = "rgba(200,255,46,0.05)") {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -((offX % size) + size) % size; x < W; x += size) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, H);
  }
  for (let y = -((offY % size) + size) % size; y < H; y += size) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(W, Math.round(y) + 0.5);
  }
  ctx.stroke();
}
