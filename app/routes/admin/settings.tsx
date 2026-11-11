import { data, Form, redirect } from "react-router";
import type { Route } from "./+types/settings";
import { adminMeta, Button, Card, Field, inputCls, Notice, PageTitle } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { getSettings, saveSettings } from "~/lib/admin/data.server";
import { SECTIONS } from "~/lib/site";

export const meta = () => adminMeta("Configurações");

// Editorias que o robô sabe escrever sozinho (reviews = consenso da crítica, ainda não automatizado).
const ROBOT_SECTIONS = SECTIONS.filter((s) => s.slug !== "reviews");

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { s: await getSettings(), msg: new URL(request.url).searchParams.get("ok") };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const f = await request.formData();
  const int = (name: string, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number(f.get(name)) || 0)));
  const values = {
    robot_enabled: f.get("robot_enabled") === "on",
    posts_per_day: int("posts_per_day", 0, 24),
    robot_sections: f.getAll("robot_sections").map(String).filter((s) => ROBOT_SECTIONS.some((r) => r.slug === s)),
    robot_min_words: int("robot_min_words", 200, 1500),
    robot_start_hour: int("robot_start_hour", 0, 23),
    robot_end_hour: int("robot_end_hour", 1, 24),
  };
  if (!values.robot_sections.length) return data({ error: "Escolha pelo menos uma editoria." }, { status: 400 });
  if (values.robot_end_hour <= values.robot_start_hour) return data({ error: "O horário final precisa ser depois do inicial." }, { status: 400 });
  await saveSettings(values);
  return redirect("/admin/config?ok=1");
}

export default function AdminSettings({ loaderData, actionData }: Route.ComponentProps) {
  const { s } = loaderData;
  const gap = Math.max(1, Math.floor((s.robot_end_hour - s.robot_start_hour) / Math.max(1, s.posts_per_day)));
  return (
    <>
      <PageTitle>Configurações</PageTitle>
      {loaderData.msg && <Notice>Configurações salvas. Valem a partir da próxima execução do robô.</Notice>}
      {actionData?.error && <Notice tone="warn">{actionData.error}</Notice>}
      <Form method="post" className="flex max-w-2xl flex-col gap-4">
        <Card title="Robô de publicação">
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 text-paper">
              <input type="checkbox" name="robot_enabled" defaultChecked={s.robot_enabled} className="h-5 w-5 accent-[var(--color-acc)]" />
              Robô ligado (publica sozinho)
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Matérias por dia">
                <input name="posts_per_day" type="number" min={0} max={24} defaultValue={s.posts_per_day} className={inputCls} />
              </Field>
              <Field label="Começa às (h)">
                <input name="robot_start_hour" type="number" min={0} max={23} defaultValue={s.robot_start_hour} className={inputCls} />
              </Field>
              <Field label="Termina às (h)">
                <input name="robot_end_hour" type="number" min={1} max={24} defaultValue={s.robot_end_hour} className={inputCls} />
              </Field>
            </div>
            <p className="text-xs text-muted">
              Horário de Brasília. Com a configuração atual, o intervalo mínimo entre matérias é de {gap} h. O Gemini grátis aguenta folgado até ~20 por dia.
            </p>
            <Field label="Mínimo de palavras" hint="Matéria abaixo disso é reprovada e reescrita (o Anime Profile usa 350).">
              <input name="robot_min_words" type="number" min={200} max={1500} defaultValue={s.robot_min_words} className={`${inputCls} max-w-32`} />
            </Field>
            <fieldset className="flex flex-wrap gap-4">
              <legend className="mb-1.5 font-mono text-xs font-bold uppercase text-body">Editorias que o robô pode usar</legend>
              {ROBOT_SECTIONS.map((sec) => (
                <label key={sec.slug} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="robot_sections"
                    value={sec.slug}
                    defaultChecked={s.robot_sections.includes(sec.slug)}
                    className="accent-[var(--color-acc)]"
                  />
                  {sec.label}
                </label>
              ))}
            </fieldset>
          </div>
        </Card>
        <div>
          <Button tone="primary">Salvar</Button>
        </div>
      </Form>
    </>
  );
}
