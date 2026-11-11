import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { logout } from "~/lib/admin/auth.server";

export async function action({ request }: Route.ActionArgs) {
  return redirect("/admin/login", { headers: { "Set-Cookie": await logout(request) } });
}

export const loader = () => redirect("/admin");
