import { Form, Link, redirect, useSearchParams } from "react-router";
import type { Route } from "./+types/queue";
import { adminMeta, PageTitle, Pill, when } from "~/components/admin-ui";
import { cx } from "~/components/ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { listQueue, setItemStatus } from "~/lib/admin/data.server";

export const meta = () => adminMeta("Fila de pautas");

const TABS = [
  ["new", "Na fila"],
  ["used", "Usadas"],
  ["failed", "Reprovadas"],
  ["skipped", "Descartadas"],
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const url = new URL(request.url);
  const status = TABS.some(([s]) => s === url.searchParams.get("status")) ? url.searchParams.get("status")! : "new";
  const page = Math.max(1, Number(url.searchParams.get("pagina")) || 1);
  return { ...(await listQueue({ status, page })), status, page };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  if (intent === "descartar" || intent === "voltar") await setItemStatus(Number(form.get("id")), intent === "descartar" ? "skipped" : "new");
  // Volta para a mesma aba/página (request.url aqui é o endereço interno "/admin/fila.data").
  const url = new URL(request.url);
  const back = new URLSearchParams();
  for (const k of ["status", "pagina"]) if (url.searchParams.get(k)) back.set(k, url.searchParams.get(k)!);
  return redirect(`/admin/fila${back.size ? `?${back}` : ""}`);
}

export default function AdminQueue({ loaderData }: Route.ComponentProps) {
  const [params] = useSearchParams();
  const { rows, counts, status, page } = loaderData;
  return (
    <>
      <PageTitle>Fila de pautas</PageTitle>
      <p className="text-sm text-body">
        O robô escolhe as pautas da aba "Na fila" pela pontuação (fonte + palavras-chave), das últimas 48 h. Contagens dos últimos 7 dias.
      </p>
      <nav className="flex flex-wrap gap-1">
        {TABS.map(([s, label]) => (
          <Link
            key={s}
            to={`?status=${s}`}
            className={cx("px-3 py-2 font-mono text-xs font-bold uppercase", status === s ? "bg-acc text-ink" : "border border-line text-body hover:text-acc")}
          >
            {label} ({counts[s] ?? 0})
          </Link>
        ))}
      </nav>

      <ul className="flex flex-col divide-y divide-line border border-line">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 p-3 text-sm">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <a href={r.url} target="_blank" rel="noopener" className="font-semibold text-paper hover:text-acc">
                {r.title}
              </a>
              <span className="font-mono text-[11px] text-muted">
                {r.feed} · {when(r.published_at)} · pontos {r.score}
                {r.post_id && (
                  <>
                    {" "}
                    ·{" "}
                    <Link to={`/admin/materias/${r.post_id}`} className="text-acc underline">
                      matéria #{r.post_id}
                    </Link>
                  </>
                )}
              </span>
              {r.reason && <span className="text-xs text-body">{r.reason}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Pill status={r.status} />
              {(r.status === "new" || r.status === "skipped" || r.status === "failed") && (
                <Form method="post">
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    name="intent"
                    value={r.status === "new" ? "descartar" : "voltar"}
                    className="font-mono text-xs font-bold text-body underline hover:text-acc"
                  >
                    {r.status === "new" ? "descartar" : "voltar para a fila"}
                  </button>
                </Form>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-center text-muted">Nada aqui.</li>}
      </ul>

      <nav className="flex gap-3 font-mono text-xs">
        {page > 1 && <Link to={`?${new URLSearchParams({ ...Object.fromEntries(params), pagina: String(page - 1) })}`}>← anterior</Link>}
        {rows.length === 50 && <Link to={`?${new URLSearchParams({ ...Object.fromEntries(params), pagina: String(page + 1) })}`}>próxima →</Link>}
      </nav>
    </>
  );
}
