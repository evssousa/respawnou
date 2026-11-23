// Atualização de peças antigas (docs/crescimento.md, C4). SEM Gemini: compara o guia de requisitos com a ficha atual do jogo
// (data de lançamento, preço na Steam e requisitos) e, só se algum dado mudou de verdade, acrescenta no fim do texto uma
// nota "Atualização em dd/mm/aaaa" montada por código e grava updated_at. Sem mudança, nada é gravado (mudar a data sem mudar
// o conteúdo seria manipulação de frescor). A foto dos dados de cada guia fica em settings.post_snapshots.
// Roda uma vez por semana, no sábado (horário de Brasília), dentro da coleta; no máximo 3 peças por semana.
import { createHash } from "node:crypto";
import { db, json, query } from "../db.server.ts";

const TZ = "America/Sao_Paulo";
const MAX_PER_WEEK = 3;
const MIN_AGE_DAYS = 14;

interface Snap {
  date: string | null;
  price: string | null;
  req: string;
}

const hash = (s: string | null | undefined) => createHash("sha1").update(s ?? "").digest("hex").slice(0, 12);
const brDate = (d = new Date()) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
const brLong = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

function weekdayBR(): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(w);
}

/** Dia (AAAA-MM-DD, Brasília): a trava semanal grava o sábado em que rodou. */
const weekKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

async function getSetting<T>(name: string, fallback: T): Promise<T> {
  const [row] = await query<{ value: unknown }>("SELECT value FROM settings WHERE name = ?", [name]);
  return json<T>(row?.value, fallback);
}

async function setSetting(name: string, value: unknown) {
  await db().query("INSERT INTO settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [name, JSON.stringify(value)]);
}

/** O que mudou na ficha desde a última foto (texto para o leitor) — vazio se nada mudou. */
export function changesFor(old: Snap, now: Snap, name: string): string[] {
  const out: string[] = [];
  if (old.date !== now.date && now.date) out.push(`a data de lançamento de ${name} agora é ${brLong(now.date)}`);
  if (old.price !== now.price && now.price) out.push(`o preço na Steam Brasil agora é ${now.price}`);
  if (old.req !== now.req) out.push("os requisitos de PC foram atualizados na Steam (confira os números na ficha do jogo)");
  return out;
}

/**
 * Atualiza até MAX_PER_WEEK guias com dados novos. `force` ignora o dia da semana e a trava semanal (teste).
 * Na primeira passagem por um guia só guarda a "foto" dos dados (nada é alterado).
 */
export async function atualizarPecas(force = false): Promise<{ updated: number; snapshots: number; skipped?: string }> {
  if (!force) {
    if (weekdayBR() !== 6) return { updated: 0, snapshots: 0, skipped: "não é sábado" };
    if ((await getSetting<string>("evergreen_update_week", "")) === weekKey()) return { updated: 0, snapshots: 0, skipped: "já rodou neste sábado" };
  }
  const posts = await query<{ id: number; body: unknown; slug: string; game_slug: string; name: string; release_date: string | null; price_brl: string | null; pc_min: string | null; pc_rec: string | null }>(
    `SELECT p.id, p.body, p.slug, g.slug AS game_slug, g.name, g.release_date, g.price_brl, g.pc_min, g.pc_rec
       FROM posts p JOIN games g ON g.id = p.game_id
      WHERE p.status = 'published' AND p.section = 'guias' AND p.tag = 'Requisitos'
        AND p.published_at < UTC_TIMESTAMP() - INTERVAL ${MIN_AGE_DAYS} DAY ORDER BY p.published_at DESC LIMIT 60`,
  );
  const snaps = await getSetting<Record<string, Snap>>("post_snapshots", {});
  let updated = 0;
  let snapshots = 0;
  for (const p of posts) {
    const now: Snap = { date: p.release_date ? String(p.release_date).slice(0, 10) : null, price: p.price_brl, req: hash(`${p.pc_min}|${p.pc_rec}`) };
    const old = snaps[String(p.id)];
    if (!old) {
      snaps[String(p.id)] = now;
      snapshots++;
      continue;
    }
    if (updated >= MAX_PER_WEEK) continue;
    const changes = changesFor(old, now, p.name);
    if (!changes.length) continue;
    const body = json<{ type: string; text?: string }[]>(p.body, []);
    const text = `Atualização em ${brDate()}: ${changes.join("; ")}. Veja a ficha completa em [${p.name}](/jogos/${p.game_slug}).`;
    body.push({ type: "p", text });
    await db().query("UPDATE posts SET body = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [JSON.stringify(body), p.id]);
    snaps[String(p.id)] = now;
    updated++;
  }
  await setSetting("post_snapshots", snaps);
  if (!force) await setSetting("evergreen_update_week", weekKey());
  return { updated, snapshots };
}
