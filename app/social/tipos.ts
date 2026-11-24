// Tipos do módulo de posts sociais (docs/instagram.md). Genérico: copia igual para os outros sites.
import type { Block } from "~/lib/types";

/** Modelo de arte: N notícia · C-* carrossel · P1 jogo grátis · P2 ofertas da semana · S lançamentos da semana. */
export type Modelo = "N" | "C-artigo" | "C-review" | "C-guia" | "P1" | "P2" | "S";

export interface Ponto {
  titulo: string;
  texto: string;
  /** Imagem local (/media/...) ou absoluta do trecho, se houver. */
  imagem?: string | null;
}

export interface LinhaSemana {
  /** "SEG", "TER"... ou "FIM DE SEMANA". */
  rotulo: string;
  /** "24/11" (ou "29–30/11"). */
  data: string;
  jogos: { nome: string; arte?: string | null; destaque?: boolean }[];
}

export interface Oferta {
  nome: string;
  imagem?: string | null;
  preco: string;
  precoAntes?: string | null;
  desconto: number;
}

export interface ReviewSocial {
  score: number;
  verdict: string;
  pros: string[];
  cons: string[];
  critics: { outlet: string; score: number }[];
}

export interface Requisitos {
  rotulo: string;
  minimo: string;
  recomendado: string;
}

/** Tudo o que os modelos precisam de uma matéria, já lido do banco (site.server.ts). */
export interface EntradaSocial {
  postId: number;
  section: string;
  slug: string;
  titulo: string;
  excerpt: string;
  metaDescription: string | null;
  focusKeyword: string | null;
  tags: string[];
  plataformas: string[];
  tag: string | null;
  /** Capa (local /media/... ou absoluta) e crédito. */
  capa: { src: string; credito: string | null } | null;
  corpo: Block[];
  review?: ReviewSocial;
  /** Guia de requisitos: linhas lidas da ficha do jogo (SO, processador, memória, placa de vídeo, armazenamento). */
  requisitos?: Requisitos[];
  jogoNome?: string | null;
  lancamento?: string | null;
  /** Data de lançamento completa (AAAA-MM-DD), para o cartão do vídeo. */
  lancamentoIso?: string | null;
  precoBrl?: string | null;
  /** Jogo grátis (P1). */
  gratis?: { nome: string; loja: string; precoNormal: string | null; ate: string; arte: string | null };
  /** Lançamentos da semana (S). */
  semana?: { titulo: string; periodo: string; total: number; dias: LinhaSemana[] };
  /** Ofertas da semana (P2). */
  ofertas?: { dia: string; total: number; itens: Oferta[] };
  /** Pontos já extraídos (carrossel de artigo). */
  pontos?: Ponto[];
}

export interface ConfigLimites {
  limiteDia: number;
  intervaloMin: number;
  inicioHora: number;
  fimHora: number;
}

/** Foco do recorte de uma imagem própria: "auto" deixa o sharp achar a parte mais chamativa. */
export type Foco = "auto" | "centre" | "north" | "south" | "west" | "east" | `${number},${number}`;
export interface ImagemPropria {
  src: string;
  foco?: Foco;
}
/** Escolhas do dono para um item da fila (frente C). */
export interface Overrides {
  /** Troca por número do slide (1 = capa do post). */
  trocas?: Record<string, ImagemPropria>;
  /** Alinhamento manual ("x,y" em %) ou foco da imagem ORIGINAL de um slide que não foi trocada. */
  focos?: Record<string, Foco>;
  /** Slides de foto acrescentados, na ordem. */
  extras?: (ImagemPropria & { legenda?: string })[];
}
