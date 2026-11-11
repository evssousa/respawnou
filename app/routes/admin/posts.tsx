import { Form, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/posts";
import { adminMeta, Button, inputCls, PageTitle, Pill, when } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { listPosts } from "~/lib/admin/data.server";
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
  return { ...(await listPosts(f)), page: f.page };
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
      <PageTitle aside={<span className="font-mono text-xs text-muted">{loaderData.total} matéria(s)</span>}>Matérias</PageTitle>

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
