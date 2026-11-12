import { Form, Link, redirect, useSearchParams } from "react-router";
import type { Route } from "./+types/posts";
import { adminMeta, Button, inputCls, Notice, PageTitle, Pill, when } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { deletePost, listPosts } from "~/lib/admin/data.server";
import { SECTIONS } from "~/lib/site";

export const meta = () => adminMeta("Matérias");

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const url = new URL(request.url);
  const f = {
    q: url.searchParams.get("q")?.trim() || undefined,
    section: url.searchParams.get("editoria") || undefined,
    status: url.searchParams.get("status") || undefined,
    page: Math.max(1, Number(url.searchParams.get("pagina")) || 1),
  };
  return { ...(await listPosts(f)), page: f.page, msg: url.searchParams.get("ok") };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const form = await request.formData();
  if (form.get("intent") === "excluir") await deletePost(Number(form.get("id")));
  // Volta para a mesma busca/filtro (request.url aqui pode ser o endereço interno ".data").
  const url = new URL(request.url);
  url.searchParams.delete("_routes");
  url.searchParams.set("ok", "excluida");
  return redirect(`/admin/materias?${url.searchParams}`);
}

export default function AdminPosts({ loaderData }: Route.ComponentProps) {
  const [params] = useSearchParams();
  const pageUrl = (p: number) => {
    const next = new URLSearchParams(params);
    next.set("pagina", String(p));
    return `?${next}`;
  };
  return (
    <>
      <PageTitle
        aside={
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-muted">{loaderData.total} matéria(s)</span>
            <Link to="/admin/materias/nova" className="chs inline-flex min-h-10 items-center bg-acc px-4 font-mono text-xs font-bold uppercase text-ink hover:bg-paper">
              + Nova matéria
            </Link>
          </div>
        }
      >
        Matérias
      </PageTitle>

      {loaderData.msg === "excluida" && <Notice>Matéria excluída.</Notice>}
      <Form method="get" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={params.get("q") ?? ""} placeholder="Buscar no título" className={`${inputCls} max-w-xs`} />
        <select name="editoria" defaultValue={params.get("editoria") ?? ""} className={`${inputCls} w-auto`}>
          <option value="">Todas as editorias</option>
          {SECTIONS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.get("status") ?? ""} className={`${inputCls} w-auto`}>
          <option value="">Todos os status</option>
          <option value="published">Publicadas</option>
          <option value="draft">Rascunhos</option>
          <option value="archived">Arquivadas</option>
        </select>
        <Button>Filtrar</Button>
      </Form>

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-ink-2 font-mono text-xs uppercase text-muted">
            <tr>
              <th className="p-3">Matéria</th>
              <th className="p-3">Editoria</th>
              <th className="p-3">Status</th>
              <th className="p-3">Publicada</th>
              <th className="p-3 text-right">Visitas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loaderData.rows.map((p) => (
              <tr key={p.id} className="hover:bg-ink-2">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="h-10 w-16 shrink-0 object-cover" loading="lazy" />
                    ) : (
                      <span className="h-10 w-16 shrink-0 bg-line" title="Sem capa" />
                    )}
                    <span className="flex flex-col">
                      <Link to={`/admin/materias/${p.id}`} className="font-semibold text-paper hover:text-acc">
                        {p.title}
                      </Link>
                      <span className="font-mono text-[11px] text-muted">
                        #{p.id} · {p.origin === "auto" ? "robô" : "manual"}
                        {p.featured ? " · ★ destaque" : ""}
                        {p.status !== "published" && (
                          <Form method="post" className="inline">
                            <input type="hidden" name="id" value={p.id} />
                            <button
                              name="intent"
                              value="excluir"
                              className="ml-2 text-warn underline hover:text-paper"
                              onClick={(e) => {
                                if (!confirm(`Excluir de vez "${p.title}"? Não dá para desfazer.`)) e.preventDefault();
                              }}
                            >
                              excluir
                            </button>
                          </Form>
                        )}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="p-3 text-body">{SECTIONS.find((s) => s.slug === p.section)?.label ?? p.section}</td>
                <td className="p-3">
                  <Pill status={p.status} />
                </td>
                <td className="whitespace-nowrap p-3 font-mono text-xs text-body">{when(p.published_at)}</td>
                <td className="p-3 text-right font-mono text-xs">{p.views}</td>
              </tr>
            ))}
            {loaderData.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted">
                  Nenhuma matéria encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loaderData.pages > 1 && (
        <nav className="flex gap-2 font-mono text-xs">
          {loaderData.page > 1 && <Link to={pageUrl(loaderData.page - 1)}>← anterior</Link>}
          <span className="text-muted">
            página {loaderData.page} de {loaderData.pages}
          </span>
          {loaderData.page < loaderData.pages && <Link to={pageUrl(loaderData.page + 1)}>próxima →</Link>}
        </nav>
      )}
    </>
  );
}
