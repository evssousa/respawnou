// Blocos do roteiro novo no painel: escolha do gancho (3 opções) e fechamento com pergunta. Campos do formulário:
// `gancho` (o escolhido), `ganchos_json` (todas as opções), `pergunta`, `usar_pergunta`.
import { useState } from "react";
import { inputCls } from "~/components/admin-ui";
import { VIDEO } from "~/video/config";
import type { Roteiro } from "~/video/roteiro";

const ROTULOS = ["FATO", "PARA QUEM JOGA", "CURIOSIDADE"];

export function BlocoGancho({ r }: { r: Roteiro }) {
  const opcoes = r.v === 2 && r.ganchos?.length ? (r.ganchos.includes(r.gancho) ? r.ganchos : [r.gancho, ...r.ganchos].slice(0, 3)) : null;
  const [lista, setLista] = useState<string[]>(opcoes ?? [r.gancho]);
  const [sel, setSel] = useState(() => Math.max(0, (opcoes ?? [r.gancho]).indexOf(r.gancho)));
  const max = VIDEO.limites.gancho;
  // Roteiro antigo: um campo só, como sempre foi.
  if (!opcoes) {
    return (
      <label className="flex flex-col gap-1 text-xs text-muted">
        <span>Gancho ({r.gancho.length}/{max})</span>
        <input name="gancho" defaultValue={r.gancho} maxLength={max} className={inputCls} />
      </label>
    );
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-xs text-muted">Gancho: a 1ª frase do vídeo (escolha uma; pode editar)</legend>
      <input type="hidden" name="gancho" value={lista[sel] ?? ""} />
      <input type="hidden" name="ganchos_json" value={JSON.stringify(lista)} />
      {lista.map((g, i) => (
        <label key={i} className={`flex cursor-pointer flex-col gap-1 p-2 transition-colors duration-150 focus-within:outline focus-within:outline-2 focus-within:outline-acc ${sel === i ? "border-2 border-acc bg-acc/10" : "border border-line"}`}>
          <span className="font-mono text-[10px] uppercase text-muted">{ROTULOS[i] ?? `OPÇÃO ${i + 1}`}</span>
          <span className="flex items-center gap-3">
            <input type="radio" name="gancho_sel" checked={sel === i} onChange={() => setSel(i)} className="h-5 w-5 accent-[var(--color-acc)]" aria-label={`Escolher o gancho ${i + 1}`} />
            <input value={g} maxLength={max} onChange={(e) => setLista((l) => l.map((x, k) => (k === i ? e.target.value : x)))} onFocus={() => setSel(i)} aria-label={`Texto do gancho ${i + 1}`} className={inputCls} />
            <span className={`shrink-0 font-mono text-[11px] ${g.length > max ? "text-warn" : "text-muted"}`}>{g.length}/{max}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function BlocoFechamento({ r }: { r: Roteiro }) {
  const [usar, setUsar] = useState(Boolean(r.usarPergunta && r.pergunta));
  const [pergunta, setPergunta] = useState(r.pergunta ?? "");
  const ativa = usar && pergunta.trim().length > 0;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-3 text-paper">
        <input type="checkbox" name="usar_pergunta" checked={usar} onChange={(e) => setUsar(e.target.checked)} className="h-5 w-5 accent-[var(--color-acc)]" />
        Fechar com pergunta (puxa comentários)
      </label>
      <input name="pergunta" value={pergunta} onChange={(e) => setPergunta(e.target.value)} maxLength={80} readOnly={!usar} placeholder="Ex.: Você pagaria R$ 349 nele?" aria-label="Pergunta do fechamento" className={`${inputCls} ${usar ? "" : "opacity-50"}`} />
      <p className="text-xs text-muted">A voz vai falar no fim: “{ativa ? `${pergunta.trim()} ${VIDEO.fechamentoPergunta}` : VIDEO.fechamento}”</p>
    </div>
  );
}
