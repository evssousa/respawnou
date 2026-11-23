// Configuração dos blocos de anúncio (painel /admin/config): interruptor geral e os 4 números dos blocos do AdSense.
// Fica na tabela settings (sem migration). Cache de 60 s; sem banco (dados de exemplo) devolve tudo desligado.
import { db, hasDatabase, json, query } from "./db.server";
import type { AdsConfig, AdUnit } from "./ads";

export const AD_UNITS: AdUnit[] = ["meio", "faixa", "lateral", "multiplex"];
const OFF: AdsConfig = { enabled: false, slots: {} };
let cache: { at: number; value: AdsConfig } | undefined;

/** O ID de um bloco do AdSense tem 10 dígitos; qualquer coisa fora de 8 a 12 dígitos vira vazio. */
export const cleanSlot = (v: unknown) => (/^\d{8,12}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");

export async function getAdsConfig(): Promise<AdsConfig> {
  if (!hasDatabase()) return OFF;
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  try {
    const rows = await query<{ name: string; value: unknown }>("SELECT name, value FROM settings WHERE name IN ('ads_enabled', 'ads_slots')");
    const enabled = json<boolean>(rows.find((r) => r.name === "ads_enabled")?.value, false) === true;
    const raw = json<Record<string, unknown>>(rows.find((r) => r.name === "ads_slots")?.value, {});
    const slots: AdsConfig["slots"] = {};
    for (const u of AD_UNITS) {
      const id = cleanSlot(raw[u]);
      if (id) slots[u] = id;
    }
    const value = { enabled, slots };
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return OFF;
  }
}

export async function saveAdsConfig(cfg: AdsConfig) {
  const slots: AdsConfig["slots"] = {};
  for (const u of AD_UNITS) {
    const id = cleanSlot(cfg.slots[u]);
    if (id) slots[u] = id;
  }
  await db().query("INSERT INTO settings (name, value) VALUES ('ads_enabled', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [JSON.stringify(cfg.enabled === true)]);
  await db().query("INSERT INTO settings (name, value) VALUES ('ads_slots', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [JSON.stringify(slots)]);
  cache = undefined;
}
