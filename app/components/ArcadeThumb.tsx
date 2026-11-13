// Miniaturas dos jogos do Arcade em SVG (pixel art no tema do site, sem imagem externa).
const ACC = "#c8ff2e";
const WARN = "#ffb020";
const DANGER = "#ff5a3c";
const PAPER = "#eef3ea";
const INK = "#060807";
const INK3 = "#111611";

const grid = (
  <pattern id="arcade-grid" width="12" height="12" patternUnits="userSpaceOnUse">
    <path d="M12 0H0V12" fill="none" stroke="rgba(200,255,46,0.08)" strokeWidth="1" />
  </pattern>
);

export function ArcadeThumb({ slug, className }: { slug: string; className?: string }) {
  return (
    <svg viewBox="0 0 160 90" className={className} role="img" aria-hidden shapeRendering="crispEdges">
      <defs>{grid}</defs>
      <rect width="160" height="90" fill="#0c110c" />
      <rect width="160" height="90" fill="url(#arcade-grid)" />
      {slug === "respawn" && (
        <>
          <rect x="0" y="70" width="160" height="20" fill={INK3} />
          <rect x="0" y="70" width="96" height="1.5" fill={ACC} />
          <rect x="118" y="70" width="42" height="1.5" fill={ACC} />
          <rect x="96" y="70" width="22" height="20" fill={INK} />
          <rect x="62" y="52" width="10" height="18" fill="none" stroke={WARN} strokeWidth="1.5" />
          <rect x="132" y="38" width="14" height="6" fill={DANGER} />
          {/* Personagem no ar */}
          <rect x="34" y="30" width="10" height="8" fill={ACC} />
          <rect x="39" y="32" width="5" height="2" fill={INK} />
          <rect x="34" y="38" width="3" height="5" fill={ACC} />
          <rect x="41" y="38" width="3" height="4" fill={ACC} />
          <rect x="18" y="44" width="6" height="1.5" fill="rgba(200,255,46,0.5)" />
          <rect x="22" y="40" width="6" height="1.5" fill="rgba(200,255,46,0.35)" />
        </>
      )}
      {slug === "torre" && (
        <>
          <rect x="0" y="80" width="160" height="10" fill={INK3} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const w = 56 - i * 5;
            const x = 52 + i * 2 + (i % 2 ? 2 : 0);
            return <rect key={i} x={x} y={72 - i * 8} width={w} height="8" fill={`hsl(${78 + i * 7} 95% 56%)`} />;
          })}
          <rect x="88" y="16" width="30" height="8" fill="hsl(127 95% 56%)" />
          <rect x="60" y="24" width="1" height="4" fill={PAPER} opacity="0.5" />
        </>
      )}
      {slug === "quebra-pixel" && (
        <>
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4, 5, 6, 7].map((c) =>
              (r + c) % 3 === 2 && r > 0 ? null : (
                <rect key={`${r}-${c}`} x={10 + c * 18} y={10 + r * 8} width="16" height="6" fill={r === 0 ? DANGER : r === 1 ? WARN : ACC} />
              ),
            ),
          )}
          <rect x="94" y="56" width="4" height="4" fill={PAPER} />
          <rect x="66" y="78" width="30" height="4" fill={PAPER} />
        </>
      )}
      {slug === "meteoros" && (
        <>
          {[[20, 12], [140, 20], [70, 8], [110, 60], [30, 70], [150, 80], [90, 30]].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="1.5" height="3" fill={PAPER} opacity="0.5" />
          ))}
          <polygon points="40,14 54,10 62,22 56,34 42,34 34,24" fill={INK3} stroke={WARN} strokeWidth="1.5" />
          <polygon points="108,28 116,26 120,34 114,40 106,38" fill={INK3} stroke="#b4bfb0" strokeWidth="1.5" />
          <rect x="82" y="40" width="1.5" height="6" fill="#dcff7a" />
          <rect x="82" y="52" width="1.5" height="6" fill="#dcff7a" />
          <polygon points="83,62 92,80 86,77 80,77 74,80" fill={ACC} />
          <rect x="81" y="80" width="4" height="5" fill={WARN} />
          <rect x="128" y="62" width="10" height="10" fill={ACC} />
        </>
      )}
      {slug === "cabo-de-forca" && (
        <>
          <path d="M20 70 H70 V40 H110 V24" fill="none" stroke="#3d5200" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M20 70 H70 V40 H110 V24" fill="none" stroke={ACC} strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
          <rect x="105" y="14" width="10" height="9" fill={PAPER} />
          <rect x="107" y="10" width="2" height="4" fill="#8a9787" />
          <rect x="111" y="10" width="2" height="4" fill="#8a9787" />
          <rect x="132" y="50" width="7" height="10" fill={ACC} />
          <rect x="134" y="48" width="3" height="2" fill={ACC} />
          <rect x="40" y="22" width="7" height="10" fill={WARN} />
          <rect x="42" y="20" width="3" height="2" fill={WARN} />
        </>
      )}
      {slug === "trinca" && (
        <>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((c) =>
            [0, 1, 2, 3].map((r) => {
              const t = (c * 7 + r * 3 + (c * r) % 4) % 6;
              const x = 22 + c * 16;
              const y = 15 + r * 18;
              const fill = [ACC, WARN, DANGER, "#4fd8ff", "#b48cff", PAPER][r === 2 && c >= 2 && c <= 4 ? 0 : t];
              return r === 2 && c >= 2 && c <= 4 ? (
                <rect key={`${r}-${c}`} x={x - 6} y={y - 6} width="12" height="12" fill={fill} stroke={PAPER} strokeWidth="1.5" />
              ) : t === 2 ? (
                <circle key={`${r}-${c}`} cx={x} cy={y} r="5.5" fill={fill} />
              ) : t === 1 ? (
                <polygon key={`${r}-${c}`} points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`} fill={fill} />
              ) : (
                <rect key={`${r}-${c}`} x={x - 5} y={y - 5} width="10" height="10" fill={t === 0 ? ACC : fill} />
              );
            }),
          )}
        </>
      )}
    </svg>
  );
}
