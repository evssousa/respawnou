// Imagens próprias nos slides (docs/instagram-stories-videos.md, frente C). Funções puras: sanitizam o JSON vindo do banco/painel
// e dizem quais slides aceitam troca e quantos slides extras cabem (o Instagram aceita no máximo 10 por carrossel).
import type { Foco, ImagemPropria, Modelo, Overrides } from "../tipos";

export const FOCOS: Foco[] = ["auto", "centre", "north", "south", "west", "east"];
export const ROTULO_FOCO: Record<Foco, string> = { auto: "Automático", centre: "Centro", north: "Topo", south: "Base", west: "Esquerda", east: "Direita" };
export const MAX_SLIDES = 10;
export const MAX_LEGENDA = 140;
const SRC = /^\/media\/social\/uploads\/\d{4}\/\d{2}\/[\w.-]+\.jpg$/;

const MANUAL = /^(\d{1,3}),(\d{1,3})$/;

/** Alinhamento manual: "x,y" em porcentagem (0 = esquerda/topo, 100 = direita/base). */
export const ehFocoManual = (v: unknown): v is `${number},${number}` => typeof v === "string" && MANUAL.test(v);

/** Foco válido: um da lista ou "x,y" (cortado em 0–100). Qualquer outra coisa vira "auto". */
export function foco(v: unknown): Foco {
  if (FOCOS.includes(v as Foco)) return v as Foco;
  const m = typeof v === "string" ? MANUAL.exec(v) : null;
  if (m) return `${Math.min(100, Number(m[1]))},${Math.min(100, Number(m[2]))}` as Foco;
  return "auto";
}

/** Proporção (largura/altura) em que a imagem do slide aparece na arte: serve para mostrar o enquadramento certo no painel. */
export function aspectoDoSlot(modelo: Modelo, slide: number): number {
  if (modelo === "N") return 1080 / 760;
  if (modelo === "P1") return 948 / 476;
  if (modelo === "C-artigo") return slide === 1 ? 952 / 536 : 952 / 600;
  return 952 / 536;
}

function propria(v: unknown): ImagemPropria | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const src = typeof o.src === "string" ? o.src : "";
  if (!SRC.test(src) || src.includes("..")) return null;
  return { src, foco: foco(o.foco) };
}

/** Slides que têm uma imagem principal e aceitam troca. P2 e S (muitas miniaturas) não têm. */
export function slotsDoModelo(modelo: Modelo, pontos: { titulo: string }[] = []): { slide: number; rotulo: string }[] {
  if (modelo === "P2" || modelo === "S") return [];
  const out = [{ slide: 1, rotulo: "SLIDE 1 · CAPA" }];
  if (modelo === "C-artigo") pontos.forEach((p, i) => out.push({ slide: i + 2, rotulo: `SLIDE ${i + 2} · PONTO: ${p.titulo.slice(0, 40)}` }));
  return out;
}

/** Quantos slides o modelo gera sem extras (o carrossel já conta o slide final de chamada). */
export function slidesBase(modelo: Modelo, nPontos: number): number {
  if (modelo === "C-artigo") return nPontos + 2;
  if (modelo === "C-review") return 3;
  return 1;
}

export const maxExtras = (modelo: Modelo, nPontos: number) => Math.max(0, MAX_SLIDES - slidesBase(modelo, nPontos));

/** Lê e limpa o JSON: só endereços de upload válidos, focos da lista, slides dentro dos slots e extras dentro do máximo. */
export function lerOverrides(json: unknown, modelo?: Modelo, pontos: { titulo: string }[] = []): Overrides {
  let v: unknown = json;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return {};
    }
  }
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const slots = modelo ? new Set(slotsDoModelo(modelo, pontos).map((s) => String(s.slide))) : null;
  const trocas: Record<string, ImagemPropria> = {};
  if (o.trocas && typeof o.trocas === "object") {
    for (const [k, val] of Object.entries(o.trocas as Record<string, unknown>)) {
      if (!/^\d{1,2}$/.test(k) || (slots && !slots.has(k))) continue;
      const p = propria(val);
      if (p) trocas[k] = p;
    }
  }
  const focos: Record<string, Foco> = {};
  if (o.focos && typeof o.focos === "object") {
    for (const [k, val] of Object.entries(o.focos as Record<string, unknown>)) {
      if (!/^\d{1,2}$/.test(k) || (slots && !slots.has(k))) continue;
      const f = foco(val);
      if (f !== "auto") focos[k] = f;
    }
  }
  const limite = modelo ? maxExtras(modelo, pontos.length) : MAX_SLIDES - 1;
  const extras: NonNullable<Overrides["extras"]> = [];
  if (Array.isArray(o.extras)) {
    for (const val of o.extras) {
      if (extras.length >= limite) break;
      const p = propria(val);
      if (!p) continue;
      const leg = typeof (val as Record<string, unknown>).legenda === "string" ? ((val as Record<string, unknown>).legenda as string).trim().slice(0, MAX_LEGENDA) : "";
      extras.push({ ...p, ...(leg ? { legenda: leg } : {}) });
    }
  }
  const out: Overrides = {};
  if (Object.keys(trocas).length) out.trocas = trocas;
  if (Object.keys(focos).length) out.focos = focos;
  if (extras.length) out.extras = extras;
  return out;
}

/** Resumo para o painel: "2 trocadas · 1 extra". */
export function resumoOverrides(ov: Overrides): string {
  const t = Object.keys(ov.trocas ?? {}).length + Object.keys(ov.focos ?? {}).length;
  const x = ov.extras?.length ?? 0;
  return [t ? `${t} ajustada${t > 1 ? "s" : ""}` : "", x ? `${x} extra${x > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
}
