// Dicionário de pronúncia (puro: vale no painel e no servidor). Base da marca + itens do dono; o do dono vence quando o "de" é igual.
import { MARCA } from "~/marca";
import type { ItemPronuncia } from "../../scripts/video/falar";

export type { ItemPronuncia };

const norm = (s: string) => s.trim().toLowerCase();

/** Base da marca + itens do dono (o do dono com o mesmo `de`, sem diferenciar maiúsculas, substitui o da base). */
export function juntarDicionario(dono: ItemPronuncia[], base: ItemPronuncia[] = MARCA.video.pronunciaBase): ItemPronuncia[] {
  const do_dono = new Set(dono.map((x) => norm(x.de)));
  return [...base.filter((x) => !do_dono.has(norm(x.de))), ...dono];
}

/** Valida e limpa a lista vinda do formulário/banco: tamanhos, sem `<>{}\`, sem repetidos, no máximo 300. */
export function limparItens(brutos: unknown): ItemPronuncia[] {
  if (!Array.isArray(brutos)) return [];
  const visto = new Set<string>();
  const out: ItemPronuncia[] = [];
  for (const b of brutos) {
    const o = (b ?? {}) as Record<string, unknown>;
    const de = typeof o.de === "string" ? o.de.replace(/[<>{}\\]/g, "").trim() : "";
    const para = typeof o.para === "string" ? o.para.replace(/[<>{}\\]/g, "").trim() : "";
    if (!de || !para || de.length > 40 || para.length > 80 || visto.has(norm(de))) continue;
    visto.add(norm(de));
    out.push({ de, para });
    if (out.length >= 300) break;
  }
  return out;
}

const COMUNS = new Set(["jogo", "jogos", "kit", "kits", "know", "show", "yes", "new", "now", "key", "keys", "way", "play", "playing", "yellow", "wow"]);

/**
 * Palavras do roteiro que a voz pode errar e que ainda não estão no dicionário: só maiúsculas com 2+ letras (GTA), letra + dígito
 * (PS6, GTA6) ou palavra com k/w/y fora de uma lista de palavras comuns. Sem repetir.
 */
export function suspeitas(textos: string[], dic: ItemPronuncia[]): string[] {
  const conhecidos = new Set(dic.map((x) => norm(x.de)));
  const out: string[] = [];
  for (const t of textos) {
    for (const bruta of t.split(/\s+/)) {
      const w = bruta.replace(/^[("“'‘]+|[.,;:!?…)"”'’]+$/g, "");
      if (!w || conhecidos.has(norm(w)) || out.some((x) => norm(x) === norm(w))) continue;
      const sigla = /^[A-ZÀ-Ú]{2,}$/.test(w) && !/^\d/.test(w);
      const letraDigito = /^[A-Za-z]+\d+$/.test(w) || /^\d+[A-Za-z]+$/.test(w);
      const estranha = /[kwyKWY]/.test(w) && w.length > 2 && !COMUNS.has(norm(w)) && /^[A-Za-zÀ-ú]+$/.test(w);
      if ((sigla || letraDigito || estranha) && !/^(R|US)\$/.test(w) && !/^\d+[hº ª%]/.test(w) && !/^\d{1,2}h(\d{2})?$/.test(w) && !/^\d+(ºª)?$/.test(w)) out.push(w);
    }
  }
  return out.slice(0, 12);
}
