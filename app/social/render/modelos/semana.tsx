// Modelo S: lançamentos da semana em UMA imagem: uma linha por dia, blocos horizontais com a arte de cada jogo.
import { COR } from "../../config";
import { cortar, maiusculasBR } from "../../core/texto";
import type { EntradaSocial } from "../../tipos";
import { ANTON, Faixa, MONO, Rodape, Tela, Topo } from "../ui";

export interface InsumosSemana {
  logo: string;
  grade: string;
  /** Artes 192×108 por jogo (mesma ordem de dias → jogos). */
  artes: (string | null)[][];
}

export function ModeloSemana({ e, ins }: { e: EntradaSocial; ins: InsumosSemana }) {
  const s = e.semana!;
  const dias = s.dias.slice(0, 5);
  const alturaLinha = Math.min(200, Math.floor((770 - 12 * (dias.length - 1)) / dias.length));
  return (
    <Tela grade={ins.grade}>
      <Topo logo={ins.logo} direita="DADOS: IGDB" />
      <div style={{ position: "absolute", left: 64, top: 124, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontFamily: ANTON, fontSize: 110, lineHeight: 1.02 }}>LANÇAMENTOS</div>
        <div style={{ display: "flex", fontFamily: ANTON, fontSize: 110, lineHeight: 1.02, color: COR.destaque }}>DA SEMANA</div>
        <div style={{ display: "flex", marginTop: 10, fontFamily: MONO, fontWeight: 700, fontSize: 28, color: COR.corpo }}>{`> ${maiusculasBR(s.periodo)} // ${s.total} JOGOS`}</div>
      </div>
      <div style={{ position: "absolute", left: 0, top: 396, width: 1080, height: 2, backgroundColor: COR.linhaSuave }} />
      <div style={{ position: "absolute", left: 64, top: 410, width: 952, display: "flex", flexDirection: "column" }}>
        {dias.map((d, di) => {
          const jogos = d.jogos.length > 4 ? d.jogos.slice(0, 3) : d.jogos;
          const resto = d.jogos.length - jogos.length;
          return (
            <div key={di} style={{ display: "flex", height: alturaLinha, marginBottom: di < dias.length - 1 ? 12 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 132, height: alturaLinha, backgroundColor: COR.painel2, marginRight: 12 }}>
                <div style={{ display: "flex", fontFamily: ANTON, fontSize: d.rotulo.length > 4 ? 34 : 52, color: COR.texto, textAlign: "center" }}>{d.rotulo}</div>
                <div style={{ display: "flex", fontFamily: MONO, fontWeight: 700, fontSize: 24, color: COR.destaque }}>{d.data}</div>
              </div>
              {jogos.map((j, ji) => (
                <div key={ji} style={{ display: "flex", flexDirection: "column", width: 192, height: alturaLinha, marginRight: 12, backgroundColor: COR.painel, border: j.destaque ? `3px solid ${COR.destaque}` : `2px solid ${COR.linhaSuave}` }}>
                  {ins.artes[di]?.[ji] ? <img src={ins.artes[di][ji]!} width={192} height={108} /> : <div style={{ display: "flex", width: 192, height: 108, alignItems: "center", justifyContent: "center", fontFamily: ANTON, fontSize: 28, color: COR.corpo, textAlign: "center" }}>{maiusculasBR(cortar(j.nome, 18))}</div>}
                  <div style={{ display: "flex", padding: "6px 8px", fontWeight: 600, fontSize: 22, lineHeight: 1.12 }}>{cortar(j.nome, 28)}</div>
                </div>
              ))}
              {resto > 0 && (
                <div style={{ display: "flex", width: 192, height: alturaLinha, alignItems: "center", justifyContent: "center", backgroundColor: COR.painel, fontFamily: ANTON, fontSize: 64, color: COR.destaque }}>{`+${resto}`}</div>
              )}
            </div>
          );
        })}
      </div>
      <Rodape frase="Todo lançamento, toda semana" botao="CALENDÁRIO: LINK NA BIO" />
      <Faixa />
    </Tela>
  );
}
