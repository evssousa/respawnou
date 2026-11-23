// Modelo N: notícia, 1 imagem (capa grande, título em Anton, linha fina, convite para seguir).
import { COR, SOCIAL } from "../../config";
import { cortar, frasesInteiras, maiusculasBR, igual } from "../../core/texto";
import type { EntradaSocial } from "../../tipos";
import { ajustarTitulo, ANTON, Chip, Faixa, Play, Rodape, Tela, Topo, MONO } from "../ui";

export interface Insumos {
  logo: string;
  grade: string;
  capa: string | null;
}

/** Palavras do título que coincidem com a palavra-chave saem em verde. */
function Titulo({ titulo, chave, tam }: { titulo: string; chave: string | null; tam: number }) {
  const palavras = maiusculasBR(titulo).split(" ");
  const k = chave ? maiusculasBR(chave).split(" ").filter((w) => w.length > 2) : [];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", fontFamily: ANTON, fontSize: tam, lineHeight: 1.02, width: 952 }}>
      {palavras.map((p, i) => (
        <span key={i} style={{ marginRight: tam * 0.3, color: k.some((w) => igual(w, p.replace(/[^\p{L}\p{N}]/gu, ""))) ? COR.destaque : COR.texto }}>
          {p}
        </span>
      ))}
    </div>
  );
}

export function ModeloNoticia({ e, ins }: { e: EntradaSocial; ins: Insumos }) {
  const t = ajustarTitulo(cortar(e.titulo, 110));
  const titulo = t.texto;
  const tam = t.tam;
  // Espaço entre o título e o rodapé (y 1176): a linha fina só ocupa o que sobra (1 a 3 linhas).
  const alturaTitulo = Math.ceil(t.linhas * tam * 1.02);
  const linhasFina = Math.max(1, Math.min(3, Math.floor((1176 - 784 - alturaTitulo - 22 - 24) / 46)));
  const fina = frasesInteiras(e.excerpt || e.metaDescription || "", linhasFina * 56);
  const plats = e.plataformas.length >= 4 ? "MULTIPLATAFORMA" : e.plataformas.map((p) => SOCIAL.plataformaCurta[p] ?? p.toUpperCase()).join(" · ");
  const rumor = /rumor|vazamento/i.test(`${e.titulo} ${e.tags.join(" ")}`);
  const trailer = e.corpo.some((b) => b.type === "video");
  return (
    <Tela grade={ins.grade}>
      {ins.capa ? <img src={ins.capa} width={1080} height={760} style={{ position: "absolute", left: 0, top: 0 }} /> : <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 760, backgroundColor: COR.painel }} />}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 220, backgroundImage: "linear-gradient(to bottom, rgba(6,8,7,0.88), rgba(6,8,7,0))" }} />
      <div style={{ position: "absolute", left: 0, top: 460, width: 1080, height: 300, backgroundImage: "linear-gradient(to bottom, rgba(6,8,7,0), rgba(6,8,7,1))" }} />
      <Topo logo={ins.logo} direita={`${SOCIAL.rotuloSecao[e.section] ?? "NOTÍCIAS"} //`} />
      {e.capa?.credito && (
        <div style={{ position: "absolute", right: 64, top: 690, display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 18, color: COR.texto, opacity: 0.6 }}>{maiusculasBR(cortar(e.capa.credito, 44))}</div>
      )}
      <div style={{ position: "absolute", left: 64, top: 712, display: "flex" }}>
        <Chip texto={`NOTÍCIA${plats ? ` · ${plats}` : ""}`} />
        {rumor && <Chip texto="RUMOR" tipo="alerta" estilo={{ marginLeft: 12 }} />}
        {trailer && <Chip texto="TRAILER NA MATÉRIA" tipo="contorno" icone={<Play />} estilo={{ marginLeft: 12 }} />}
      </div>
      <div style={{ position: "absolute", left: 64, top: 784, display: "flex", flexDirection: "column", width: 952 }}>
        <Titulo titulo={titulo} chave={e.focusKeyword} tam={tam} />
        <div style={{ display: "flex", marginTop: 22, fontSize: 34, lineHeight: 1.35, color: COR.corpo, width: 952, maxHeight: linhasFina * 46, overflow: "hidden" }}>{fina}</div>
      </div>
      <Rodape frase={SOCIAL.frases.rodape} />
      <Faixa />
    </Tela>
  );
}
