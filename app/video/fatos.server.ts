// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Monta os fatos do vídeo (cartões de dados) a partir da matéria lida do banco. Só no servidor.
import { MARCA } from "~/marca";
import type { EntradaSocial } from "~/social/tipos";
import type { FatosVideo } from "./cartoes";

const DIAS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
/** Dia da semana e ano de "AAAA-MM-DD" (meio-dia em Brasília: sem virar o dia por fuso). */
function diaEAno(iso?: string | null): { diaSemana: string; ano: number } | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return { diaSemana: DIAS[d.getUTCDay()], ano: Number(m[1]) };
}

export function fatosDe(e: EntradaSocial): FatosVideo {
  const curta = MARCA.social.plataformaCurta;
  const plataformas = [...new Set(e.plataformas.map((p) => curta[p.toLowerCase()]).filter(Boolean))];
  const f: FatosVideo = {
    jogo: e.jogoNome ?? e.gratis?.nome ?? null,
    preco: e.precoBrl && /\d/.test(e.precoBrl) ? e.precoBrl : null,
    lancamento: e.lancamento ? { data: e.lancamento, ...(diaEAno(e.lancamentoIso) ?? {}) } : null,
    plataformas,
  };
  if (e.review) f.nota = { valor: e.review.score, veiculos: e.review.critics.length, veredito: e.review.verdict };
  if (e.requisitos?.length) f.requisitos = e.requisitos.map((r) => ({ rotulo: r.rotulo, minimo: r.minimo }));
  if (e.gratis) f.gratis = [{ nome: e.gratis.nome, loja: e.gratis.loja, ate: e.gratis.ate, precoNormal: e.gratis.precoNormal, arte: e.gratis.arte }];
  if (e.semana) f.dias = e.semana.dias.map((d) => ({ rotulo: d.rotulo, data: d.data, jogos: d.jogos.map((j) => j.nome) }));
  return f;
}
