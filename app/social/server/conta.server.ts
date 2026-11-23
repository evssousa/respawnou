// Conta do Instagram e configurações da automação (tabela social_accounts). O token fica criptografado (cripto.server.ts).
import { exec, query } from "../db";
import { cifrar, chaveOk, decifrar } from "./cripto.server";
import { perfil, renovar, tokenDoInstagram } from "./instagram.server";

export interface Conta {
  network: string;
  account_id: string | null;
  username: string | null;
  token_status: "none" | "ok" | "invalid";
  token_expires_at: string | null;
  token_refreshed_at: string | null;
  enabled: boolean;
  test_mode: boolean;
  daily_limit: number;
  min_gap_minutes: number;
  start_hour: number;
  end_hour: number;
  models: Record<string, boolean>;
  paused_until: string | null;
  note: string | null;
  hasToken: boolean;
}

type Linha = Omit<Conta, "enabled" | "test_mode" | "models" | "hasToken"> & { enabled: number; test_mode: number; models: unknown; token_enc: string | null };

export async function getConta(): Promise<Conta> {
  const [r] = await query<Linha>("SELECT * FROM social_accounts WHERE network = 'instagram'");
  if (!r) throw new Error("conta do Instagram não existe (migration 012?)");
  let models: Record<string, boolean> = {};
  try {
    models = typeof r.models === "string" ? JSON.parse(r.models) : ((r.models as Record<string, boolean>) ?? {});
  } catch {
    /* padrão vazio */
  }
  const { token_enc, ...resto } = r;
  return { ...resto, enabled: !!r.enabled, test_mode: !!r.test_mode, models, hasToken: !!token_enc };
}

export async function getToken(): Promise<string | null> {
  const [r] = await query<{ token_enc: string | null }>("SELECT token_enc FROM social_accounts WHERE network = 'instagram'");
  if (!r?.token_enc) return null;
  try {
    return decifrar(r.token_enc);
  } catch {
    return null;
  }
}

export async function salvarConfig(c: { enabled: boolean; test_mode: boolean; daily_limit: number; min_gap_minutes: number; start_hour: number; end_hour: number; models: Record<string, boolean> }) {
  await exec(
    "UPDATE social_accounts SET enabled = ?, test_mode = ?, daily_limit = ?, min_gap_minutes = ?, start_hour = ?, end_hour = ?, models = ? WHERE network = 'instagram'",
    [c.enabled ? 1 : 0, c.test_mode ? 1 : 0, c.daily_limit, c.min_gap_minutes, c.start_hour, c.end_hour, JSON.stringify(c.models)],
  );
}

/** Conecta com o token colado no painel: confere o perfil, guarda criptografado e marca como válido. */
export async function conectar(token: string): Promise<{ username: string }> {
  if (!chaveOk()) throw new Error("SOCIAL_KEY ausente ou inválida: cadastre a variável no hPanel antes de conectar");
  const limpo = token.trim();
  const p = await perfil(limpo);
  // Login do Instagram: vale 60 dias e o site renova sozinho. Login do Facebook (token de Página): não tem data de vencimento conhecida.
  const doInstagram = tokenDoInstagram(p.tokenFinal);
  await exec(
    `UPDATE social_accounts SET account_id = ?, username = ?, token_enc = ?, token_status = 'ok', token_refreshed_at = UTC_TIMESTAMP(),
       token_expires_at = ${doInstagram ? "DATE_ADD(UTC_TIMESTAMP(), INTERVAL 60 DAY)" : "NULL"}, paused_until = NULL, note = NULL WHERE network = 'instagram'`,
    [p.user_id, p.username, cifrar(p.tokenFinal)],
  );
  return { username: p.username };
}

export async function desconectar() {
  await exec("UPDATE social_accounts SET token_enc = NULL, token_status = 'none', account_id = NULL, username = NULL, enabled = 0 WHERE network = 'instagram'");
}

export async function marcarTokenInvalido(nota: string) {
  await exec("UPDATE social_accounts SET token_status = 'invalid', note = ? WHERE network = 'instagram'", [nota.slice(0, 480)]);
}

export async function pausar(horas: number, nota: string) {
  await exec("UPDATE social_accounts SET paused_until = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR), note = ? WHERE network = 'instagram'", [horas, nota.slice(0, 480)]);
}

/** Renova o token se passou mais de 7 dias da última renovação (e o token tem mais de 24 h). */
export async function renovarSePreciso(): Promise<void> {
  const [r] = await query<{ token_enc: string | null; refreshed: number | null; status: string }>(
    "SELECT token_enc, TIMESTAMPDIFF(HOUR, token_refreshed_at, UTC_TIMESTAMP()) AS refreshed, token_status AS status FROM social_accounts WHERE network = 'instagram'",
  );
  if (!r?.token_enc || r.status !== "ok" || (r.refreshed ?? 0) < 24 * 7) return;
  try {
    const atual = decifrar(r.token_enc);
    if (!tokenDoInstagram(atual)) return; // token de Página (login do Facebook): não há renovação por aqui
    const novo = await renovar(atual);
    await exec("UPDATE social_accounts SET token_enc = ?, token_refreshed_at = UTC_TIMESTAMP(), token_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND) WHERE network = 'instagram'", [cifrar(novo.token), novo.expiraEmSeg]);
  } catch (e) {
    const codigo = (e as { codigo?: number }).codigo;
    if (codigo === 190) await marcarTokenInvalido("Token do Instagram expirou ou foi invalidado: gere outro e cole em /admin/instagram.");
  }
}
