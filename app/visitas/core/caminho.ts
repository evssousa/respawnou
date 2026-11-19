// Endereço da página: valida o que o navegador mandou e classifica o tipo pela configuração do site. Puro.
export type TipoPagina = { tipo: string; rotulo: string; re: RegExp };

/**
 * Valida o endereço (location.pathname): começa com "/", até 255 caracteres, só ASCII imprimível, sem query nem "#",
 * fora de /admin e /api. Tira a barra do fim (menos em "/"). Devolve null se não serve.
 */
export function normalizar(p: unknown): string | null {
  if (typeof p !== "string" || p.length === 0 || p.length > 255 || p[0] !== "/") return null;
  if (!/^[\x21-\x7e]+$/.test(p) || /[?#]/.test(p)) return null;
  const limpo = p.length > 1 ? p.replace(/\/+$/, "") || "/" : p;
  if (/^\/(admin|api)(\/|$)/i.test(limpo)) return null;
  return limpo;
}

/** O primeiro tipo cuja expressão bate com o endereço vence; sem nenhum, "outra". */
export function classificar(caminho: string, tipos: TipoPagina[]): string {
  return tipos.find((t) => t.re.test(caminho))?.tipo ?? "outra";
}
