// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Nota da crítica: formatação e cor (usada na arte do carrossel e nos cartões de dados do vídeo). Puro.
import { COR } from "../config";

export const dec = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Verde-limão a partir de 7,5; âmbar a partir de 5,5; vermelho abaixo. */
export const corNota = (n: number) => (n >= 7.5 ? COR.destaque : n >= 5.5 ? COR.alerta : COR.ruim);
