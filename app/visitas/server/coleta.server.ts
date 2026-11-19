// Coleta das visitas (POST /api/v), sem cookie e sem guardar IP. Regras e ordem em docs/plano-painel-visitas.md (decisão 1).
// Os números ficam num buffer em memória e são gravados no banco a cada 10 s (soma por dia, nunca uma linha por visita).
import { createHash } from "node:crypto";
import { isbot } from "isbot";
import { VISITAS } from "../config";
import { classificar, normalizar } from "../core/caminho";
import { diaBrasilia } from "../core/dia";
import { origemDe } from "../core/origem";
import { aparelhoDe, navegadorDe, sistemaDe } from "../core/ua";
import { exec, hasDatabase } from "../db";
import { salDoDia } from "./sal.server";

const MAX_CORPO = 1024;
const RECARGA_MS = 30_000; // a mesma pessoa no mesmo endereço em menos que isto não conta outra página
const JANELA_MATERIA_MS = 30 * 60_000; // contador por matéria: uma vez a cada 30 min por pessoa
const AGORA_MS = 5 * 60_000;
const MAX_POR_MINUTO = 120;
const MAX_CHAVES = 50_000;
const GRAVAR_A_CADA_MS = 10_000;

export type Resultado = { contou: boolean; motivo?: string };
const ignorar = (motivo: string): Resultado => ({ contou: false, motivo });

// ───────────── buffer ─────────────

type Lote = {
  daily: Map<string, { day: string; pv: number; entries: number; bots: number }>;
  pages: Map<string, { day: string; path: string; kind: string; views: number; entries: number }>;
  dims: Map<string, { day: string; dim: string; value: string; n: number }>;
  seen: Map<string, { day: string; hash: Buffer }>;
  counters: Map<string, { sql: string; args: unknown[]; n: number }>;
};
const novoLote = (): Lote => ({ daily: new Map(), pages: new Map(), dims: new Map(), seen: new Map(), counters: new Map() });
let lote = novoLote();

const daily = (day: string) => {
  let d = lote.daily.get(day);
  if (!d) lote.daily.set(day, (d = { day, pv: 0, entries: 0, bots: 0 }));
  return d;
};
const somarDim = (day: string, dim: string, value: string) => {
  const k = `${day}\t${dim}\t${value}`;
  const d = lote.dims.get(k) ?? { day, dim, value: value.slice(0, 120), n: 0 };
  d.n++;
  lote.dims.set(k, d);
};

// ───────────── memória de curta duração ─────────────

const recentes = new Map<string, number>(); // código|endereço → quando
const recentesMateria = new Map<string, number>();
const porMinuto = new Map<string, { t0: number; n: number }>();
const vistos = new Map<string, number>(); // código → último sinal (para o "Agora")
let jaVistosHoje = new Set<string>();
let diaDosVistos = "";
let timer: ReturnType<typeof setInterval> | null = null;
let limpezaEm = 0;

/** Quantas pessoas diferentes mandaram sinal nos últimos 5 minutos (aproximado, só deste processo). */
export function agora(now = Date.now()): number {
  let n = 0;
  for (const t of vistos.values()) if (now - t < AGORA_MS) n++;
  return n;
}

function limparMemoria(now: number) {
  if (now - limpezaEm < 5 * 60_000 && recentes.size < MAX_CHAVES && recentesMateria.size < MAX_CHAVES) return;
  limpezaEm = now;
  for (const [k, t] of recentes) if (now - t > RECARGA_MS) recentes.delete(k);
  for (const [k, t] of recentesMateria) if (now - t > JANELA_MATERIA_MS) recentesMateria.delete(k);
  for (const [k, v] of porMinuto) if (now - v.t0 > 120_000) porMinuto.delete(k);
  for (const [k, t] of vistos) if (now - t > AGORA_MS) vistos.delete(k);
  if (recentes.size > MAX_CHAVES) recentes.clear();
  if (recentesMateria.size > MAX_CHAVES) recentesMateria.clear();
}

// ───────────── entrada ─────────────

const ipDe = (r: Request) => r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || r.headers.get("x-real-ip") || "";

function mesmoSite(r: Request): boolean {
  const permitidos = new Set(VISITAS.hosts.map((h) => h.toLowerCase()));
  const host = (r.headers.get("x-forwarded-host") ?? r.headers.get("host") ?? "").toLowerCase();
  const origin = r.headers.get("origin");
  if (origin) {
    try {
      const h = new URL(origin).host.toLowerCase();
      if (h !== host && !permitidos.has(h)) return false;
    } catch {
      return false;
    }
  }
  const sf = r.headers.get("sec-fetch-site");
  return !sf || sf === "same-origin";
}

/** Valida e conta um sinal. Qualquer recusa só devolve o motivo (a rota responde 204 do mesmo jeito). */
export async function registrar(request: Request, now = Date.now()): Promise<Resultado> {
  if (request.method !== "POST") return ignorar("método");
  const tamanho = Number(request.headers.get("content-length") ?? 0);
  if (tamanho > MAX_CORPO) return ignorar("corpo grande");
  const purpose = `${request.headers.get("sec-purpose") ?? ""} ${request.headers.get("purpose") ?? ""}`.toLowerCase();
  if (purpose.includes("prefetch")) return ignorar("prefetch");
  if (!mesmoSite(request)) return ignorar("outro site");
  if ((request.headers.get("cookie") ?? "").includes(`${VISITAS.cookieAdmin}=`)) return ignorar("admin");
  if (!hasDatabase()) return ignorar("sem banco");
  iniciar();

  const dia = diaBrasilia(new Date(now));
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || isbot(ua)) {
    daily(dia).bots++;
    return ignorar("robô");
  }

  let corpo: { p?: unknown; r?: unknown; u?: unknown; f?: unknown };
  try {
    const texto = await request.text();
    if (texto.length > MAX_CORPO) return ignorar("corpo grande");
    corpo = JSON.parse(texto);
  } catch {
    return ignorar("corpo inválido");
  }
  const caminho = normalizar(corpo?.p);
  if (!caminho) return ignorar("endereço");

  const sal = await salDoDia(dia);
  const hash = createHash("sha256").update(sal).update(ipDe(request)).update("|").update(ua).update("|").update((request.headers.get("host") ?? "").toLowerCase()).digest().subarray(0, 16);
  const cod = hash.toString("hex");

  limparMemoria(now);
  const min = porMinuto.get(cod);
  if (!min || now - min.t0 > 60_000) porMinuto.set(cod, { t0: now, n: 1 });
  else if (++min.n > MAX_POR_MINUTO) return ignorar("excesso");

  vistos.set(cod, now);
  const chave = `${cod}|${caminho}`;
  const ultima = recentes.get(chave);
  if (ultima && now - ultima < RECARGA_MS) return ignorar("recarregamento");
  recentes.set(chave, now);

  const tipo = classificar(caminho, VISITAS.tipos);
  const primeiro = corpo.f === 1 || corpo.f === "1";
  const origem = primeiro ? origemDe(typeof corpo.r === "string" ? corpo.r.slice(0, 500) : null, typeof corpo.u === "string" ? corpo.u.slice(0, 300) : null, VISITAS.hosts) : null;
  const entrada = !!origem && origem.origem !== "interno";

  const d = daily(dia);
  d.pv++;
  const kp = `${dia}\t${caminho}`;
  const pg = lote.pages.get(kp) ?? { day: dia, path: caminho, kind: tipo, views: 0, entries: 0 };
  pg.views++;
  lote.pages.set(kp, pg);

  // visitante do dia (aproximado): o código só conta uma vez por dia
  if (diaDosVistos !== dia) {
    jaVistosHoje = new Set();
    diaDosVistos = dia;
  }
  if (!jaVistosHoje.has(cod)) {
    jaVistosHoje.add(cod);
    lote.seen.set(`${dia}\t${cod}`, { day: dia, hash });
  }

  if (entrada && origem) {
    d.entries++;
    pg.entries++;
    somarDim(dia, "origem", origem.origem);
    if (origem.dim && origem.valor) somarDim(dia, origem.dim, origem.valor);
    somarDim(dia, "aparelho", aparelhoDe(ua, request.headers.get("sec-ch-ua-mobile")));
    somarDim(dia, "navegador", navegadorDe(ua));
    somarDim(dia, "sistema", sistemaDe(ua));
    somarDim(dia, "idioma", (request.headers.get("accept-language") ?? "").split(/[,;]/)[0].trim().slice(0, 16) || "desconhecido");
  }

  // contador por matéria (posts.views_count e blog_posts.views_count)
  for (const c of VISITAS.contadores) {
    const m = caminho.match(c.re);
    if (!m) continue;
    const kv = `${cod}|v|${caminho}`;
    const t = recentesMateria.get(kv);
    if (t && now - t < JANELA_MATERIA_MS) break;
    recentesMateria.set(kv, now);
    const args = c.args(m);
    const kc = `${c.sql}\t${JSON.stringify(args)}`;
    const cur = lote.counters.get(kc) ?? { sql: c.sql, args, n: 0 };
    cur.n++;
    lote.counters.set(kc, cur);
    break;
  }
  return { contou: true };
}

// ───────────── gravação ─────────────

const partes = <T>(lista: T[], n: number): T[][] => Array.from({ length: Math.ceil(lista.length / n) }, (_, i) => lista.slice(i * n, i * n + n));

function devolver(sobra: Lote) {
  for (const [k, v] of sobra.daily) {
    const d = lote.daily.get(k);
    if (d) Object.assign(d, { pv: d.pv + v.pv, entries: d.entries + v.entries, bots: d.bots + v.bots });
    else lote.daily.set(k, v);
  }
  for (const [k, v] of sobra.pages) {
    const p = lote.pages.get(k);
    if (p) Object.assign(p, { views: p.views + v.views, entries: p.entries + v.entries });
    else lote.pages.set(k, v);
  }
  for (const [k, v] of sobra.dims) {
    const x = lote.dims.get(k);
    if (x) x.n += v.n;
    else lote.dims.set(k, v);
  }
  for (const [k, v] of sobra.seen) if (!lote.seen.has(k)) lote.seen.set(k, v);
  for (const [k, v] of sobra.counters) {
    const c = lote.counters.get(k);
    if (c) c.n += v.n;
    else lote.counters.set(k, v);
  }
  // teto: se o banco ficar fora por muito tempo, descarta o excesso em vez de crescer sem limite
  if (lote.pages.size + lote.dims.size > 20_000) {
    console.error(`[visitas] buffer acima do teto (${lote.pages.size + lote.dims.size} chaves): descartando`);
    lote = novoLote();
  }
}

/** Grava o que está no buffer. Se falhar, os números voltam para o buffer e tentam no ciclo seguinte. */
export async function gravarAgora(): Promise<void> {
  if (!hasDatabase()) return;
  const vazio = !lote.daily.size && !lote.pages.size && !lote.dims.size && !lote.seen.size && !lote.counters.size;
  if (vazio) return;
  const meu = lote;
  lote = novoLote();
  const resto = novoLote(); // o que ainda não foi gravado, se algo falhar no meio
  try {
    // 1) visitantes do dia: só conta quem ainda não estava em visit_seen
    const novosPorDia = new Map<string, number>();
    const porDia = new Map<string, Buffer[]>();
    for (const v of meu.seen.values()) porDia.set(v.day, [...(porDia.get(v.day) ?? []), v.hash]);
    for (const [day, hashes] of porDia) {
      for (const grupo of partes(hashes, 500)) {
        const r = await exec(`INSERT IGNORE INTO visit_seen (day, vhash) VALUES ${grupo.map(() => "(?, ?)").join(", ")}`, grupo.flatMap((h) => [day, h]));
        novosPorDia.set(day, (novosPorDia.get(day) ?? 0) + r.affected);
      }
    }
    // 2) totais do dia
    for (const day of novosPorDia.keys()) daily0(meu, day);
    const dias = [...meu.daily.values()].map((d) => ({ ...d, visitors: novosPorDia.get(d.day) ?? 0 }));
    if (dias.length)
      await exec(
        `INSERT INTO visit_daily (day, pageviews, entries, visitors, bots) VALUES ${dias.map(() => "(?, ?, ?, ?, ?)").join(", ")}
         ON DUPLICATE KEY UPDATE pageviews = pageviews + VALUES(pageviews), entries = entries + VALUES(entries), visitors = visitors + VALUES(visitors), bots = bots + VALUES(bots)`,
        dias.flatMap((d) => [d.day, d.pv, d.entries, d.visitors, d.bots]),
      );
    // 3) páginas e dimensões
    for (const grupo of partes([...meu.pages.values()], 400)) {
      try {
        await exec(
          `INSERT INTO visit_pages (day, path, kind, views, entries) VALUES ${grupo.map(() => "(?, ?, ?, ?, ?)").join(", ")}
           ON DUPLICATE KEY UPDATE views = views + VALUES(views), entries = entries + VALUES(entries), kind = VALUES(kind)`,
          grupo.flatMap((p) => [p.day, p.path, p.kind, p.views, p.entries]),
        );
      } catch (e) {
        for (const p of grupo) resto.pages.set(`${p.day}\t${p.path}`, p);
        throw e;
      }
    }
    for (const grupo of partes([...meu.dims.values()], 400)) {
      try {
        await exec(
          `INSERT INTO visit_dims (day, dim, value, n) VALUES ${grupo.map(() => "(?, ?, ?, ?)").join(", ")} ON DUPLICATE KEY UPDATE n = n + VALUES(n)`,
          grupo.flatMap((x) => [x.day, x.dim, x.value, x.n]),
        );
      } catch (e) {
        for (const x of grupo) resto.dims.set(`${x.day}\t${x.dim}\t${x.value}`, x);
        throw e;
      }
    }
    // 4) contadores por matéria
    for (const [k, c] of meu.counters) {
      try {
        await exec(c.sql, [c.n, ...c.args]);
      } catch (e) {
        resto.counters.set(k, c);
        throw e;
      }
    }
  } catch (e) {
    // o que falhou no meio volta; o que já foi gravado não volta (não pode contar duas vezes)
    console.error(`[visitas] não consegui gravar (${meu.pages.size} páginas): ${String((e as Error)?.message ?? e).slice(0, 120)}`);
    devolver(resto);
  }
}

// só garante que o dia existe no mapa de totais antes de somar visitantes novos
function daily0(l: Lote, day: string) {
  if (!l.daily.has(day)) l.daily.set(day, { day, pv: 0, entries: 0, bots: 0 });
}

/** Liga a gravação periódica (uma vez por processo). */
export function iniciar() {
  if (timer) return;
  timer = setInterval(() => void gravarAgora(), GRAVAR_A_CADA_MS);
  timer.unref?.();
}

/** Só para os testes: zera tudo o que está na memória. */
export function zerarMemoria() {
  lote = novoLote();
  recentes.clear();
  recentesMateria.clear();
  porMinuto.clear();
  vistos.clear();
  jaVistosHoje = new Set();
  diaDosVistos = "";
  if (timer) clearInterval(timer);
  timer = null;
}
