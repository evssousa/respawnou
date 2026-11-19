// Ícones do painel em SVG próprio (o módulo não depende de biblioteca de ícones).
import type { ReactNode, SVGProps } from "react";

const base = (filhos: ReactNode) =>
  function Icone(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
        {filhos}
      </svg>
    );
  };

export const BarChart3 = base(<path d="M3 3v18h18M8 17v-6M13 17V7M18 17v-3" />);
export const ChevronDown = base(<path d="m6 9 6 6 6-6" />);
export const ExternalLink = base(<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />);
export const Monitor = base(<path d="M3 4h18v12H3zM8 20h8M12 16v4" />);
export const Smartphone = base(<path d="M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM12 18h.01" />);
export const Tablet = base(<path d="M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM12 18h.01" />);
