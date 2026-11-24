// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Quadros do vídeo (satori → PNG 1080×1920): moldura (gradientes + marca, transparente), cartão de abertura (transparente) e fechamento.
// Zonas seguras (Reels/Shorts/TikTok): topo 0–220, base 1500–1920, lateral direita x 950–1080. Texto importante em x 64–916, y 220–1500.
import { COR, SOCIAL } from "~/social/config";
import { cortar } from "~/social/core/texto";
import { ajustarTitulo, ANTON, MONO, Seta, Tela, caixa } from "~/social/render/ui";

const W = 1080;
const H = 1920;

/** Gradiente do topo (70% → 0) e da base (0 → 85%) + marca pequena e chip da seção. Fica por cima de toda cena. */
export function Moldura({ logo, secao }: { logo: string; secao: string }) {
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 360, backgroundImage: "linear-gradient(to bottom, rgba(6,8,7,0.7), rgba(6,8,7,0))" }} />
      <div style={{ position: "absolute", left: 0, top: 1100, width: W, height: 820, backgroundImage: "linear-gradient(to bottom, rgba(6,8,7,0), rgba(6,8,7,0.85))" }} />
      <div style={{ position: "absolute", left: 64, top: 236, width: 852, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={logo} width={56} height={56} style={{ marginRight: 14 }} />
          <div style={{ display: "flex", fontFamily: ANTON, fontSize: 32, color: COR.texto, letterSpacing: 1 }}>
            <span>{SOCIAL.marca}</span>
            <span style={{ color: COR.destaque }}>.</span>
          </div>
        </div>
        <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 22, color: COR.destaque }}>{caixa(secao)}</div>
      </div>
    </div>
  );
}

/**
 * Cartão de abertura: painel escuro (para o título ler sobre qualquer imagem) com a barra verde da marca, o chip da seção e o
 * título (Anton 96/84/72, até 4 linhas), em y 960–1500.
 */
export function Abertura({ titulo, secao }: { titulo: string; secao: string }) {
  const t = ajustarTitulo(cortar(titulo, 120), 800, 4, [96, 84, 72]);
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H }}>
      <div style={{ position: "absolute", left: 0, top: 940, width: W, height: 580, backgroundImage: "linear-gradient(to bottom, rgba(6,8,7,0), rgba(6,8,7,0.55))" }} />
      <div style={{ position: "absolute", left: 40, top: 980, width: 900, display: "flex", flexDirection: "column", padding: "28px 36px 36px 40px", backgroundColor: "rgba(6,8,7,0.82)", borderLeft: `10px solid ${COR.destaque}` }}>
        <div style={{ display: "flex", alignItems: "center", alignSelf: "flex-start", height: 48, padding: "0 20px", backgroundColor: COR.destaque, color: COR.sobreDestaque, fontFamily: MONO, fontWeight: 700, fontSize: 24 }}>{caixa(secao)}</div>
        <div style={{ display: "flex", width: 800, marginTop: 22, fontFamily: ANTON, fontSize: t.tam, lineHeight: 1.04, color: COR.texto }}>{caixa(t.texto)}</div>
      </div>
    </div>
  );
}

/** Fechamento (opaco): logo, "SIGA", o @ e o botão com o CTA. Com pergunta: chip "RESPONDA NOS COMENTÁRIOS" e a pergunta em destaque. */
export function Fechamento({ logoGrande, grade, cta, pergunta }: { logoGrande: string; grade: string; cta: string; pergunta?: string | null }) {
  if (pergunta) {
    const semInterrogacao = pergunta.replace(/\?+$/, "").trim();
    const t = ajustarTitulo(cortar(semInterrogacao, 90), 852, 3, [88, 76, 64]);
    const palavrasPergunta = caixa(t.texto).split(/\s+/).filter(Boolean);
    return (
      <Tela grade={grade} altura={H}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, backgroundImage: "radial-gradient(circle at 540px 900px, rgba(200,255,46,0.18), rgba(200,255,46,0) 560px)" }} />
        <div style={{ position: "absolute", left: 0, top: 260, width: W, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 22px", border: `3px solid ${COR.destaque}`, color: COR.destaque, fontFamily: MONO, fontWeight: 700, fontSize: 26 }}>RESPONDA NOS COMENTÁRIOS</div>
        </div>
        <div style={{ position: "absolute", left: 114, top: 350, width: 852, display: "flex", flexWrap: "wrap", justifyContent: "center", fontFamily: ANTON, fontSize: t.tam, lineHeight: 1.04, color: COR.texto }}>
          {palavrasPergunta.map((w, i) => (
            <div key={i} style={{ display: "flex", marginRight: i === palavrasPergunta.length - 1 ? 0 : Math.round(t.tam * 0.28) }}>
              <span>{w}</span>
              {i === palavrasPergunta.length - 1 && <span style={{ color: COR.destaque }}>?</span>}
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, top: 740, width: W, display: "flex", justifyContent: "center" }}>
          <img src={logoGrande} width={160} height={160} />
        </div>
        <div style={{ position: "absolute", left: 0, top: 920, width: W, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontFamily: ANTON, fontSize: 104, color: COR.texto }}>SIGA</div>
          <div style={{ display: "flex", fontFamily: ANTON, fontSize: 64, color: COR.destaque, marginTop: 10 }}>{`@${caixa(SOCIAL.handle)}`}</div>
        </div>
        <div style={{ position: "absolute", left: 114, top: 1250, width: 852, height: 84, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: COR.destaque, color: COR.sobreDestaque, fontFamily: MONO, fontWeight: 700, fontSize: 30 }}>
          {cta}
          <Seta tam={30} />
        </div>
      </Tela>
    );
  }
  return (
    <Tela grade={grade} altura={H}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, backgroundImage: "radial-gradient(circle at 540px 700px, rgba(200,255,46,0.18), rgba(200,255,46,0) 560px)" }} />
      <div style={{ position: "absolute", left: 0, top: 420, width: W, display: "flex", justifyContent: "center" }}>
        <img src={logoGrande} width={200} height={200} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 700, width: W, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", fontFamily: ANTON, fontSize: 120, color: COR.texto }}>SIGA</div>
        <div style={{ display: "flex", fontFamily: ANTON, fontSize: 72, color: COR.destaque, marginTop: 14 }}>{`@${caixa(SOCIAL.handle)}`}</div>
      </div>
      <div style={{ position: "absolute", left: 114, top: 1000, width: 852, height: 84, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: COR.destaque, color: COR.sobreDestaque, fontFamily: MONO, fontWeight: 700, fontSize: 30 }}>
        {cta}
        <Seta tam={30} />
      </div>
    </Tela>
  );
}
