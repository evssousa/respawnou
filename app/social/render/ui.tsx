// Peças comuns das artes (satori: todo div com mais de um filho precisa de display:flex; sem grid; sem z-index).
import type { CSSProperties, ReactNode } from "react";
import { COR, SOCIAL } from "../config";

export const MONO = "JetBrains Mono";

/** Ícones em SVG (a JetBrains Mono latina não tem ▶ nem →). */
export function Seta({ cor = COR.sobreDestaque, tam = 28 }: { cor?: string; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" style={{ marginLeft: 10 }}>
      <path d="M3 11h14l-5-5 1.6-1.6L21 12l-7.4 7.6L12 18l5-5H3z" fill={cor} />
    </svg>
  );
}
export function Play({ cor = COR.texto, tam = 22 }: { cor?: string; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" style={{ marginRight: 12 }}>
      <path d="M6 3l15 9-15 9z" fill={cor} />
    </svg>
  );
}
export const ANTON = "Anton";

/** Tela base 1080×1350 com a grade fina e o conteúdo posicionado de forma absoluta. */
export function Tela({ grade, children, fundo, escuro = 0.78 }: { grade: string; children: ReactNode; fundo?: string; escuro?: number }) {
  return (
    <div style={{ display: "flex", position: "relative", width: 1080, height: 1350, backgroundColor: COR.fundo, ...(fundo ? { backgroundImage: `url(${fundo})` } : {}), fontFamily: "Inter", color: COR.texto }}>
      {fundo && <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1350, backgroundColor: COR.fundo, opacity: escuro }} />}
      <img src={grade} width={1080} height={1350} style={{ position: "absolute", left: 0, top: 0 }} />
      {children}
    </div>
  );
}

/** Logo + marca no topo; à direita um rótulo ou contador. */
export function Topo({ logo, direita, tam = 64, y = 48 }: { logo: string; direita?: string; tam?: number; y?: number }) {
  return (
    <div style={{ position: "absolute", left: 64, top: y, width: 952, height: tam, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <img src={logo} width={tam} height={tam} style={{ marginRight: 16 }} />
        <div style={{ display: "flex", fontFamily: ANTON, fontSize: tam === 64 ? 40 : 32, letterSpacing: 1 }}>
          <span>{SOCIAL.marca}</span>
          <span style={{ color: COR.destaque }}>.</span>
        </div>
      </div>
      {direita && <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 22, color: COR.destaque }}>{direita}</div>}
    </div>
  );
}

/** Barra verde de 8 px no pé. */
export function Faixa() {
  return <div style={{ position: "absolute", left: 0, top: 1342, width: 1080, height: 8, backgroundColor: COR.destaque }} />;
}

export function Chip({ texto, tipo = "cheio", estilo, icone }: { texto: string; tipo?: "cheio" | "contorno" | "alerta"; estilo?: CSSProperties; icone?: ReactNode }) {
  const cor = tipo === "cheio" ? { backgroundColor: COR.destaque, color: COR.sobreDestaque } : tipo === "alerta" ? { backgroundColor: COR.alerta, color: COR.sobreDestaque } : { border: `2px solid ${COR.texto}`, color: COR.texto };
  return (
    <div style={{ display: "flex", alignItems: "center", height: 48, padding: "0 20px", fontFamily: MONO, fontWeight: 700, fontSize: 24, ...cor, ...estilo }}>
      {icone}
      {texto}
    </div>
  );
}

/** Rodapé com o convite: "> SIGA @..." + frase e o botão do endereço do site. */
export function Rodape({ frase, botao = SOCIAL.dominio }: { frase: string; botao?: string }) {
  return (
    <div style={{ position: "absolute", left: 0, top: 1176, width: 1080, height: 166, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", width: 1080, height: 2, backgroundColor: COR.linhaSuave }} />
      <div style={{ display: "flex", flex: 1, padding: "0 64px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 28, color: COR.destaque }}>{`> SIGA @${SOCIAL.handle}`}</div>
          <div style={{ display: "flex", fontWeight: 600, fontSize: 26, color: COR.corpo, marginTop: 6 }}>{frase}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", height: 64, padding: "0 24px", backgroundColor: COR.destaque, color: COR.sobreDestaque, fontFamily: MONO, fontWeight: 700, fontSize: 28 }}>
          {botao}
          <Seta />
        </div>
      </div>
    </div>
  );
}

/** Largura estimada de uma palavra em Anton maiúsculo (conservadora: melhor sobrar espaço do que invadir o rodapé). */
const larguraPalavra = (w: string, tam: number) => w.length * tam * 0.5;

/** Quantas linhas o título ocupa nesse tamanho (quebra de palavras simulada, com o espaço entre palavras). */
export function linhasDoTitulo(texto: string, tam: number, largura = 952): number {
  const gap = tam * 0.3;
  let linhas = 1;
  let x = 0;
  for (const w of texto.split(" ")) {
    const lw = larguraPalavra(w, tam);
    if (x > 0 && x + lw > largura) {
      linhas++;
      x = 0;
    }
    x += lw + gap;
  }
  return linhas;
}

/**
 * Escolhe o maior tamanho (de `opcoes`) em que o título cabe em `maxLinhas`. Se nem o menor serve, corta o título por palavras
 * (com reticências) até caber. Devolve o texto final, o tamanho e quantas linhas ocupa.
 */
export function ajustarTitulo(texto: string, largura = 952, maxLinhas = 3, opcoes = [96, 84, 72, 64]): { texto: string; tam: number; linhas: number } {
  for (const t of opcoes) {
    const l = linhasDoTitulo(texto, t, largura);
    if (l <= maxLinhas) return { texto, tam: t, linhas: l };
  }
  const tam = opcoes[opcoes.length - 1];
  const palavras = texto.split(" ");
  while (palavras.length > 1) {
    palavras.pop();
    const t = `${palavras.join(" ").replace(/[,;:.\s]+$/, "")}…`;
    if (linhasDoTitulo(t, tam, largura) <= maxLinhas) return { texto: t, tam, linhas: linhasDoTitulo(t, tam, largura) };
  }
  return { texto, tam, linhas: maxLinhas };
}

/** Compatível com o uso antigo: só o tamanho. */
export function tamanhoTitulo(texto: string, largura = 952, linhas = 3, opcoes = [96, 84, 72, 64]): number {
  return ajustarTitulo(texto, largura, linhas, opcoes).tam;
}
