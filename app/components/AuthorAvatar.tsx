// Avatar de cada autor da redação: um mascote em pixel art desenhado por código (sem imagem externa), no tema do site.
// Cabeça de robô com a mesma base; cada autor muda a antena, a cor dos olhos e um detalhe.

const BASE = [
  "............", // 0 antena (muda por autor)
  "............", // 1 antena
  "..bbbbbbbb..",
  ".bbbbbbbbbb.",
  ".bddddddddb.",
  ".bdeeddeedb.",
  ".bdeeddeedb.",
  ".bddddddddb.",
  ".bddwwwwddb.",
  ".bbbbbbbbbb.",
  "..bbbbbbbb..",
  "...bb..bb...",
];

const ANT: Record<string, [string, string]> = {
  nox: ["..a......a..", "..a......a.."], // duas antenas: radar de notícias
  lume: ["....aaaa....", "....aaaa...."], // lâmpada acesa: ideia
  vero: ["....a..a....", "...aaaaaa..."], // estrela/placar
  atlas: ["....aaaa....", ".....aa....."], // bússola
  loot: ["...a.aa.a...", "....aaaa...."], // moeda/baú
};

const COLORS: Record<string, { b: string; e: string; a: string }> = {
  nox: { b: "#c8ff2e", e: "#c8ff2e", a: "#ffb020" },
  lume: { b: "#ffd84d", e: "#ffd84d", a: "#c8ff2e" },
  vero: { b: "#ff8a5c", e: "#ffb020", a: "#c8ff2e" },
  atlas: { b: "#5cc8ff", e: "#c8ff2e", a: "#eef3ea" },
  loot: { b: "#b58cff", e: "#ffd84d", a: "#ffd84d" },
};

export function AuthorAvatar({ slug, className }: { slug: string; className?: string }) {
  const c = COLORS[slug] ?? COLORS.nox;
  const [a0, a1] = ANT[slug] ?? ANT.nox;
  const rows = [a0, a1, ...BASE.slice(2)];
  const fill: Record<string, string> = { b: c.b, d: "#060807", e: c.e, w: "#eef3ea", a: c.a };
  return (
    <svg viewBox="0 0 12 12" className={className} role="img" aria-hidden shapeRendering="crispEdges">
      <rect width="12" height="12" fill="#0c110c" />
      {rows.map((row, y) =>
        [...row].map((ch, x) => (ch !== "." ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill[ch]} /> : null)),
      )}
    </svg>
  );
}
