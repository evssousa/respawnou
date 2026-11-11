import { data, Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { adminMeta, Button, Field, inputCls, Notice } from "~/components/admin-ui";
import { adminConfig, login, sameOrigin } from "~/lib/admin/auth.server";

export const meta = () => adminMeta("Entrar");

export function loader() {
  return { ready: adminConfig().ready };
}

export async function action({ request }: Route.ActionArgs) {
  if (!sameOrigin(request)) throw new Response("Origem inválida", { status: 403 });
  const form = await request.formData();
  const res = await login(request, String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!res.ok) return data({ error: res.error }, { status: 400 });
  return redirect("/admin", { headers: { "Set-Cookie": res.cookie } });
}

export default function Login({ loaderData, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <p className="font-display text-4xl uppercase leading-none">
        Respawnou<span className="text-acc">.</span> <span className="font-mono text-sm text-acc">ADMIN</span>
      </p>
      {!loaderData.ready ? (
        <Notice tone="warn">
          Painel ainda não configurado. Cadastre <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD_HASH</code> e <code>SESSION_SECRET</code> nas
          variáveis de ambiente (veja docs/admin.md).
        </Notice>
      ) : (
        <Form method="post" className="flex flex-col gap-4">
          <Field label="E-mail">
            <input name="email" type="email" required autoComplete="username" className={inputCls} />
          </Field>
          <Field label="Senha">
            <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
          </Field>
          {actionData?.error && <Notice tone="warn">{actionData.error}</Notice>}
          <Button tone="primary" disabled={busy}>
            {busy ? "Entrando..." : "Entrar"}
          </Button>
        </Form>
      )}
    </main>
  );
}
