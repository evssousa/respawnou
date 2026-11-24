// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Cartão "Pronúncia da voz": como a voz deve falar siglas e nomes. Edita a lista do dono; a base da marca aparece só para consulta.
import { useState } from "react";
import { Form } from "react-router";
import { Button, inputCls } from "~/components/admin-ui";
import type { ItemPronuncia } from "~/video/pronuncia";

export function CartaoPronuncia({ dono, base, nova, busy }: { dono: ItemPronuncia[]; base: ItemPronuncia[]; nova?: string; busy: boolean }) {
  const [linhas, setLinhas] = useState<ItemPronuncia[]>(() => {
    const l = [...dono];
    if (nova && !l.some((x) => x.de.toLowerCase() === nova.toLowerCase())) l.push({ de: nova, para: "" });
    return l;
  });
  const mudar = (i: number, campo: "de" | "para", v: string) => setLinhas((l) => l.map((x, k) => (k === i ? { ...x, [campo]: v } : x)));
  return (
    <details id="pronuncia" className="mt-6 border border-line p-3" open={Boolean(nova)}>
      <summary className="cursor-pointer font-mono text-xs font-bold text-muted">PRONÚNCIA DA VOZ ({dono.length} sua{dono.length === 1 ? "" : "s"} · {base.length} da base)</summary>
      <p className="mt-3 text-xs text-muted">Como a voz deve falar nomes e siglas. Vale para os próximos vídeos e não muda a legenda. Sua linha vence a da base quando o texto é igual.</p>
      <Form method="post" className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="intent" value="salvar_pronuncia" />
        {linhas.map((x, i) => (
          <div key={i} className="grid gap-2 border border-line p-2 sm:grid-cols-[1fr_1.5fr_auto] sm:border-0 sm:p-0">
            <input name="p_de" value={x.de} onChange={(e) => mudar(i, "de", e.target.value)} maxLength={40} placeholder="Como está escrito" aria-label="Como está escrito" className={inputCls} />
            <input name="p_para" value={x.para} onChange={(e) => mudar(i, "para", e.target.value)} maxLength={80} placeholder="Como a voz deve falar" aria-label="Como a voz deve falar" className={inputCls} />
            <button type="button" onClick={() => setLinhas((l) => l.filter((_, k) => k !== i))} className="min-h-9 border border-line-soft px-3 font-mono text-xs text-paper hover:border-warn hover:text-warn">Remover</button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setLinhas((l) => [...l, { de: "", para: "" }])} className="min-h-10 border border-line-soft px-4 font-mono text-xs font-bold text-paper hover:border-acc">+ Acrescentar</button>
          <Button tone="primary" disabled={busy}>Salvar pronúncias</Button>
        </div>
      </Form>
      <details className="mt-3">
        <summary className="cursor-pointer font-mono text-xs text-muted">Já vem pronto ({base.length})</summary>
        <ul className="mt-2 grid gap-1 font-mono text-xs text-muted sm:grid-cols-2">
          {base.map((x) => (
            <li key={x.de} className="flex items-center justify-between gap-2">
              <span>{x.de} → {x.para}</span>
              <button type="button" className="text-acc underline" onClick={() => setLinhas((l) => (l.some((y) => y.de.toLowerCase() === x.de.toLowerCase()) ? l : [...l, { de: x.de, para: x.para }]))}>trocar</button>
            </li>
          ))}
        </ul>
      </details>
    </details>
  );
}
