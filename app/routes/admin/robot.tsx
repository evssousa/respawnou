import { Form, redirect, useNavigation, useRevalidator } from "react-router";
import { useEffect } from "react";
import type { Route } from "./+types/robot";
import { adminMeta, Button, Card, Notice, PageTitle, Pill, when } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { blocksToText } from "~/lib/admin/body-text";
import { iso } from "~/lib/db.server";
import { collect, diag, publish, recentRuns, type JobResult } from "~/lib/robot/robot.server";
import type { Block } from "~/lib/types";

export const meta = () => adminMeta("Robô");

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const runs = await recentRuns(40);
  return { runs: runs.map((r) => ({ ...r, started_at: iso(r.started_at) ?? r.started_at })), msg: new URL(request.url).searchParams.get("ok") };
}

const JOBS: Record<string, () => Promise<JobResult>> = {
  coletar: collect,
  publicar: () => publish({ force: true }),
  testar: () => publish({ dry: true }),
  diag,
};

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const intent = String((await request.formData()).get("intent"));
  const job = JOBS[intent];
  // Roda em segundo plano (o Gemini pode levar mais de 1 min); o resultado aparece no histórico.
  if (job) job().catch((err) => console.error(`[admin] ${intent}:`, err));
  return redirect(`/admin/robo?ok=${intent}`);
}

const MSG: Record<string, string> = {
  coletar: "Coleta iniciada.",
  publicar: "Publicação iniciada (ignora horário, limite diário e intervalo).",
  testar: "Teste iniciado: gera uma matéria sem gravar; o rascunho aparece abaixo.",
  diag: "Diagnóstico iniciado (Gemini e YouTube).",
};

export default function AdminRobot({ loaderData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const { revalidate } = useRevalidator();
  const running = loaderData.runs.some((r) => r.status === "running");
  // Enquanto algo roda, atualiza a lista a cada 5 s.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(revalidate, 5000);
    return () => clearInterval(t);
  }, [running, revalidate]);

  return (
    <>
      <PageTitle>Robô</PageTitle>
      {loaderData.msg && MSG[loaderData.msg] && <Notice>{MSG[loaderData.msg]}</Notice>}
      <Card title="Rodar agora">
        <Form method="post" className="flex flex-wrap gap-2">
          <Button name="intent" value="coletar" disabled={busy}>
            Coletar pautas
          </Button>
          <Button
            tone="primary"
            name="intent"
            value="publicar"
            disabled={busy}
            onClick={(e) => {
              if (!confirm("Publicar uma matéria agora, fora do ritmo normal?")) e.preventDefault();
            }}
          >
            Publicar uma agora
          </Button>
          <Button name="intent" value="testar" disabled={busy}>
            Testar (sem gravar)
          </Button>
          <Button name="intent" value="diag" disabled={busy}>
            Diagnóstico
          </Button>
        </Form>
        <p className="mt-3 text-xs text-muted">
          Automático: coleta a cada 30 min e tentativa de publicação de hora em hora (Cron Jobs da Hostinger). {running && "Atualizando a cada 5 s..."}
        </p>
      </Card>

      <ul className="flex flex-col divide-y divide-line border border-line">
        {loaderData.runs.map((r) => {
          const { post, ...stats } = (r.stats ?? {}) as { post?: { title?: string; metaDescription?: string; url?: string; body?: Block[] } } & Record<string, unknown>;
          const hasStats = Object.keys(stats).length > 0;
          return (
            <li key={r.id} className="p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Pill status={r.status} />
                <span className="font-mono text-xs font-bold text-paper">{r.job}</span>
                <span className="font-mono text-xs text-muted">#{r.id}</span>
                <span className="ml-auto font-mono text-xs text-muted">{when(r.started_at)}</span>
              </div>
              {r.message && <p className="mt-1 break-words text-body">{r.message}</p>}
              {(hasStats || post) && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-mono text-xs text-acc">detalhes</summary>
                  {post && (
                    <div className="mt-2 border-l-2 border-acc pl-3">
                      <p className="font-semibold text-paper">{post.title}</p>
                      {post.metaDescription && <p className="text-xs text-muted">{post.metaDescription}</p>}
                      {post.body && <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs text-body">{blocksToText(post.body)}</pre>}
                    </div>
                  )}
                  {hasStats && <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted">{JSON.stringify(stats, null, 2)}</pre>}
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
