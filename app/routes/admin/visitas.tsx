// Painel de visitas (/admin/visitas). A tela e as consultas ficam em app/visitas (módulo copiável entre os sites).
import { Link } from "react-router";
import type { Route } from "./+types/visitas";
import "~/visitas/ui/visitas.css";
import { adminMeta } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { VISITAS } from "~/visitas/config";
import { diaBrasilia, isPeriodo, type Periodo } from "~/visitas/core/dia";
import { agora } from "~/visitas/server/coleta.server";
import { cartoes, dimensoes, paginas, resumoPeriodo, serie30 } from "~/visitas/server/consultas.server";
import { Painel } from "~/visitas/ui/Painel";

export const meta = () => adminMeta("Visitas");

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request); // o layout não roda quando o navegador pede só este loader (.data): conferir aqui também
  const url = new URL(request.url);
  const rawP = url.searchParams.get("p");
  const periodo: Periodo = isPeriodo(rawP) && rawP !== "ontem" ? rawP : "7d";
  const tipo = url.searchParams.get("tipo") ?? "tudo";
  const filtro = VISITAS.filtros.some((f) => f.id === tipo) ? tipo : "tudo";
  const mais = url.searchParams.get("mais") === "1";
  const hoje = diaBrasilia();
  try {
    const [c, serie, pag, dims, resumo] = await Promise.all([cartoes(hoje), serie30(hoje), paginas(periodo, hoje, filtro, mais ? 25 : 10), dimensoes(periodo, hoje), resumoPeriodo(periodo, hoje)]);
    const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date());
    return { erro: false as const, dados: { hoje, hora, desde: c.total.desde, agora: agora(), periodo, filtro, mais, cartoes: c, serie, paginas: pag, dims, resumo } };
  } catch (e) {
    console.error(`[visitas] não consegui ler o painel: ${String((e as Error)?.message ?? e).slice(0, 120)}`);
    return { erro: true as const };
  }
}

export default function Visitas({ loaderData }: Route.ComponentProps) {
  if (loaderData.erro)
    return (
      <div className="vp" role="alert">
        <h1 className="text-[1.75rem] font-extrabold tracking-[-0.02em]">Visitas</h1>
        <div className="mt-4 rounded-[14px] border border-[var(--vp-accent)]/40 bg-[var(--vp-accent-soft)] p-4">
          <p>Não deu para ler as visitas agora. Tente de novo em instantes.</p>
          <Link to="/admin/visitas" reloadDocument className="mt-2 inline-block font-bold text-[var(--vp-accent)]">
            Tentar de novo
          </Link>
        </div>
      </div>
    );
  return <Painel d={loaderData.dados} />;
}
