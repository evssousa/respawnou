// Lê a matéria do banco do respawnou e monta a EntradaSocial; escolhe o modelo de arte (ESPECÍFICO DO SITE).
import { SOCIAL } from "./config";
import { extrairPontos, lerRequisitos } from "./core/pontos";
import { query } from "./db";
import type { EntradaSocial, Modelo, Oferta, LinhaSemana, ReviewSocial } from "./tipos";
import type { Block } from "~/lib/types";

const json = <T,>(v: unknown, fb: T): T => {
  if (v == null) return fb;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fb;
    }
  }
  return v as T;
};

/** Dados extras que as compilações entregam na hora de enfileirar (semana e ofertas). */
export interface DicaSocial {
  semana?: { titulo: string; periodo: string; total: number; dias: LinhaSemana[] };
  ofertas?: { dia: string; total: number; itens: Oferta[] };
}

interface LinhaPost {
  id: number;
  section: string;
  slug: string;
  status: string;
  title: string;
  excerpt: string;
  meta_description: string | null;
  focus_keyword: string | null;
  tags: unknown;
  platforms: unknown;
  tag: string | null;
  image_url: string | null;
  image_credit: string | null;
  body: unknown;
  review: unknown;
  game_name: string | null;
  pc_min: string | null;
  pc_rec: string | null;
  price_brl: string | null;
  release_date: string | null;
}

const brData = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(d);

/** "qui, 27/11, às 13h" (Brasília). */
export function prazo(iso: string): string {
  const d = new Date(`${iso.replace(" ", "T")}${/Z|[+-]\d\d:?\d\d$/.test(iso) ? "" : "Z"}`);
  const p = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${String(p.weekday).replace(".", "")}, ${p.day}/${p.month}, às ${Number(p.hour)}h`;
}

/** Lê a matéria e tudo o que os modelos usam. Devolve null se a matéria não existe. */
export async function lerEntrada(postId: number, dica?: DicaSocial): Promise<(EntradaSocial & { publicada: boolean }) | null> {
  const [p] = await query<LinhaPost>(
    `SELECT p.id, p.section, p.slug, p.status, p.title, p.excerpt, p.meta_description, p.focus_keyword, p.tags, p.platforms, p.tag, p.image_url, p.image_credit,
            p.body, p.review, g.name AS game_name, g.pc_min, g.pc_rec, g.price_brl, g.release_date
       FROM posts p LEFT JOIN games g ON g.id = p.game_id WHERE p.id = ?`,
    [postId],
  );
  if (!p) return null;
  const corpo = json<Block[]>(p.body, []);
  const review = json<ReviewSocial | null>(p.review, null);
  const [gratis] = p.section === "promocoes" ? await query<{ name: string; store: string; worth: string | null; ends_at: string; image_url: string | null }>("SELECT name, store, worth, ends_at, image_url FROM free_games WHERE post_id = ? LIMIT 1", [postId]) : [];
  const requisitos = p.section === "guias" ? lerRequisitos(p.pc_min, p.pc_rec) : undefined;
  const e: EntradaSocial & { publicada: boolean } = {
    publicada: p.status === "published",
    postId: p.id,
    section: p.section,
    slug: p.slug,
    titulo: p.title,
    excerpt: p.excerpt,
    metaDescription: p.meta_description,
    focusKeyword: p.focus_keyword,
    tags: json<string[]>(p.tags, []),
    plataformas: json<string[]>(p.platforms, []),
    tag: p.tag,
    capa: p.image_url ? { src: p.image_url, credito: p.image_credit } : null,
    corpo,
    review: review && review.critics?.length ? review : undefined,
    requisitos,
    jogoNome: p.game_name,
    lancamento: p.release_date ? `${String(p.release_date).slice(8, 10)}/${String(p.release_date).slice(5, 7)}` : null,
    lancamentoIso: p.release_date ? String(p.release_date).slice(0, 10) : null,
    precoBrl: p.price_brl,
    gratis: gratis ? { nome: gratis.name, loja: gratis.store, precoNormal: gratis.worth, ate: prazo(String(gratis.ends_at)), arte: gratis.image_url } : undefined,
    semana: dica?.semana,
    ofertas: dica?.ofertas,
  };
  return e;
}

/** Escolhe o modelo da matéria (tabela "Que modelo cada matéria usa" do plano). */
export function escolherModelo(e: EntradaSocial): Modelo {
  if (e.semana) return "S";
  if (e.ofertas) return "P2";
  if (e.section === "promocoes" && e.gratis) return "P1";
  if (e.section === "reviews" && e.review) return "C-review";
  if (e.section === "guias" && e.requisitos) return "C-guia";
  if (e.section === "artigos" || e.section === "guias") return extrairPontos(e.corpo).length >= 3 ? "C-artigo" : "N";
  return "N";
}

export const modeloAtivo = (m: Modelo, ligados: Record<string, boolean>) => {
  const grupo = m === "N" ? "N" : m.startsWith("C") ? "C" : m.startsWith("P") ? "P" : "S";
  return ligados[grupo] !== false;
};

export const urlDaMateria = (e: Pick<EntradaSocial, "section" | "slug">) => `${SOCIAL.baseUrl}/${e.section}/${e.slug}`;
export { brData };
