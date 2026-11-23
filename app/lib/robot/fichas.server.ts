// Dados de PC das fichas de jogos (Steam) e liberação das fichas para o Google (docs/crescimento.md, frente 2).
import { db, json, query } from "../db.server.ts";
import { isIndexable, type IndexInput } from "../game-index.ts";
import { steamGame } from "./enrich.server.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const WEEK = "INTERVAL 7 DAY";

/**
 * Fichas com PC nas plataformas e sem consulta à Steam há mais de 7 dias (as mais aguardadas primeiro) ganham
 * requisitos, preço em reais e idiomas. Sem o jogo na Steam, só marca a consulta (não tenta de novo por 7 dias).
 * 1 requisição por segundo.
 */
export async function enrichGamesFromSteam(limit = 15) {
  const rows = await query<{ id: number; name: string }>(
    `SELECT id, name FROM games WHERE igdb_id IS NOT NULL AND JSON_CONTAINS(platforms, '"pc"')
       AND (steam_synced_at IS NULL OR steam_synced_at < UTC_TIMESTAMP() - ${WEEK}) ORDER BY hypes DESC LIMIT ?`,
    [limit],
  );
  let found = 0;
  let missing = 0;
  for (const g of rows) {
    const steam = await steamGame(g.name).catch(() => null);
    if (steam) {
      const languages = JSON.stringify({ interface: Boolean(steam.ptbr), legendas: Boolean(steam.ptbr), audio: Boolean(steam.ptbr?.audio), fonte: "steam" });
      await db().query(
        "UPDATE games SET steam_appid = ?, pc_min = ?, pc_rec = ?, price_brl = ?, languages = ?, steam_synced_at = UTC_TIMESTAMP() WHERE id = ?",
        [steam.appId, steam.minRequirements, steam.recRequirements, steam.price?.now ?? null, languages, g.id],
      );
      found++;
    } else {
      await db().query("UPDATE games SET steam_synced_at = UTC_TIMESTAMP() WHERE id = ?", [g.id]);
      missing++;
    }
    await sleep(1000);
  }
  return { checked: rows.length, found, missing };
}

interface FichaRow {
  id: number;
  description: string;
  release_date: string | null;
  release_label: string | null;
  trailer: string | null;
  screenshots: unknown;
  pc_min: string | null;
  pc_rec: string | null;
  languages: unknown;
  critic_count: number | null;
  releases: unknown;
  similar_igdb: unknown;
}

/**
 * Libera para o Google (games.index_from) as fichas sem matéria que cumprem o critério de app/lib/game-index.ts,
 * no máximo `games_index_per_week` por semana (padrão 5; as mais aguardadas primeiro). Ficha liberada nunca volta atrás.
 */
export async function liberarFichas(): Promise<{ released: number; candidates: number; cap: number }> {
  const [cfg] = await query<{ value: unknown }>("SELECT value FROM settings WHERE name = 'games_index_per_week'");
  const cap = Number(cfg?.value) > 0 ? Number(cfg?.value) : 5;
  const [done] = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM games WHERE index_from > UTC_TIMESTAMP() - ${WEEK}`);
  const room = cap - Number(done?.n ?? 0);
  if (room <= 0) return { released: 0, candidates: 0, cap };

  const rows = await query<FichaRow>(
    `SELECT g.id, g.description, g.release_date, g.release_label, g.trailer, g.screenshots, g.pc_min, g.pc_rec, g.languages, g.critic_count, g.releases, g.similar_igdb
       FROM games g WHERE g.index_from IS NULL AND g.igdb_id IS NOT NULL AND g.description <> ''
        AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.game_id = g.id) ORDER BY g.hypes DESC LIMIT 80`,
  );
  let released = 0;
  let candidates = 0;
  for (const r of rows) {
    if (released >= room) break;
    const similar = json<number[]>(r.similar_igdb, []);
    let similarOnSite = 0;
    if (similar.length) {
      const [c] = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM games WHERE igdb_id IN (${similar.map(() => "?").join(",")})`, similar);
      similarOnSite = Number(c?.n ?? 0);
    }
    const input: IndexInput = {
      description: r.description,
      releaseDate: r.release_date,
      releaseLabel: r.release_label,
      trailer: r.trailer,
      screenshots: json<string[]>(r.screenshots, []),
      pcMin: r.pc_min,
      pcRec: r.pc_rec,
      hasLanguages: r.languages != null,
      criticCount: r.critic_count,
      releasePlatforms: json<unknown[]>(r.releases, []).length,
      similarOnSite,
    };
    if (!isIndexable(input)) continue;
    candidates++;
    await db().query("UPDATE games SET index_from = UTC_TIMESTAMP() WHERE id = ? AND index_from IS NULL", [r.id]);
    released++;
  }
  return { released, candidates, cap };
}
