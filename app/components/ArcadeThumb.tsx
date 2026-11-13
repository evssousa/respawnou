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
      {slug === "mira" && (
        <>
          {(
            [
              [56, 46, 20, ACC],
              [118, 30, 11, WARN],
            ] as const
          ).map(([x, y, r, c]) => (
            <g key={x}>
              <circle cx={x} cy={y} r={r} fill={c} />
              <circle cx={x} cy={y} r={r * 0.72} fill={INK} />
              <circle cx={x} cy={y} r={r * 0.5} fill={c} />
              <circle cx={x} cy={y} r={r * 0.3} fill={PAPER} />
            </g>
          ))}
          <circle cx="120" cy="70" r="9" fill={DANGER} />
          <path d="M116 66l8 8M124 66l-8 8" stroke={INK} strokeWidth="2" />
          <path d="M56 20v10M56 62v10M30 46h10M72 46h10" stroke={PAPER} strokeWidth="1.5" opacity="0.6" />
        </>
      )}
      {slug === "memoria" && (
        <>
          {[0, 1, 2, 3, 4].map((c) =>
            [0, 1].map((r) => {
              const x = 18 + c * 26;
              const y = 14 + r * 34;
              const face = (c === 1 && r === 0) || (c === 3 && r === 1);
              return face ? (
                <g key={`${c}-${r}`}>
                  <rect x={x} y={y} width="22" height="28" fill={INK3} stroke={ACC} strokeWidth="1.5" />
                  <path d={`M${x + 5} ${y + 10}h4v2h4v-2h4v5h-2v2h-2v2h-4v-2h-2v-2h-2z`} fill={DANGER} />
                </g>
              ) : (
                <g key={`${c}-${r}`}>
                  <rect x={x} y={y} width="22" height="28" fill="#3d5200" />
                  <rect x={x + 9} y={y + 12} width="4" height="4" fill={ACC} />
                </g>
              );
            }),
          )}
        </>
      )}
      {slug === "campo-minado" && (
        <>
          {[0, 1, 2, 3, 4, 5, 6].map((c) =>
            [0, 1, 2, 3].map((r) => {
              const x = 24 + c * 16;
              const y = 12 + r * 16;
              const open = c + r < 5 && !(c === 3 && r === 1);
              const n = open ? [0, 1, 2, 0, 1, 3, 0][(c * 3 + r) % 7] : 0;
              return (
                <g key={`${c}-${r}`}>
                  <rect x={x} y={y} width="15" height="15" fill={open ? "#0c110c" : INK3} stroke={open ? "#1c241a" : "#243022"} />
                  {n > 0 && (
                    <text x={x + 7.5} y={y + 11.5} fontSize="10" fontWeight="700" textAnchor="middle" fill={["", "#4fd8ff", ACC, WARN][n]} fontFamily="monospace">
                      {n}
                    </text>
                  )}
                </g>
              );
            }),
          )}
          <rect x="105" y="48" width="1.5" height="11" fill={PAPER} />
          <path d="M106.5 48l6 3-6 3z" fill={WARN} />
          <circle cx="127" cy="71" r="4.5" fill={DANGER} />
        </>
      )}
      {slug === "paciencia" && (
        <>
          <rect width="160" height="90" fill="#0a1a10" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={70 + i * 22} y="8" width="18" height="25" fill="none" stroke="#243022" strokeWidth="1.5" />
          ))}
          <rect x="70" y="8" width="18" height="25" fill={PAPER} />
          <text x="79" y="25" fontSize="11" textAnchor="middle" fill={INK}>
            ♠
          </text>
          <rect x="8" y="8" width="18" height="25" fill="#3d5200" stroke={ACC} strokeWidth="1" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <g key={i}>
              {Array.from({ length: Math.min(i, 3) }, (_, k) => (
                <rect key={k} x={8 + i * 21} y={40 + k * 4} width="18" height="25" fill="#3d5200" stroke={INK} strokeWidth="0.5" />
              ))}
              <rect x={8 + i * 21} y={40 + Math.min(i, 3) * 4} width="18" height="25" fill={PAPER} stroke={INK} strokeWidth="0.5" />
              <text x={17 + i * 21} y={57 + Math.min(i, 3) * 4} fontSize="11" textAnchor="middle" fill={i % 2 ? "#e0453a" : INK}>
                {["♠", "♥", "♣", "♦", "♠", "♥", "♣"][i]}
              </text>
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
