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
    </svg>
  );
}
