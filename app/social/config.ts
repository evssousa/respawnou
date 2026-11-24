// Configuração do módulo social: DERIVA de app/marca.ts (o único arquivo que muda de um site para outro). Mantém os nomes
// exportados de sempre (SOCIAL, COR, FONTES, FONTES_ARQUIVOS, TITULO) para não mexer nos imports. Dados puros: nada de banco aqui.
import { MARCA } from "../marca";

export const SOCIAL = {
  site: MARCA.site,
  marca: MARCA.marca,
  handle: MARCA.handle,
  dominio: MARCA.dominio,
  baseUrl: MARCA.baseUrl,
  logo: MARCA.logo,
  ...MARCA.social,
  rotuloSecao: Object.fromEntries(Object.entries(MARCA.secoes).map(([id, s]) => [id, s.rotulo])) as Record<string, string>,
};

export const FONTES = { titulo: MARCA.fontes.titulo, corpo: MARCA.fontes.corpo, mono: MARCA.fontes.mono };
export const FONTES_ARQUIVOS = MARCA.fontes.arquivosSatori;
export const TITULO = MARCA.titulo;

/** Cores da arte (iguais a app/app.css; o site só tem tema escuro). */
export const COR = MARCA.cores;
