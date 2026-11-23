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

/** Cartão de abertura: chip da seção + título (Anton 96/84/72, até 4 linhas), em y 1000–1480. */
export function Abertura({ titulo, secao }: { titulo: string; secao: string }) {
  const t = ajustarTitulo(cortar(titulo, 120), 852, 4, [96, 84, 72]);
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H }}>
      <div style={{ position: "absolute", left: 64, top: 1000, display: "flex", alignItems: "center", height: 48, padding: "0 20px", backgroundColor: COR.destaque, color: COR.sobreDestaque, fontFamily: MONO, fontWeight: 700, fontSize: 24 }}>{caixa(secao)}</div>
      <div style={{ position: "absolute", left: 64, top: 1072, display: "flex", width: 852, fontFamily: ANTON, fontSize: t.tam, lineHeight: 1.02, color: COR.texto }}>{caixa(t.texto)}</div>
    </div>
  );
}

/** Fechamento (opaco): logo, "SIGA", o @ e o botão com o CTA. */
export function Fechamento({ logoGrande, grade, cta }: { logoGrande: string; grade: string; cta: string }) {
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
