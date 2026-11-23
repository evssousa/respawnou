// Modelos P1 (jogo grátis, cupom) e P2 (ofertas da semana na Steam).
import { COR, SOCIAL } from "../../config";
import { cortar, maiusculasBR } from "../../core/texto";
import type { EntradaSocial } from "../../tipos";
import { ajustarTitulo, ANTON, Chip, Faixa, MONO, Rodape, Tela, Topo } from "../ui";

export interface InsumosPromo {
  logo: string;
  grade: string;
  /** P1: arte do jogo 952×476; P2 não usa. */
  arte: string | null;
  /** P1: a mesma arte desfocada como fundo (1080×1350). */
  fundo: string | null;
  /** P2: imagens das ofertas (300×140), na ordem. */
  imagens: (string | null)[];
}

/** P1: GRÁTIS em letras enormes e um "cupom" com a arte, o preço e o prazo. */
export function ModeloGratis({ e, ins }: { e: EntradaSocial; ins: InsumosPromo }) {
  const g = e.gratis!;
  const aj = ajustarTitulo(cortar(g.nome, 70), 888, 2, [64, 56, 48]);
  const nome = aj.texto;
  const tam = aj.tam;
  return (
    <Tela grade={ins.grade} fundo={ins.fundo ?? undefined}>
      <Topo logo={ins.logo} direita="PROMOÇÃO //" />
      <div style={{ position: "absolute", left: 56, top: 150, display: "flex", fontFamily: ANTON, fontSize: 236, lineHeight: 1, color: COR.destaque, transform: "rotate(-4deg)", textShadow: `8px 8px 0 ${COR.destaqueFundo}` }}>GRÁTIS</div>
      <div style={{ position: "absolute", left: 64, top: 400, width: 952, height: 700, display: "flex", flexDirection: "column", backgroundColor: COR.painel, border: `2px solid ${COR.linhaSuave}` }}>
        {ins.arte ? <img src={ins.arte} width={948} height={476} /> : <div style={{ display: "flex", width: 948, height: 476, backgroundColor: COR.painel2 }} />}
        <div style={{ display: "flex", width: 948, borderTop: `2px dashed ${COR.linhaSuave}` }} />
        <div style={{ display: "flex", flexDirection: "column", padding: "18px 32px" }}>
          <div style={{ display: "flex", fontFamily: ANTON, fontSize: tam, lineHeight: 1.04 }}>{maiusculasBR(nome)}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
            {g.precoNormal && <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 30, color: COR.apagado, textDecoration: "line-through", marginRight: 24 }}>{`DE ${g.precoNormal}`}</div>}
            <div style={{ display: "flex", fontFamily: ANTON, fontSize: 64, color: COR.destaque }}>R$ 0</div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 96, top: 1124, display: "flex" }}>
        <Chip texto={maiusculasBR(g.loja)} tipo="contorno" />
        <Chip texto={`ATÉ ${maiusculasBR(g.ate)}`} tipo="alerta" estilo={{ marginLeft: 12 }} />
      </div>
      <Rodape frase="Avisamos todo jogo grátis" botao="COMO RESGATAR: LINK NA BIO" />
      <Faixa />
    </Tela>
  );
}

/** P2: até 4 ofertas da semana com preço, desconto e imagem. */
export function ModeloOfertas({ e, ins }: { e: EntradaSocial; ins: InsumosPromo }) {
  const o = e.ofertas!;
  const itens = o.itens.slice(0, 4);
  return (
    <Tela grade={ins.grade}>
      <Topo logo={ins.logo} direita="OFERTAS //" />
      <div style={{ position: "absolute", left: 64, top: 130, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontFamily: ANTON, fontSize: 96, lineHeight: 1.02 }}>PROMOÇÕES DA STEAM</div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", fontFamily: ANTON, fontSize: 96, lineHeight: 1.02, color: COR.destaque, marginRight: 28 }}>DA SEMANA</div>
          <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 24, color: COR.apagado }}>{`> PREÇOS EM REAIS, ${o.dia}`}</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 64, top: 380, width: 952, display: "flex", flexDirection: "column" }}>
        {itens.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", height: 180, marginBottom: 16, backgroundColor: COR.painel, border: `2px solid ${COR.linhaSuave}` }}>
            {ins.imagens[i] ? <img src={ins.imagens[i]!} width={300} height={140} style={{ marginLeft: 18 }} /> : <div style={{ display: "flex", width: 300, height: 140, marginLeft: 18, backgroundColor: COR.painel2 }} />}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 24 }}>
              <div style={{ display: "flex", fontFamily: ANTON, fontSize: 38, lineHeight: 1.05 }}>{maiusculasBR(cortar(it.nome, 26))}</div>
              <div style={{ display: "flex", alignItems: "baseline", marginTop: 10 }}>
                <div style={{ display: "flex", fontFamily: ANTON, fontSize: 48, color: COR.destaque }}>{it.preco}</div>
                {it.precoAntes && <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 22, color: COR.apagado, textDecoration: "line-through", marginLeft: 16 }}>{it.precoAntes}</div>}
              </div>
            </div>
            <div style={{ display: "flex", marginRight: 20 }}>
              <Chip texto={`−${it.desconto}%`} tipo="alerta" />
            </div>
          </div>
        ))}
      </div>
      {o.total > itens.length && <div style={{ position: "absolute", left: 64, top: 1126, display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 26, color: COR.destaque }}>{`+ ${o.total - itens.length} OFERTAS NA MATÉRIA`}</div>}
      <Rodape frase="Preço muda rápido: confira na loja" botao="LISTA COMPLETA: LINK NA BIO" />
      <Faixa />
    </Tela>
  );
}

void SOCIAL;
