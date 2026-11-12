// Guias de requisitos de PC (editoria Guias): "Requisitos de PC de <jogo>: mínimo e recomendado".
// Pauta: jogo de PC do calendário (IGDB) saindo de 10 dias atrás a 21 dias à frente, dos mais
// aguardados, que tenha na Steam os requisitos mínimos E recomendados. No máximo 1 guia por dia.
// Fonte: a ficha da própria Steam (em português do Brasil) — nada de benchmark inventado.
import { db, json, query } from "../db.server.ts";
import { steamGame } from "./enrich.server.ts";
import { emptyMedia } from "./media.ts";
import type { PreparedSources, Source } from "./writer.server.ts";

export interface GuideCandidate {
  gameId: number;
  name: string;
  prepared: PreparedSources;
  storeUrl: string;
}

async function tried(): Promise<Record<string, string>> {
  const [row] = await query<{ value: unknown }>("SELECT value FROM settings WHERE name = 'guides_tried'");
  return json<Record<string, string>>(row?.value, {});
}

/** Jogo já tentado (com ou sem sucesso) não volta: evita gastar o Gemini toda hora. */
export async function markGuide(gameId: number, note: string) {
  const all = await tried();
  all[String(gameId)] = `${new Date().toISOString().slice(0, 10)} ${note}`.slice(0, 200);
  await db().query("INSERT INTO settings (name, value) VALUES ('guides_tried', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [JSON.stringify(all)]);
}

/** test: ignora o limite diário e as tentativas anteriores (teste sem gravar). */
export async function guideCandidate(test = false): Promise<GuideCandidate | null> {
  // 1 guia por dia.
  const [today] = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM posts WHERE section = 'guias' AND origin = 'auto' AND published_at > UTC_TIMESTAMP() - INTERVAL 20 HOUR",
  );
  if (!test && Number(today?.n)) return null;
  const skip = test ? {} : await tried();
  const games = await query<{ id: number; name: string; release_date: string; image_url: string | null; genres: unknown; developer: string; publisher: string; description: string }>(
    `SELECT g.id, g.name, g.release_date, g.image_url, g.genres, g.developer, g.publisher, g.description FROM games g
     WHERE g.igdb_id IS NOT NULL AND JSON_CONTAINS(g.platforms, '"pc"')
       AND g.release_date BETWEEN CURDATE() - INTERVAL 10 DAY AND CURDATE() + INTERVAL 21 DAY
       AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.game_id = g.id AND p.section = 'guias')
     ORDER BY g.hypes DESC LIMIT 8`,
  );
  for (const g of games) {
    if (skip[String(g.id)]) continue;
    const steam = await steamGame(g.name);
    if (!steam?.minRequirements || !steam.recRequirements) {
      if (!test) await markGuide(g.id, "sem requisitos mínimo e recomendado na Steam");
      continue;
    }
    const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${String(g.release_date).slice(0, 10)}T12:00:00Z`));
    const released = String(g.release_date).slice(0, 10) <= new Date().toISOString().slice(0, 10);
    const text = [
      `${steam.name} ${released ? "foi lançado" : "será lançado"} para PC em ${date}${steam.url ? ", com página na Steam" : ""}.`,
      `Requisitos MÍNIMOS para PC informados na Steam: ${steam.minRequirements}`,
      `Requisitos RECOMENDADOS para PC informados na Steam: ${steam.recRequirements}`,
      steam.price ? `Preço na Steam Brasil: ${steam.price.now}${steam.price.discount ? ` (de ${steam.price.normal}, ${steam.price.discount}% de desconto)` : ""}.` : "",
      steam.languages ? `Idiomas: ${steam.languages}.` : "",
      steam.genres.length ? `Gêneros: ${steam.genres.join(", ")}.` : "",
      steam.developers.length ? `Desenvolvimento: ${steam.developers.join(", ")}.` : "",
      steam.publishers.length ? `Distribuição: ${steam.publishers.join(", ")}.` : "",
      steam.shortDescription ? `Sobre o jogo (Steam): ${steam.shortDescription}` : "",
      steam.about ? steam.about.slice(0, 1500) : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const sources: Source[] = [{ name: "Steam", title: `Requisitos de ${steam.name} na Steam`, url: steam.url, date: new Date().toISOString(), text }];
    const media = emptyMedia();
    if (g.image_url) media.images.push({ url: g.image_url, source: "IGDB" });
    for (const url of steam.screenshots.slice(0, 6)) media.images.push({ url, source: "Steam" });
    media.links.push(steam.url);
    return {
      gameId: g.id,
      name: g.name,
      storeUrl: steam.url,
      prepared: {
        sources,
        media,
        brief: `PAUTA APROVADA PELA EDITORIA (publish=true): GUIA de requisitos de PC de ${g.name}. Editoria: guias. Plataforma: pc.
- focusKeyword: "${g.name}"; title no formato "Requisitos de PC de ${g.name}: mínimo e recomendado" (ajuste para caber em 70 caracteres).
- Lide: o jogo, a data de lançamento no PC e que os requisitos foram divulgados na Steam.
- h2 "Requisitos mínimos" com "ul" (um item por componente: sistema, processador, memória, placa de vídeo, DirectX, armazenamento, observações), exatamente como na fonte.
- h2 "Requisitos recomendados" com "ul", do mesmo jeito.
- h2 sobre o que muda do mínimo para o recomendado: compare os itens (ex.: memória de 8 GB para 16 GB) e cite resolução/fps esperados SÓ se a fonte disser.
- "Para o jogador brasileiro" com preço em reais e idiomas, se a fonte trouxer.
- NÃO invente desempenho, benchmarks, configurações gráficas nem peças equivalentes que não estejam na fonte.`,
      },
    };
  }
  return null;
}
