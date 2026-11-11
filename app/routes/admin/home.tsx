import { Link } from "react-router";
import type { Route } from "./+types/home";
import { adminMeta, Card, PageTitle, Pill, Stat, when } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { dashboard, getSettings } from "~/lib/admin/data.server";

export const meta = () => adminMeta("Painel");

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const [d, settings] = await Promise.all([dashboard(), getSettings()]);
  return { ...d, settings };
}

export default function AdminHome({ loaderData: d }: Route.ComponentProps) {
  return (
    <>
      <PageTitle>Painel</PageTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Publicadas hoje" value={`${d.posts.today}/${d.settings.posts_per_day}`} />
        <Stat label="Últimos 7 dias" value={d.posts.week} />
        <Stat label="Total no ar" value={d.posts.total} />
        <Stat label="Pautas na fila (48 h)" value={d.queue.fresh} tone={d.queue.fresh === 0 ? "warn" : undefined} />
      </div>

      {!d.settings.robot_enabled && (
        <p className="border-l-4 border-warn bg-ink-2 px-4 py-3 text-sm text-warn">
          O robô está desligado. <Link to="/admin/config" className="underline">Ligar em Configurações</Link>.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Últimas execuções do robô">
          <ul className="flex flex-col divide-y divide-line">
            {d.runs.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Pill status={r.status} />
                  <span className="font-mono text-xs font-bold text-paper">{r.job}</span>
                  <span className="ml-auto font-mono text-xs text-muted">{when(r.started_at)}</span>
                </span>
                {r.message && <span className="line-clamp-2 text-body">{r.message}</span>}
              </li>
            ))}
          </ul>
          <Link to="/admin/robo" className="mt-3 inline-block font-mono text-xs font-bold text-acc">
            VER TUDO →
          </Link>
        </Card>

        <Card title="Atenção">
          <ul className="flex flex-col gap-2 text-sm">
            {d.posts.drafts > 0 && (
              <li>
                <Link to="/admin/materias?status=draft" className="underline">
                  {d.posts.drafts} rascunho(s)
                </Link>{" "}
                esperando revisão.
              </li>
            )}
            {d.queue.failed24 > 0 && (
              <li>
                <Link to="/admin/fila?status=failed" className="underline">
                  {d.queue.failed24} pauta(s) reprovada(s)
                </Link>{" "}
                na checagem nas últimas 24 h.
              </li>
            )}
            {d.feedErrors.map((f) => (
              <li key={f.name} className="text-warn">
                Fonte {f.name}: {f.last_error}
              </li>
            ))}
            {d.posts.drafts === 0 && d.queue.failed24 === 0 && d.feedErrors.length === 0 && <li className="text-muted">Nada pendente.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
