// Paciência (Klondike, vira 1 carta). Toque numa carta para ela ir sozinha ao melhor lugar,
// ou arraste. Mão completa vale bônus e já distribui outra: os pontos acumulam até você
// tocar em ENCERRAR (dois toques, para não encerrar sem querer).
import { burst, C, createLoop, listen, MONO, setupCanvas, stepParticles, drawParticles, toLocal, type GameFactory, type Particle } from "./engine";

const W = 360;
const H = 600;
const CW = 46;
const CH = 64;
const GAP = 5;
const MX = 4;
const BAR = 36;
const ROW_Y = BAR + 8;
const TAB_Y = ROW_Y + CH + 14;
const DOWN = 9;
const UP = 20;
const RED = "#e0453a";
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const END_BTN = { x: W - 112, y: 6, w: 104, h: 24 };

type Card = { rank: number; suit: number; up: boolean };
type Src = { kind: "waste" } | { kind: "found"; i: number } | { kind: "tab"; i: number; from: number };

const colX = (i: number) => MX + i * (CW + GAP);
const red = (c: Card) => c.suit === 1 || c.suit === 2;

export const create: GameFactory = (canvas, hooks) => {
  const ctx = setupCanvas(canvas, W, H);
  let stock: Card[] = [];
  let waste: Card[] = [];
  let found: Card[][] = [[], [], [], []];
  let tab: Card[][] = [];
  let score = 0;
  let hand = 1;
  let drag: { src: Src; cards: Card[]; dx: number; dy: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
  let particles: Particle[] = [];
  let banner = "";
  let bannerT = 0;
  let nextT = 0;
  let autoT = 0;
  let confirmEnd = 0;
  let state: "idle" | "play" | "over" = "idle";

  const add = (n: number) => {
    score = Math.max(0, score + n);
    hooks.onScore(score);
  };

  const deal = () => {
    const deck: Card[] = [];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ rank: r, suit: s, up: false });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    tab = Array.from({ length: 7 }, (_, i) => {
      const col = deck.splice(0, i + 1);
      col[i].up = true;
      return col;
    });
    stock = deck;
    waste = [];
    found = [[], [], [], []];
    drag = null;
    banner = `MÃO ${hand}`;
    bannerT = 1;
  };

  const reset = () => {
    score = 0;
    hand = 1;
    particles = [];
    nextT = 0;
    confirmEnd = 0;
    deal();
    hooks.onScore(0);
  };

  // Altura de cada coluna cabe na tela: comprime o espaçamento se precisar.
  const offsets = (col: Card[]) => {
    const natural = col.reduce((h, c, i) => (i === col.length - 1 ? h : h + (c.up ? UP : DOWN)), 0);
    const room = H - TAB_Y - CH - 8;
    const k = natural > room ? room / natural : 1;
    let y = TAB_Y;
    return col.map((c) => {
      const cy = y;
      y += (c.up ? UP : DOWN) * k;
      return cy;
    });
  };

  const canFound = (card: Card, f: Card[]) => (f.length === 0 ? card.rank === 1 : f.at(-1)!.suit === card.suit && f.at(-1)!.rank === card.rank - 1);
  const canTab = (card: Card, col: Card[]) => {
    const top = col.at(-1);
    return top ? top.up && red(top) !== red(card) && top.rank === card.rank + 1 : card.rank === 13;
  };

  const take = (src: Src) => {
    if (src.kind === "waste") return waste.splice(-1);
    if (src.kind === "found") return found[src.i].splice(-1);
    return tab[src.kind === "tab" ? src.i : 0].splice(src.from);
  };

  const flipTops = () => {
    for (const col of tab) {
      const top = col.at(-1);
      if (top && !top.up) {
        top.up = true;
        add(5);
      }
    }
  };

  const fx = (i: number, y: number, color: string) => burst(particles, colX(i) + CW / 2, y + CH / 2, color, 8, 140);

  const checkWin = () => {
    if (found.every((f) => f.length === 13)) {
      add(500);
      banner = "MÃO COMPLETA! +500";
      bannerT = 1.6;
      nextT = 1.7;
      for (let i = 0; i < 7; i++) fx(i, ROW_Y, C.acc);
    }
  };

  const moveTo = (src: Src, dest: { kind: "found"; i: number } | { kind: "tab"; i: number }) => {
    const cards = src.kind === "tab" ? tab[src.i].slice(src.from) : src.kind === "waste" ? waste.slice(-1) : found[src.i].slice(-1);
    if (!cards.length) return false;
    if (dest.kind === "found") {
      if (cards.length !== 1 || !canFound(cards[0], found[dest.i]) || (src.kind === "found" && src.i === dest.i)) return false;
      found[dest.i].push(...take(src));
      if (src.kind !== "found") add(10);
      fx(3 + dest.i, ROW_Y, C.acc);
    } else {
      if ((src.kind === "tab" && src.i === dest.i) || !canTab(cards[0], tab[dest.i])) return false;
      tab[dest.i].push(...take(src));
      if (src.kind === "waste") add(5);
      if (src.kind === "found") add(-15);
    }
    flipTops();
    checkWin();
    return true;
  };

  // Toque: fundação primeiro (carta solta), depois a melhor coluna (não vazia antes da vazia).
  const autoMove = (src: Src) => {
    const single = src.kind !== "tab" || src.from === tab[src.i].length - 1;
    if (single && src.kind !== "found") for (let i = 0; i < 4; i++) if (moveTo(src, { kind: "found", i })) return true;
    const order = [...tab.keys()].sort((a, b) => Number(tab[a].length === 0) - Number(tab[b].length === 0));
    for (const i of order) {
      // Rei já no topo de uma coluna vazia não precisa ir para outra vazia.
      if (src.kind === "tab" && src.from === 0 && tab[i].length === 0) continue;
      if (moveTo(src, { kind: "tab", i })) return true;
    }
    return false;
  };

  const drawStock = () => {
    if (stock.length) {
      const c = stock.pop()!;
      c.up = true;
      waste.push(c);
    } else if (waste.length) {
      stock = waste.reverse().map((c) => ({ ...c, up: false }));
      waste = [];
    }
  };

  const hit = (x: number, y: number): Src | "stock" | null => {
    if (y >= ROW_Y && y <= ROW_Y + CH) {
      if (x >= colX(0) && x <= colX(0) + CW) return "stock";
      if (x >= colX(1) && x <= colX(1) + CW && waste.length) return { kind: "waste" };
      for (let i = 0; i < 4; i++) if (x >= colX(3 + i) && x <= colX(3 + i) + CW && found[i].length) return { kind: "found", i };
      return null;
    }
    const i = Math.floor((x - MX) / (CW + GAP));
    if (i < 0 || i > 6 || x > colX(i) + CW) return null;
    const ys = offsets(tab[i]);
    for (let k = tab[i].length - 1; k >= 0; k--) {
      if (y >= ys[k] && y <= ys[k] + CH) return tab[i][k].up ? { kind: "tab", i, from: k } : null;
    }
    return null;
  };

  const update = (dt: number) => {
    stepParticles(particles, dt, 300);
    bannerT = Math.max(0, bannerT - dt);
    confirmEnd = Math.max(0, confirmEnd - dt);
    if (state !== "play") return;
    if (nextT > 0) {
      nextT -= dt;
      if (nextT <= 0) {
        hand++;
        deal();
      }
      return;
    }
    // Final automático: tudo virado e sem monte → as cartas sobem sozinhas.
    if (!drag && !stock.length && !waste.length && tab.every((c) => c.every((k) => k.up)) && tab.some((c) => c.length)) {
      autoT -= dt;
      if (autoT <= 0) {
        autoT = 0.06;
        const order = [...tab.keys()].filter((i) => tab[i].length).sort((a, b) => tab[a].at(-1)!.rank - tab[b].at(-1)!.rank);
        for (const i of order) if (autoMove({ kind: "tab", i, from: tab[i].length - 1 })) break;
      }
    }
  };

  const drawCard = (c: Card, x: number, y: number) => {
    if (!c.up) {
      ctx.fillStyle = C.accDeep;
      ctx.fillRect(x, y, CW, CH);
      ctx.strokeStyle = C.acc;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3.5, y + 3.5, CW - 7, CH - 7);
      ctx.fillStyle = "rgba(200,255,46,0.25)";
      for (let k = 8; k < CH - 6; k += 6) ctx.fillRect(x + 6, y + k, CW - 12, 1);
      return;
    }
    ctx.fillStyle = C.paper;
    ctx.fillRect(x, y, CW, CH);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
    const col = red(c) ? RED : C.ink;
    ctx.fillStyle = col;
    ctx.font = `700 13px ${MONO}`;
    ctx.textAlign = "left";
    ctx.fillText(RANKS[c.rank], x + 3, y + 13);
    ctx.font = `13px sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(SUITS[c.suit], x + CW - 3, y + 13);
    ctx.font = `26px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(SUITS[c.suit], x + CW / 2, y + CH - 14);
    ctx.textAlign = "left";
  };

  const slot = (x: number, y: number, label = "") => {
    ctx.strokeStyle = C.lineSoft;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, CW - 1.5, CH - 1.5);
    if (label) {
      ctx.fillStyle = C.lineSoft;
      ctx.font = `22px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(label, x + CW / 2, y + CH / 2 + 8);
      ctx.textAlign = "left";
    }
  };

  const isDragged = (src: Src, k?: number) => {
    if (!drag || !drag.moved) return false;
    const d = drag.src;
    if (d.kind !== src.kind) return false;
    if (d.kind === "tab" && src.kind === "tab") return d.i === src.i && k !== undefined && k >= d.from;
    if (d.kind === "found" && src.kind === "found") return d.i === src.i;
    return true;
  };

  const draw = () => {
    ctx.fillStyle = "#0a1a10";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.ink2;
    ctx.fillRect(0, 0, W, BAR);
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = C.acc;
    ctx.fillText(`MÃO ${hand}`, 10, 23);
    ctx.fillStyle = C.muted;
    ctx.fillText(`MONTE ${stock.length}`, 74, 23);
    ctx.fillStyle = confirmEnd > 0 ? C.danger : C.ink3;
    ctx.fillRect(END_BTN.x, END_BTN.y, END_BTN.w, END_BTN.h);
    ctx.fillStyle = confirmEnd > 0 ? C.ink : C.muted;
    ctx.textAlign = "center";
    ctx.fillText(confirmEnd > 0 ? "TOQUE DE NOVO" : "ENCERRAR", END_BTN.x + END_BTN.w / 2, END_BTN.y + 16);
    ctx.textAlign = "left";

    // Monte e descarte.
    if (stock.length) drawCard(stock.at(-1)!, colX(0), ROW_Y);
    else slot(colX(0), ROW_Y, waste.length ? "↺" : "");
    const wTop = waste.length - (isDragged({ kind: "waste" }) ? 2 : 1);
    if (wTop >= 0) drawCard(waste[wTop], colX(1), ROW_Y);
    else slot(colX(1), ROW_Y);
    // Fundações.
    for (let i = 0; i < 4; i++) {
      const f = found[i];
      const top = f.length - (isDragged({ kind: "found", i }) ? 2 : 1);
      if (top >= 0) drawCard(f[top], colX(3 + i), ROW_Y);
      else slot(colX(3 + i), ROW_Y, "A");
    }
    // Colunas.
    tab.forEach((col, i) => {
      if (!col.length) return slot(colX(i), TAB_Y, "K");
      const ys = offsets(col);
      col.forEach((c, k) => {
        if (!isDragged({ kind: "tab", i, from: 0 }, k)) drawCard(c, colX(i), ys[k]);
      });
    });
    // Cartas sendo arrastadas.
    if (drag?.moved) drag.cards.forEach((c, k) => drawCard(c, drag!.x - drag!.dx, drag!.y - drag!.dy + k * UP));
    drawParticles(ctx, particles);

    if (bannerT > 0 && state === "play") {
      ctx.globalAlpha = Math.min(1, bannerT * 2);
      ctx.fillStyle = "rgba(6,8,7,0.8)";
      ctx.fillRect(0, H / 2 - 24, W, 42);
      ctx.font = `700 17px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillStyle = C.paper;
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
    const p = e as PointerEvent;
    p.preventDefault();
    if (state !== "play" || nextT > 0) return;
    const l = toLocal(canvas, p, W, H);
    if (l.y < BAR) {
      if (l.x >= END_BTN.x) {
        if (confirmEnd > 0) {
          state = "over";
          loop.stop();
          hooks.onOver(score);
        } else confirmEnd = 2;
      }
      return;
    }
    const h = hit(l.x, l.y);
    if (!h) return;
    if (h === "stock") return drawStock();
    let cx = 0;
    let cy = 0;
    let cards: Card[] = [];
    if (h.kind === "waste") {
      cx = colX(1);
      cy = ROW_Y;
      cards = waste.slice(-1);
    } else if (h.kind === "found") {
      cx = colX(3 + h.i);
      cy = ROW_Y;
      cards = found[h.i].slice(-1);
    } else {
      cx = colX(h.i);
      cy = offsets(tab[h.i])[h.from];
      cards = tab[h.i].slice(h.from);
    }
    drag = { src: h, cards, dx: l.x - cx, dy: l.y - cy, x: l.x, y: l.y, sx: l.x, sy: l.y, moved: false };
  };
  const onMove = (e: Event) => {
    if (!drag) return;
    const l = toLocal(canvas, e as PointerEvent, W, H);
    drag.x = l.x;
    drag.y = l.y;
    if (Math.hypot(l.x - drag.sx, l.y - drag.sy) > 6) drag.moved = true;
  };
  const onUp = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.moved) {
      autoMove(d.src);
      return;
    }
    // Solta: vale o centro da carta arrastada.
    const cx = d.x - d.dx + CW / 2;
    const cy = d.y - d.dy + CH / 2;
    const i = Math.max(0, Math.min(6, Math.floor((cx - MX) / (CW + GAP))));
    if (cy < TAB_Y - 4 && i >= 3) moveTo(d.src, { kind: "found", i: i - 3 });
    else if (cy >= TAB_Y - 4) moveTo(d.src, { kind: "tab", i });
  };
  const off = listen([canvas, "pointerdown", onDown], [window, "pointermove", onMove], [window, "pointerup", onUp]);

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
      drag = null;
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
