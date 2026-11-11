import { data, Form, redirect } from "react-router";
import type { Route } from "./+types/feeds";
import { adminMeta, Button, Card, Field, inputCls, Notice, PageTitle, when } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { addFeed, listFeeds, updateFeed } from "~/lib/admin/data.server";
import { fetchFeed } from "~/lib/robot/rss.server";

export const meta = () => adminMeta("Fontes");

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { feeds: await listFeeds(), msg: new URL(request.url).searchParams.get("ok") };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  if (intent === "salvar") {
    await updateFeed(Number(form.get("id")), form.get("active") === "on", Number(form.get("weight")) || 5);
    return redirect("/admin/fontes?ok=salvo");
  }
  if (intent === "adicionar") {
    const name = String(form.get("name") ?? "").trim();
    const url = String(form.get("url") ?? "").trim();
    if (!name || !/^https:\/\//.test(url)) return data({ error: "Informe o nome e um endereço https:// do feed." }, { status: 400 });
    // Confere o feed antes de cadastrar (precisa responder e ter itens).
    try {
      const items = await fetchFeed(url);
      if (!items.length) return data({ error: "O endereço respondeu, mas não tem itens de RSS/Atom." }, { status: 400 });
    } catch (err) {
      return data({ error: `Não consegui ler o feed: ${err instanceof Error ? err.message : err}` }, { status: 400 });
    }
    const ok = await addFeed(name, url, Number(form.get("weight")) || 5);
    return ok ? redirect("/admin/fontes?ok=adicionada") : data({ error: "Esse feed já está cadastrado." }, { status: 400 });
  }
  return redirect("/admin/fontes");
}

export default function AdminFeeds({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <>
      <PageTitle>Fontes</PageTitle>
      {loaderData.msg === "salvo" && <Notice>Fonte atualizada.</Notice>}
      {loaderData.msg === "adicionada" && <Notice>Fonte adicionada. Ela entra na próxima coleta.</Notice>}
      <p className="text-sm text-body">
        Peso de 1 a 10: quanto maior, mais prioridade as pautas da fonte têm na escolha. Fonte que bloqueia o robô deve ficar desativada (o robô não
        contorna bloqueios).
      </p>

      <ul className="flex flex-col divide-y divide-line border border-line">
        {loaderData.feeds.map((f) => (
          <li key={f.id} className="p-3">
            <Form method="post" className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <input type="hidden" name="id" value={f.id} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className={f.active ? "font-semibold text-paper" : "font-semibold text-muted line-through"}>{f.name}</span>
                <span className="truncate font-mono text-[11px] text-muted">{f.url}</span>
                <span className="font-mono text-[11px] text-muted">
                  lida {when(f.last_fetched_at)} · 7 dias: {f.items7d} pautas, {f.used7d} viraram matéria
                </span>
                {f.last_error && <span className="text-xs text-warn">{f.last_error}</span>}
              </div>
              <label className="flex items-center gap-2 font-mono text-xs">
                <input type="checkbox" name="active" defaultChecked={Boolean(f.active)} className="accent-[var(--color-acc)]" /> ativa
              </label>
              <label className="flex items-center gap-2 font-mono text-xs">
                peso
                <input type="number" name="weight" min={1} max={10} defaultValue={f.weight} className={`${inputCls} w-16 py-1`} />
              </label>
              <Button name="intent" value="salvar" className="min-h-8">
                Salvar
              </Button>
            </Form>
          </li>
        ))}
      </ul>

      <Card title="Adicionar fonte">
        <Form method="post" className="grid gap-3 sm:grid-cols-[1fr_2fr_90px_auto] sm:items-end">
          <Field label="Nome">
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="Endereço do feed (RSS/Atom)">
            <input name="url" type="url" required placeholder="https://..." className={inputCls} />
          </Field>
          <Field label="Peso">
            <input name="weight" type="number" min={1} max={10} defaultValue={5} className={inputCls} />
          </Field>
          <Button tone="primary" name="intent" value="adicionar">
            Adicionar
          </Button>
        </Form>
        {actionData && "error" in actionData && <div className="mt-3"><Notice tone="warn">{actionData.error}</Notice></div>}
      </Card>
    </>
  );
}
