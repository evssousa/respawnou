// Métricas dos vídeos no painel: chips da lista de publicados e tabela de desempenho por formato (componentes puros).
import { type LinhaMetrica, melhorMarco, milhar, pct, retencao, ROTULO_MARCO } from "~/video/metricas";

/** Chips ao lado da data de um vídeo publicado: views, retenção, curtidas e comentários do marco mais tardio. */
export function ChipsMetricas({ linhas, duracaoS }: { linhas: LinhaMetrica[]; duracaoS: number | null }) {
  const m = melhorMarco(linhas);
  if (!m) return <span className="font-mono text-[11px] text-muted">SEM DADOS AINDA</span>;
  const ret = retencao(m.avg_watch_ms, duracaoS);
  const corRet = ret == null ? "text-muted" : ret >= 0.6 ? "text-acc" : ret >= 0.35 ? "text-paper" : "text-warn";
  return (
    <span className="flex flex-wrap items-center gap-x-3 font-mono text-[11px]">
      {m.views != null && <span className="text-paper">{milhar(m.views)} VIEWS</span>}
      {ret != null && <span className={corRet}>{pct(ret)} RETENÇÃO</span>}
      {m.likes != null && <span className="text-muted">{milhar(m.likes)} CURT.</span>}
      {m.comments != null && <span className="text-muted">{milhar(m.comments)} COM.</span>}
      <span className="text-muted">{ROTULO_MARCO[m.marco]}</span>
    </span>
  );
}

export interface LinhaFormato {
  formato: string;
  videos: number;
  views: number | null;
  retencao: number | null;
  interacoes: number | null;
}

export function TabelaDesempenho({ formatos }: { formatos: LinhaFormato[] }) {
  if (!formatos.length) return <p className="text-xs text-muted">Ainda não há Reels publicados há mais de 72 horas.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-xs">
        <thead>
          <tr className="font-mono font-bold uppercase text-muted">
            <th className="py-1 text-left">Formato</th>
            <th className="py-1 text-right">Vídeos</th>
            <th className="py-1 text-right">Views (72 h)</th>
            <th className="py-1 text-right">Retenção</th>
            <th className="py-1 text-right">Curtidas + com.</th>
          </tr>
        </thead>
        <tbody>
          {formatos.map((f) => (
            <tr key={f.formato} className="border-t border-line-soft">
              <td className="py-1.5 text-paper">{f.formato}</td>
              <td className="py-1.5 text-right font-mono">{f.videos}</td>
              <td className="py-1.5 text-right font-mono">{milhar(f.views)}</td>
              <td className="py-1.5 text-right font-mono">{pct(f.retencao)}</td>
              <td className="py-1.5 text-right font-mono">{f.interacoes == null ? "—" : milhar(Math.round(f.interacoes))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted">Atualiza a cada 3 h com os números do Instagram. YouTube e TikTok entram quando os envios forem automáticos.</p>
    </div>
  );
}
