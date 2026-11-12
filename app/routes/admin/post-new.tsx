// Nova matéria escrita à mão: escolhe a editoria e o título, nasce como rascunho e abre no editor.
import { data, Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/post-new";
import { adminMeta, Button, Field, inputCls, Notice, PageTitle } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { createPost, isSection } from "~/lib/admin/data.server";
import { SECTIONS } from "~/lib/site";

export const meta = () => adminMeta("Nova matéria");

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const form = await request.formData();
  const section = String(form.get("section") ?? "");
  const title = String(form.get("title") ?? "").trim();
  if (!isSection(section) || title.length < 10) return data({ error: "Escolha a editoria e escreva um título com pelo menos 10 caracteres." }, { status: 400 });
  const id = await createPost(section, title);
  return redirect(`/admin/materias/${id}?ok=criado`);
}

export default function AdminPostNew({ actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  return (
    <>
      <PageTitle>Nova matéria</PageTitle>
      <p className="max-w-2xl text-sm text-body">
        A matéria nasce como <strong>rascunho</strong> (fora do site). No editor você escreve o texto, envia a capa e as imagens e publica quando estiver pronta.
        Até a primeira publicação, o endereço acompanha o título.
      </p>
      {actionData?.error && <Notice tone="warn">{actionData.error}</Notice>}
      <Form method="post" className="flex max-w-2xl flex-col gap-4">
        <Field label="Editoria">
          <select name="section" defaultValue="guias" className={inputCls}>
            {SECTIONS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Título" hint="30 a 70 caracteres é o ideal para o Google; dá para mudar depois.">
          <input name="title" required minLength={10} className={inputCls} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button tone="primary" disabled={busy}>
            {busy ? "Criando..." : "Criar rascunho e abrir o editor"}
          </Button>
          <Link to="/admin/materias" className="inline-flex min-h-10 items-center px-4 font-mono text-xs font-bold uppercase text-muted hover:text-paper">
            Cancelar
          </Link>
        </div>
      </Form>
    </>
  );
}
