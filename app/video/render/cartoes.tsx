// Cartões de dados do vídeo (satori → PNG pequeno, com 40 px de folga para a sombra): painel escuro com barra verde à esquerda,
// rótulo técnico em mono, valor grande em Anton. Cada componente recebe só o que existe; sem o valor principal devolve null
// (o cartão simplesmente não entra). Cores e fontes vêm da marca. Sobrepostos em x 24, y 560 (largura útil 852).
import type { ReactNode } from "react";
import { COR, FONTES } from "~/social/config";
import { corNota, dec } from "~/social/core/nota";
import { cortar } from "~/social/core/texto";
import { ajustarTitulo, ANTON, MONO, caixa } from "~/social/render/ui";
import { dataCurta, type FatosVideo, type TipoCartao } from "../cartoes";

export const LARGURA_CARTAO = 932; // 852 + 2 × 40 de folga
/** Altura útil de cada tipo (o PNG tem esta altura + 80). */
export const ALTURA_CARTAO: Record<TipoCartao, number> = { preco: 300, lancamento: 300, nota: 340, requisitos: 400, gratis: 400, plataformas: 220, ranking: 220, dia: 360 };

const INTER = FONTES.corpo;
const TRACO = { fill: "none", stroke: COR.destaque, strokeWidth: 3, strokeLinecap: "square" as const };

const Icone = ({ children }: { children: ReactNode }) => (
  <svg width={34} height={34} viewBox="0 0 34 34">
    {children}
  </svg>
);
const icones: Partial<Record<TipoCartao, ReactNode>> = {
  preco: (
    <Icone>
      <path d="M3 4h14l14 14-13 13L4 18z" {...TRACO} />
      <circle cx="11" cy="11" r="2.5" {...TRACO} />
    </Icone>
  ),
  lancamento: (
    <Icone>
      <rect x="3" y="6" width="28" height="25" {...TRACO} />
      <path d="M3 14h28M10 2v7M24 2v7" {...TRACO} />
    </Icone>
  ),
  nota: (
    <Icone>
      <path d="M3 28a14 14 0 0 1 28 0" {...TRACO} />
      <path d="M17 28l8-11" {...TRACO} />
    </Icone>
  ),
  requisitos: (
    <Icone>
      <rect x="9" y="9" width="16" height="16" {...TRACO} />
      <path d="M13 3v6M21 3v6M13 25v6M21 25v6M3 13h6M3 21h6M25 13h6M25 21h6" {...TRACO} />
    </Icone>
  ),
  plataformas: (
    <Icone>
      <rect x="2" y="9" width="30" height="16" {...TRACO} />
      <path d="M10 13v8M6 17h8" {...TRACO} />
      <circle cx="23" cy="15" r="1.6" {...TRACO} />
      <circle cx="27" cy="19" r="1.6" {...TRACO} />
    </Icone>
  ),
};

function Base({ altura, rotulo, tipo, children }: { altura: number; rotulo?: string; tipo?: TipoCartao; children: ReactNode }) {
  return (
    <div style={{ display: "flex", width: LARGURA_CARTAO, height: altura + 80, padding: 40 }}>
      <div style={{ display: "flex", width: 852, height: altura, backgroundColor: "rgba(6,8,7,0.88)", borderTop: `2px solid ${COR.linhaSuave}`, borderRight: `2px solid ${COR.linhaSuave}`, borderBottom: `2px solid ${COR.linhaSuave}`, boxShadow: "0 20px 48px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", width: 10, height: altura, backgroundColor: COR.destaque }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "30px 40px 34px 36px" }}>
          {rotulo && (
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              {tipo && icones[tipo]}
              <div style={{ display: "flex", marginLeft: tipo && icones[tipo] ? 12 : 0, fontFamily: MONO, fontWeight: 700, fontSize: 26, color: COR.destaque, letterSpacing: 2 }}>{rotulo}</div>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

const Detalhe = ({ texto }: { texto: string }) => <div style={{ display: "flex", fontFamily: INTER, fontWeight: 600, fontSize: 30, color: COR.corpo, lineHeight: 1.25 }}>{texto}</div>;

export function CartaoPreco({ f }: { f: FatosVideo }) {
  if (!f.preco) return null;
  const temDigito = /\d/.test(f.preco);
  const tam = !temDigito ? 96 : f.preco.length > 10 ? 112 : 136;
  return (
    <Base altura={ALTURA_CARTAO.preco} rotulo="PREÇO" tipo="preco">
      <div style={{ display: "flex", fontFamily: ANTON, fontSize: tam, lineHeight: 1.05, color: COR.texto }}>{caixa(f.preco)}</div>
      {f.jogo && <Detalhe texto={cortar(f.jogo, 40)} />}
    </Base>
  );
}

export function CartaoLancamento({ f }: { f: FatosVideo }) {
  if (!f.lancamento?.data) return null;
  const l = f.lancamento;
  return (
    <Base altura={ALTURA_CARTAO.lancamento} rotulo="LANÇAMENTO" tipo="lancamento">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontFamily: ANTON, fontSize: dataCurta(l.data, l.ano).length > 6 ? 104 : 136, lineHeight: 1.05, color: COR.texto, whiteSpace: "nowrap" }}>{dataCurta(l.data, l.ano)}</div>
        {l.diaSemana && <div style={{ display: "flex", alignItems: "center", height: 48, padding: "0 16px", backgroundColor: COR.destaque, color: COR.sobreDestaque, fontFamily: MONO, fontWeight: 700, fontSize: 24 }}>{caixa(l.diaSemana)}</div>}
      </div>
      {f.jogo && <Detalhe texto={cortar(f.jogo, 40)} />}
    </Base>
  );
}

export function CartaoNota({ f }: { f: FatosVideo }) {
  if (!f.nota || !(f.nota.valor > 0)) return null;
  const n = f.nota;
  const cor = corNota(n.valor);
  return (
    <Base altura={ALTURA_CARTAO.nota} rotulo="NOTA MÉDIA DA CRÍTICA" tipo="nota">
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 200, height: 200, backgroundColor: cor, color: COR.sobreDestaque, fontFamily: ANTON, fontSize: 120 }}>{dec(n.valor)}</div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 32, width: 500 }}>
          <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 26, color: COR.texto }}>{`${n.veiculos} ${n.veiculos === 1 ? "VEÍCULO" : "VEÍCULOS"}`}</div>
          {n.veredito && <div style={{ display: "flex", marginTop: 8, fontFamily: INTER, fontWeight: 600, fontSize: 30, lineHeight: 1.25, color: COR.corpo }}>{cortar(n.veredito, 70)}</div>}
        </div>
      </div>
      <div style={{ display: "flex", width: 772, height: 12, marginTop: 20, backgroundColor: COR.linha }}>
        <div style={{ display: "flex", width: Math.round(772 * Math.min(1, n.valor / 10)), height: 12, backgroundColor: cor }} />
      </div>
    </Base>
  );
}

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ORDEM_REQ: { chave: RegExp; rotulo: string }[] = [
  { chave: /placa|video|gpu/, rotulo: "PLACA DE VÍDEO" },
  { chave: /processador|cpu/, rotulo: "PROCESSADOR" },
  { chave: /memoria|ram/, rotulo: "MEMÓRIA" },
];

export function CartaoRequisitos({ f }: { f: FatosVideo }) {
  const linhas = ORDEM_REQ.map((o) => ({ rotulo: o.rotulo, valor: (f.requisitos ?? []).find((r) => o.chave.test(sem(r.rotulo)))?.minimo })).filter((l) => l.valor);
  if (linhas.length < 2) return null;
  return (
    <Base altura={ALTURA_CARTAO.requisitos} rotulo="REQUISITOS MÍNIMOS · PC" tipo="requisitos">
      {linhas.map((l, i) => (
        <div key={l.rotulo} style={{ display: "flex", alignItems: "center", height: 96, borderTop: i ? `1px solid ${COR.linha}` : "0" }}>
          <div style={{ display: "flex", width: 240, fontFamily: MONO, fontWeight: 700, fontSize: 22, color: COR.apagado }}>{l.rotulo}</div>
          <div style={{ display: "flex", width: 520, fontFamily: INTER, fontWeight: 600, fontSize: 28, lineHeight: 1.2, color: COR.texto }}>{cortar(l.valor!, 44)}</div>
        </div>
      ))}
    </Base>
  );
}

export function CartaoGratis({ f, item = 0 }: { f: FatosVideo; item?: number }) {
  const g = f.gratis?.[item] ?? f.gratis?.[0];
  if (!g?.nome) return null;
  const t = ajustarTitulo(cortar(g.nome, 60), 772, 2, [84, 72, 60]);
  return (
    <Base altura={ALTURA_CARTAO.gratis}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "6px 18px", backgroundColor: COR.destaque, color: COR.sobreDestaque, fontFamily: ANTON, fontSize: 56 }}>GRÁTIS</div>
        <div style={{ display: "flex", marginLeft: 20, fontFamily: MONO, fontWeight: 700, fontSize: 26, color: COR.destaque }}>{caixa(cortar(g.loja, 24))}</div>
      </div>
      <div style={{ display: "flex", width: 772, marginTop: 16, fontFamily: ANTON, fontSize: t.tam, lineHeight: 1.05, color: COR.texto }}>{caixa(t.texto)}</div>
      <div style={{ display: "flex", marginTop: 22, fontFamily: MONO, fontWeight: 700, fontSize: 26, color: COR.texto }}>{caixa(`ATÉ ${g.ate}`)}</div>
      {g.precoNormal && <div style={{ display: "flex", marginTop: 8, fontFamily: INTER, fontWeight: 600, fontSize: 30, color: COR.apagado, textDecoration: "line-through" }}>{`DE ${g.precoNormal}`}</div>}
    </Base>
  );
}

export function CartaoPlataformas({ f }: { f: FatosVideo }) {
  const lista = (f.plataformas ?? []).slice(0, 5);
  if (!lista.length) return null;
  return (
    <Base altura={ALTURA_CARTAO.plataformas} rotulo="ONDE JOGAR" tipo="plataformas">
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {lista.map((p) => (
          <div key={p} style={{ display: "flex", alignItems: "center", height: 72, padding: "0 24px", marginRight: 14, border: `3px solid ${COR.destaque}`, fontFamily: ANTON, fontSize: 48, color: COR.texto }}>{caixa(p)}</div>
        ))}
      </div>
    </Base>
  );
}
