// Modelo N: notícia, 1 imagem (capa grande, título em Anton, linha fina, convite para seguir).
import { COR, SOCIAL } from "../../config";
import { cortar, frasesInteiras, igual } from "../../core/texto";
import type { EntradaSocial } from "../../tipos";
import { ajustarTitulo, ANTON, Chip, Faixa, linhasDoTitulo, Play, Rodape, Tela, Topo, MONO, caixa } from "../ui";

export interface Insumos {
  logo: string;
  grade: string;
  capa: string | null;
}

/** Palavras do título que coincidem com a palavra-chave saem em verde. */
function Titulo({ titulo, chave, tam }: { titulo: string; chave: string | null; tam: number }) {
  const palavras = caixa(titulo).split(" ");
  const k = chave ? caixa(chave).split(" ").filter((w) => w.length > 2) : [];
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

/**
 * Reserva espaço para a descrição COMPLETA (frase inteira, até 3 linhas): escolhe o maior título que ainda deixa a descrição caber
 * entre y 784 e o rodapé (y 1176). Se nem o menor serve, encurta a descrição por frases e, por último, o título.
 */
function planejar(e: EntradaSocial) {
  const base = e.excerpt || e.metaDescription || "";
  const tituloBase = cortar(e.titulo, 110);
  const orcamento = 1176 - 784 - 22 - 20; // altura disponível para título + descrição
  for (const maxChars of [168, 112, 56]) {
    const fina = frasesInteiras(base, maxChars);
    const linhasFina = Math.max(1, Math.ceil(fina.length / 49));
    for (const tam of [96, 84, 72, 64]) {
      const linhas = linhasDoTitulo(tituloBase, tam);
      if (linhas <= 3 && Math.ceil(linhas * tam * 1.02) + linhasFina * 46 <= orcamento) return { titulo: tituloBase, tam, fina, linhasFina };
    }
  }
  // Título enorme: corta o título (2 linhas no menor tamanho) e usa a descrição mais curta.
  const t = ajustarTitulo(tituloBase, 952, 2, [64]);
  return { titulo: t.texto, tam: t.tam, fina: frasesInteiras(base, 112), linhasFina: 2 };
}

export function ModeloNoticia({ e, ins }: { e: EntradaSocial; ins: Insumos }) {
  const { titulo, tam, fina, linhasFina } = planejar(e);
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
        <div style={{ position: "absolute", right: 64, top: 690, display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 18, color: COR.texto, opacity: 0.6 }}>{caixa(cortar(e.capa.credito, 44))}</div>
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
