// Retenção das visitas: códigos de visitante só valem no dia; páginas e origens ficam `retencaoDias`; os totais por dia ficam sem prazo.
import { VISITAS } from "../config";
import { diaBrasilia, somarDias } from "../core/dia";
import { exec, hasDatabase } from "../db";

export async function limparVisitas(now = new Date()): Promise<Record<string, number>> {
  if (!hasDatabase()) return {};
  const hoje = diaBrasilia(now);
  const corte = somarDias(hoje, -VISITAS.retencaoDias);
  const seen = await exec("DELETE FROM visit_seen WHERE day < ?", [hoje]);
  const paginas = await exec("DELETE FROM visit_pages WHERE day < ?", [corte]);
  const dims = await exec("DELETE FROM visit_dims WHERE day < ?", [corte]);
  return { visitasSeenApagadas: seen.affected, visitasPaginasApagadas: paginas.affected, visitasDimsApagadas: dims.affected };
}
