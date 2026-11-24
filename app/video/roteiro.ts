// Tipos e contas do roteiro (puro: vale no navegador e no servidor).
import { MARCA } from "../marca";
import { type ItemPronuncia, montarFala } from "../../scripts/video/falar";
import type { TipoCartao } from "./cartoes";
import { VIDEO } from "./config";

export interface Imagem {
  src: string;
  alt: string;
}
export interface CenaRoteiro {
  fala: string;
  imagem: number;
  /** Cartão de dados que aparece nesta cena (etapa 8); só um tipo disponível para a matéria. */
  cartao?: TipoCartao | null;
  /** Nas séries: número do item da lista de DADOS a que a cena se refere. */
  item?: number | null;
}
export interface Roteiro {
  /** 2 = formato novo (ganchos, pergunta, destaques, cartões). Roteiros antigos não têm. */
  v?: 2;
  /** O gancho ESCOLHIDO (é o que a voz fala e o cartão de abertura mostra). */
  gancho: string;
  /** Até 3 opções do Gemini (o dono escolhe no painel). */
  ganchos?: string[];
  /** Pergunta do fechamento, até 80 caracteres. */
  pergunta?: string | null;
  usarPergunta?: boolean;
  /** Até 6 termos para destacar na legenda (etapa 7). */
  destaques?: string[];
  cenas: CenaRoteiro[];
  titulo_curto: string;
}

export const contarPalavras = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
export const palavrasDoRoteiro = (r: Roteiro) => contarPalavras(r.gancho) + r.cenas.reduce((a, c) => a + contarPalavras(c.fala), 0);

/** Pergunta que vale para o fechamento (só se o dono deixou ligada e ela existe). */
export const perguntaDoFechamento = (r: Roteiro): string | null => (r.usarPergunta && r.pergunta ? r.pergunta.trim() : null);

/** Fechamento falado: com pergunta, "<pergunta> Responde aí nos comentários. Matéria completa no link do perfil."; sem, o fixo. */
export const fechamentoFinal = (r: Roteiro) => {
  const p = perguntaDoFechamento(r);
  return p ? `${p} ${VIDEO.fechamentoPergunta}` : VIDEO.fechamento;
};

/** Partes do roteiro na ordem falada: gancho, cenas e fechamento (texto da TELA). */
export const partesDoRoteiro = (r: Roteiro) => [r.gancho, ...r.cenas.map((c) => c.fala), fechamentoFinal(r)];

/** Texto que vai para a ElevenLabs: o da tela convertido (números por extenso, siglas pelo dicionário, pausas antes de números). */
export const textoFalado = (r: Roteiro, dic: ItemPronuncia[] = [], pausa = 0) => montarFala(partesDoRoteiro(r), dic, pausa).falado;
/** Caracteres que custam crédito (do texto FALADO, com o dicionário e as pausas dados). */
export const caracteresDoRoteiro = (r: Roteiro, dic: ItemPronuncia[] = MARCA.video.pronunciaBase, pausa = VIDEO.voz.pausaAntesNumero) => textoFalado(r, dic, pausa).length;
