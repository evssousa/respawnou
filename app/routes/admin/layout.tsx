import { Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { AdminShell } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { hasDatabase } from "~/lib/db.server";

// Tudo dentro de /admin (menos login/sair) passa por aqui: sem sessão, vai para o login.
export async function loader({ request }: Route.LoaderArgs) {
  const email = await requireAdmin(request);
  return { email, hasDb: hasDatabase() };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  return (
    <AdminShell email={loaderData.email}>
      {loaderData.hasDb ? <Outlet /> : <p className="text-warn">Sem banco de dados configurado (DB_NAME/DB_USER): o painel precisa do MySQL.</p>}
    </AdminShell>
  );
}
