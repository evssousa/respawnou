// Modelos de Story (1080×1920): ST-N (notícia, capa grande) e ST-M (moldura com o slide 1 do feed).
// Zonas seguras: nada importante em y < 250 nem em y > 1580 (o app desenha por cima). Um único botão: "LINK NA BIO".
import { COR, SOCIAL } from "../../config";
import { cortar, frasesInteiras } from "../../core/texto";
import type { EntradaSocial, Modelo } from "../../tipos";
import { ajustarTitulo, Chip, Faixa, linhasDoTitulo, MONO, Play, Seta, SetaDiagonal, Tela, Topo, caixa } from "../ui";
import { Titulo } from "./noticia";

export const ALTURA_STORY = 1920;

export interface InsumosStory {
  logo: string;
  grade: string;
  /** ST-N: capa 1080×1000. ST-M: slide 1 do feed 860×1076. */
  arte: string | null;
  /** ST-M: o slide 1 desfocado, 1080×1920. */
  fundo?: string | null;
  noFeed: boolean;
}

/** "Toque no @ lá em cima" + botão verde 952×84, sempre em y 1448–1580. */
function CtaStory({ texto }: { texto: string }) {
  return (
    <>
      <div style={{ position: "absolute", left: 64, top: 1448, display: "flex", alignItems: "center", fontFamily: MONO, fontWeight: 700, fontSize: 26, color: COR.corpo }}>
        <SetaDiagonal />
        {SOCIAL.story.apontar}
      </div>
      <div style={{ position: "absolute", left: 64, top: 1496, width: 952, height: 84, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: COR.destaque, color: COR.sobreDestaque, fontFamily: MONO, fontWeight: 700, fontSize: 32 }}>
        {texto}
        <Seta tam={32} />
      </div>
    </>
  );
}

/** Maior título (até 3 linhas) que ainda deixa a linha fina caber entre y 1060 e 1428. */
function planejarStory(e: EntradaSocial) {
  const base = e.excerpt || e.metaDescription || "";
  const tituloBase = cortar(e.titulo, 110);
  const orcamento = 1428 - 1060;
  for (const maxChars of [150, 100, 60]) {
    const fina = frasesInteiras(base, maxChars);
    const linhasFina = Math.max(1, Math.ceil(fina.length / 46));
    for (const tam of [104, 92, 80, 72]) {
      const linhas = linhasDoTitulo(tituloBase, tam);
      if (linhas <= 3 && Math.ceil(linhas * tam * 1.02) + 20 + linhasFina * 48 <= orcamento) return { titulo: tituloBase, tam, fina, linhasFina };
    }
  }
  const t = ajustarTitulo(tituloBase, 952, 2, [72]);
  return { titulo: t.texto, tam: t.tam, fina: frasesInteiras(base, 60), linhasFina: 2 };
}

export function ModeloStoryNoticia({ e, ins }: { e: EntradaSocial; ins: InsumosStory }) {
  const { titulo, tam, fina, linhasFina } = planejarStory(e);
  const plats = e.plataformas.length >= 4 ? "MULTIPLATAFORMA" : e.plataformas.map((p) => SOCIAL.plataformaCurta[p] ?? p.toUpperCase()).join(" · ");
  const rumor = /rumor|vazamento/i.test(`${e.titulo} ${e.tags.join(" ")}`);
  const trailer = e.corpo.some((b) => b.type === "video");
  return (
    <Tela grade={ins.grade} altura={ALTURA_STORY}>
      {ins.arte ? <img src={ins.arte} width={1080} height={1000} style={{ position: "absolute", left: 0, top: 0 }} /> : <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1000, backgroundColor: COR.painel }} />}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 360, backgroundImage: "linear-gradient(to bottom, rgba(6,8,7,0.9), rgba(6,8,7,0))" }} />
      <div style={{ position: "absolute", left: 0, top: 640, width: 1080, height: 360, backgroundImage: "linear-gradient(to bottom, rgba(6,8,7,0), rgba(6,8,7,1))" }} />
      <Topo logo={ins.logo} tam={56} y={272} direita={`${SOCIAL.rotuloSecao[e.section] ?? "NOTÍCIAS"} //`} />
      {e.capa?.credito && <div style={{ position: "absolute", right: 64, top: 944, display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 18, color: COR.texto, opacity: 0.6 }}>{caixa(cortar(e.capa.credito, 44))}</div>}
      <div style={{ position: "absolute", left: 64, top: 988, display: "flex" }}>
        <Chip texto={`NOTÍCIA${plats ? ` · ${plats}` : ""}`} />
        {rumor && <Chip texto="RUMOR" tipo="alerta" estilo={{ marginLeft: 12 }} />}
        {trailer && <Chip texto="TRAILER NA MATÉRIA" tipo="contorno" icone={<Play />} estilo={{ marginLeft: 12 }} />}
      </div>
      <div style={{ position: "absolute", left: 64, top: 1060, display: "flex", flexDirection: "column", width: 952 }}>
        <Titulo titulo={titulo} chave={e.focusKeyword} tam={tam} />
        <div style={{ display: "flex", marginTop: 20, fontSize: 36, lineHeight: 1.33, color: COR.corpo, width: 952, maxHeight: linhasFina * 48, overflow: "hidden" }}>{fina}</div>
      </div>
      <CtaStory texto={SOCIAL.story.cta.N} />
      <Faixa y={1912} />
    </Tela>
  );
}

export function ModeloStoryMoldura({ e, modelo, ins }: { e: EntradaSocial; modelo: Modelo; ins: InsumosStory }) {
  return (
    <Tela grade={ins.grade} altura={ALTURA_STORY} fundo={ins.fundo ?? undefined} escuro={0.82}>
      <Topo logo={ins.logo} tam={56} y={272} direita={ins.noFeed ? SOCIAL.story.noFeed : `${SOCIAL.rotuloSecao[e.section] ?? ""} //`} />
      <div style={{ position: "absolute", left: 120, top: 356, width: 864, height: 1080, backgroundColor: COR.destaqueFundo }} />
      <div style={{ position: "absolute", left: 108, top: 344, width: 864, height: 1080, display: "flex", border: `2px solid ${COR.linhaSuave}`, backgroundColor: COR.painel }}>
        {ins.arte && <img src={ins.arte} width={860} height={1076} />}
      </div>
      <CtaStory texto={SOCIAL.story.cta[modelo]} />
      <Faixa y={1912} />
    </Tela>
  );
}
