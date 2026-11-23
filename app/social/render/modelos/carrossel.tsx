// Modelo C: carrossel (artigos, reviews e guias), 5 a 7 slides: capa, pontos/notas/requisitos e CTA final.
import type { ReactElement } from "react";
import { COR, SOCIAL } from "../../config";
import { cortar, frasesInteiras, maiusculasBR } from "../../core/texto";
import { ordenarNotas } from "../../core/pontos";
import type { EntradaSocial, Ponto } from "../../tipos";
import { ajustarTitulo, ANTON, Chip, Faixa, linhasDoTitulo, MONO, Seta, Tela, Topo } from "../ui";

export interface InsumosCarrossel {
  logo: string;
  logoGrande: string;
  grade: string;
  /** Capa 952×536. */
  capa: string | null;
  /** Capa desfocada em 1080×1350 (fundo dos slides de dados de review e guia). */
  fundo?: string | null;
  /** Imagens dos pontos (952×600), na ordem dos pontos. */
  imagens: (string | null)[];
}

const dec = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const corNota = (n: number) => (n >= 7.5 ? COR.destaque : n >= 5.5 ? COR.alerta : "#ff5a3c");
const nn = (i: number, t: number) => `${String(i).padStart(2, "0")}/${String(t).padStart(2, "0")}`;

function Titulo({ texto, tam, cor = COR.texto, largura = 952 }: { texto: string; tam: number; cor?: string; largura?: number }) {
  return <div style={{ display: "flex", fontFamily: ANTON, fontSize: tam, lineHeight: 1.04, color: cor, width: largura }}>{maiusculasBR(texto)}</div>;
}

function Rod({ dir = "ARRASTA" }: { dir?: string }) {
  return (
    <div style={{ position: "absolute", left: 64, top: 1262, width: 952, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontWeight: 700, fontSize: 22 }}>
      <div style={{ display: "flex", color: COR.apagado }}>{SOCIAL.dominio}</div>
      <div style={{ display: "flex", alignItems: "center", color: COR.destaque }}>
        {dir}
        <Seta cor={COR.destaque} tam={24} />
      </div>
    </div>
  );
}

function Capa({ e, ins, total, rotulo, chipFinal }: { e: EntradaSocial; ins: InsumosCarrossel; total: number; rotulo: string; chipFinal: string }) {
  // Descrição de 1 a 2 linhas embaixo do título (frase inteira); o título diminui o necessário para ela caber antes do rodapé (y 1196).
  const desc = frasesInteiras(e.excerpt || e.metaDescription || "", 104);
  const linhasDesc = Math.max(1, Math.ceil(desc.length / 49));
  const tituloBase = cortar(e.titulo, 110);
  let aj = ajustarTitulo(tituloBase, 952, 3, [88, 76, 68, 60]);
  for (const tam of [88, 76, 68, 60]) {
    const l = linhasDoTitulo(tituloBase, tam);
    if (l <= 3 && Math.ceil(l * tam * 1.04) + 20 + linhasDesc * 46 <= 1196 - 812 - 24) {
      aj = { texto: tituloBase, tam, linhas: l };
      break;
    }
  }
  const titulo = aj.texto;
  const tam = aj.tam;
  return (
    <Tela grade={ins.grade}>
      <Topo logo={ins.logo} direita={nn(1, total)} />
      <div style={{ position: "absolute", left: 78, top: 164, width: 952, height: 536, backgroundColor: COR.destaque }} />
      {ins.capa ? <img src={ins.capa} width={952} height={536} style={{ position: "absolute", left: 64, top: 150 }} /> : <div style={{ position: "absolute", left: 64, top: 150, width: 952, height: 536, backgroundColor: COR.painel }} />}
      {e.review && (
        <div style={{ position: "absolute", left: 760, top: 520, width: 240, height: 240, backgroundColor: corNota(e.review.score), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: COR.sobreDestaque }}>
          <div style={{ display: "flex", fontFamily: ANTON, fontSize: 140, lineHeight: 1 }}>{dec(e.review.score)}</div>
          <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 18 }}>{`MÉDIA DE ${e.review.critics.length} VEÍCULOS`}</div>
        </div>
      )}
      <div style={{ position: "absolute", left: 64, top: 740, display: "flex" }}>
        <Chip texto={rotulo} />
      </div>
      <div style={{ position: "absolute", left: 64, top: 812, display: "flex", flexDirection: "column", width: 952 }}>
        <Titulo texto={titulo} tam={tam} />
        {desc && <div style={{ display: "flex", marginTop: 20, fontSize: 34, lineHeight: 1.35, color: COR.corpo, width: 952 }}>{desc}</div>}
      </div>
      <div style={{ position: "absolute", left: 64, top: 1196, width: 952, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Chip texto={chipFinal} tipo="contorno" />
        <div style={{ display: "flex", alignItems: "center", fontFamily: MONO, fontWeight: 700, fontSize: 26, color: COR.destaque }}>
          ARRASTA PRO LADO
          <Seta cor={COR.destaque} tam={28} />
        </div>
      </div>
      <Faixa />
    </Tela>
  );
}

function PontoSlide({ p, i, total, ins, imagem, rotulo }: { p: Ponto; i: number; total: number; ins: InsumosCarrossel; imagem: string | null; rotulo: string }) {
  const titulo = cortar(p.titulo, 70);
  return (
    <Tela grade={ins.grade}>
      <Topo logo={ins.logo} tam={48} y={40} direita={`${rotulo} · ${nn(i + 1, total)}`} />
      {/* Imagem grande no topo (a do trecho ou um recorte da matéria) com o número do ponto em destaque sobre ela. */}
      {imagem ? <img src={imagem} width={952} height={600} style={{ position: "absolute", left: 64, top: 128 }} /> : <div style={{ position: "absolute", left: 64, top: 128, width: 952, height: 600, backgroundColor: COR.painel }} />}
      <div style={{ position: "absolute", left: 64, top: 128, width: 952, height: 600, backgroundImage: "linear-gradient(to bottom, rgba(6,8,7,0) 55%, rgba(6,8,7,0.75))" }} />
      <div style={{ position: "absolute", left: 64, top: 628, display: "flex", alignItems: "center", justifyContent: "center", width: 150, height: 100, backgroundColor: COR.destaque, color: COR.sobreDestaque, fontFamily: ANTON, fontSize: 84 }}>{String(i).padStart(2, "0")}</div>
      <div style={{ position: "absolute", left: 64, top: 760, display: "flex", flexDirection: "column", width: 952 }}>
        <Titulo texto={titulo} tam={titulo.length > 38 ? 60 : 72} />
        <div style={{ display: "flex", marginTop: 22, fontSize: 38, lineHeight: 1.36, color: COR.corpo, width: 952 }}>{p.texto}</div>
      </div>
      <Rod />
    </Tela>
  );
}

function NotasSlide({ e, total, ins }: { e: EntradaSocial; total: number; ins: InsumosCarrossel }) {
  const notas = ordenarNotas(e.review!.critics);
  const mostra = notas.slice(0, 6);
  return (
    <Tela grade={ins.grade} fundo={ins.fundo ?? undefined} escuro={0.58}>
      <Topo logo={ins.logo} tam={48} y={40} direita={`REVIEW · ${nn(2, total)}`} />
      <div style={{ position: "absolute", left: 64, top: 150, display: "flex" }}>
        <Titulo texto="O que cada veículo deu" tam={72} />
      </div>
      <div style={{ position: "absolute", left: 64, top: 360, width: 952, display: "flex", flexDirection: "column" }}>
        {mostra.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", height: 120, borderBottom: `2px solid ${COR.linhaSuave}` }}>
            <div style={{ display: "flex", width: 340, fontWeight: 600, fontSize: 34 }}>{cortar(c.outlet, 18)}</div>
            <div style={{ display: "flex", width: 440, height: 20, backgroundColor: COR.painel2 }}>
              <div style={{ display: "flex", width: Math.round((c.score / 10) * 440), height: 20, backgroundColor: corNota(c.score) }} />
            </div>
            <div style={{ display: "flex", flex: 1, justifyContent: "flex-end", fontFamily: MONO, fontWeight: 700, fontSize: 40 }}>{dec(c.score)}</div>
          </div>
        ))}
        {notas.length > 6 && <div style={{ display: "flex", marginTop: 20, fontFamily: MONO, fontWeight: 700, fontSize: 26, color: COR.apagado }}>{`+ ${notas.length - 6} VEÍCULOS NA MATÉRIA`}</div>}
      </div>
      <Rod />
    </Tela>
  );
}

function ListaSlide({ titulo, itens, sinal, i, total, ins, rotulo }: { titulo: string; itens: string[]; sinal: "+" | "−"; i: number; total: number; ins: InsumosCarrossel; rotulo: string }) {
  return (
    <Tela grade={ins.grade} fundo={ins.fundo ?? undefined} escuro={0.58}>
      <Topo logo={ins.logo} tam={48} y={40} direita={`${rotulo} · ${nn(i, total)}`} />
      <div style={{ position: "absolute", left: 64, top: 150, display: "flex" }}>
        <Titulo texto={titulo} tam={72} />
      </div>
      <div style={{ position: "absolute", left: 64, top: 330, width: 952, display: "flex", flexDirection: "column" }}>
        {itens.slice(0, 4).map((t, k) => (
          <div key={k} style={{ display: "flex", alignItems: "flex-start", marginBottom: 44 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, marginRight: 28, flexShrink: 0, backgroundColor: sinal === "+" ? COR.destaque : COR.alerta, color: COR.sobreDestaque, fontFamily: ANTON, fontSize: 48 }}>{sinal}</div>
            <div style={{ display: "flex", flex: 1, fontWeight: 600, fontSize: 36, lineHeight: 1.33 }}>{cortar(t, 120)}</div>
          </div>
        ))}
      </div>
      <Rod />
    </Tela>
  );
}

function VereditoSlide({ e, total, ins }: { e: EntradaSocial; total: number; ins: InsumosCarrossel }) {
  return (
    <Tela grade={ins.grade} fundo={ins.fundo ?? undefined} escuro={0.58}>
      <Topo logo={ins.logo} tam={48} y={40} direita={`REVIEW · ${nn(total - 1, total)}`} />
      <div style={{ position: "absolute", left: 64, top: 110, display: "flex", fontFamily: ANTON, fontSize: 300, lineHeight: 1, color: COR.destaque }}>“</div>
      <div style={{ position: "absolute", left: 64, top: 430, width: 952, display: "flex", fontWeight: 800, fontSize: 52, lineHeight: 1.28 }}>{cortar(e.review!.verdict, 230)}</div>
      <div style={{ position: "absolute", left: 64, top: 1100, display: "flex" }}>
        <Chip texto={`NOTA MÉDIA ${dec(e.review!.score)} · ${e.review!.critics.length} VEÍCULOS`} />
      </div>
      <Rod />
    </Tela>
  );
}

function RequisitosSlide({ e, ins, ladoALado, total, i, minimo }: { e: EntradaSocial; ins: InsumosCarrossel; ladoALado?: boolean; total: number; i: number; minimo?: boolean }) {
  const linhas = e.requisitos ?? [];
  if (ladoALado) {
    const pega = linhas.filter((l) => l.rotulo === "PLACA DE VÍDEO" || l.rotulo === "MEMÓRIA");
    return (
      <Tela grade={ins.grade} fundo={ins.fundo ?? undefined} escuro={0.58}>
        <Topo logo={ins.logo} tam={48} y={40} direita={`GUIA · ${nn(i, total)}`} />
        <div style={{ position: "absolute", left: 64, top: 150, display: "flex" }}>
          <Titulo texto="Mínimo x recomendado" tam={72} />
        </div>
        <div style={{ position: "absolute", left: 64, top: 340, width: 952, display: "flex", justifyContent: "space-between" }}>
          {(["minimo", "recomendado"] as const).map((k) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", width: 468, padding: 28, backgroundColor: COR.painel, border: `2px solid ${k === "recomendado" ? COR.destaque : COR.linhaSuave}` }}>
              <div style={{ display: "flex", fontFamily: ANTON, fontSize: 44, color: k === "recomendado" ? COR.destaque : COR.texto, marginBottom: 20 }}>{k === "minimo" ? "MÍNIMO" : "RECOMENDADO"}</div>
              {pega.map((l) => (
                <div key={l.rotulo} style={{ display: "flex", flexDirection: "column", marginBottom: 26 }}>
                  <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 22, color: COR.apagado }}>{l.rotulo}</div>
                  <div style={{ display: "flex", fontWeight: 600, fontSize: 34, lineHeight: 1.25 }}>{cortar(l[k], 40)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        {(e.lancamento || e.precoBrl) && (
          <div style={{ position: "absolute", left: 64, top: 1100, display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 26 }}>
            {[e.lancamento ? `LANÇAMENTO ${e.lancamento}` : "", e.precoBrl ? `${e.precoBrl} NA STEAM` : ""].filter(Boolean).join(" · ")}
          </div>
        )}
        <Rod />
      </Tela>
    );
  }
  return (
    <Tela grade={ins.grade} fundo={ins.fundo ?? undefined} escuro={0.58}>
      <Topo logo={ins.logo} tam={48} y={40} direita={`GUIA · ${nn(i, total)}`} />
      <div style={{ position: "absolute", left: 64, top: 150, display: "flex", alignItems: "center" }}>
        <Titulo texto={minimo ? "Mínimo" : "Recomendado"} tam={96} largura={560} />
        {!minimo && <Chip texto="PRA JOGAR BEM" estilo={{ marginLeft: 20 }} />}
      </div>
      <div style={{ position: "absolute", left: 64, top: 330, width: 952, display: "flex", flexDirection: "column" }}>
        {linhas.slice(0, 5).map((l) => (
          <div key={l.rotulo} style={{ display: "flex", flexDirection: "column", padding: "18px 0", borderBottom: `2px solid ${COR.linhaSuave}` }}>
            <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 24, color: COR.apagado }}>{l.rotulo}</div>
            <div style={{ display: "flex", fontWeight: 600, fontSize: 38, lineHeight: 1.25, marginTop: 4 }}>{cortar(minimo ? l.minimo : l.recomendado, 70)}</div>
          </div>
        ))}
      </div>
      <Rod />
    </Tela>
  );
}

function CtaFinal({ ins, total }: { ins: InsumosCarrossel; total: number }) {
  return (
    <Tela grade={ins.grade}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1350, backgroundImage: "radial-gradient(circle at 540px 560px, rgba(200,255,46,0.18), rgba(200,255,46,0) 520px)" }} />
      <Topo logo={ins.logo} tam={48} y={40} direita={nn(total, total)} />
      <div style={{ position: "absolute", left: 0, top: 220, width: 1080, display: "flex", justifyContent: "center" }}>
        <img src={ins.logoGrande} width={200} height={200} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 480, width: 1080, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", fontFamily: ANTON, fontSize: 120 }}>CURTIU?</div>
        <div style={{ display: "flex", fontFamily: ANTON, fontSize: 96, color: COR.destaque, marginTop: 10 }}>{`SIGA @${maiusculasBR(SOCIAL.handle)}`}</div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 36, color: COR.corpo }}>{SOCIAL.frases.ctaFinal}</div>
      </div>
      <div style={{ position: "absolute", left: 160, top: 920, width: 760, height: 88, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: COR.destaque, color: COR.sobreDestaque, fontFamily: MONO, fontWeight: 700, fontSize: 32 }}>
        {SOCIAL.frases.botaoFinal}
        <Seta tam={32} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 1120, width: 1080, display: "flex", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 24, color: COR.apagado }}>{`SALVE PRA CONSULTAR DEPOIS · ${SOCIAL.dominio}`}</div>
      <Faixa />
    </Tela>
  );
}

/** Monta os slides do carrossel (elementos React) de acordo com o modelo. */
export function slidesCarrossel(modelo: "C-artigo" | "C-review" | "C-guia", e: EntradaSocial, ins: InsumosCarrossel, pontos: Ponto[]): ReactElement[] {
  const out: ReactElement[] = [];
  if (modelo === "C-review" && e.review) {
    const temProsCons = e.review.pros.length > 0 || e.review.cons.length > 0;
    const total = 1 + 1 + (e.review.pros.length ? 1 : 0) + (e.review.cons.length ? 1 : 0) + 1 + 1;
    let n = 2;
    out.push(<Capa key="c" e={e} ins={ins} total={total} rotulo="REVIEW // CONSENSO DA CRÍTICA" chipFinal="O QUE A CRÍTICA ACHOU" />);
    out.push(<NotasSlide key="n" e={e} total={total} ins={ins} />);
    n++;
    if (e.review.pros.length) out.push(<ListaSlide key="p" titulo="O que elogiaram" itens={e.review.pros} sinal="+" i={n++} total={total} ins={ins} rotulo="REVIEW" />);
    if (e.review.cons.length) out.push(<ListaSlide key="k" titulo="O que criticaram" itens={e.review.cons} sinal="−" i={n++} total={total} ins={ins} rotulo="REVIEW" />);
    void temProsCons;
    out.push(<VereditoSlide key="v" e={e} total={total} ins={ins} />);
    out.push(<CtaFinal key="f" ins={ins} total={total} />);
    return out;
  }
  if (modelo === "C-guia" && e.requisitos) {
    const total = 5;
    out.push(<Capa key="c" e={e} ins={ins} total={total} rotulo="GUIA // REQUISITOS" chipFinal="MÍNIMO E RECOMENDADO" />);
    out.push(<RequisitosSlide key="m" e={e} ins={ins} total={total} i={2} minimo />);
    out.push(<RequisitosSlide key="r" e={e} ins={ins} total={total} i={3} />);
    out.push(<RequisitosSlide key="l" e={e} ins={ins} total={total} i={4} ladoALado />);
    out.push(<CtaFinal key="f" ins={ins} total={total} />);
    return out;
  }
  const total = pontos.length + 2;
  out.push(<Capa key="c" e={e} ins={ins} total={total} rotulo={`${SOCIAL.rotuloSecao[e.section] ?? "ARTIGO"} // ${e.tag ? maiusculasBR(e.tag) : "DESTAQUES"}`} chipFinal={`${pontos.length} PONTOS NESTE POST`} />);
  pontos.forEach((p, i) => out.push(<PontoSlide key={`p${i}`} p={p} i={i + 1} total={total} ins={ins} imagem={ins.imagens[i] ?? null} rotulo={SOCIAL.rotuloSecao[e.section] ?? "ARTIGO"} />));
  out.push(<CtaFinal key="f" ins={ins} total={total} />);
  return out;
}
