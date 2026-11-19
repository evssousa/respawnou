// Cache em memória dos títulos do painel (10 min), para trocar de período sem repetir as mesmas consultas.
const guardado = new Map<string, { ate: number; valor: Map<string, string> }>();
const TTL_MS = 10 * 60_000;

export async function cachedTitulos(chave: string, buscar: () => Promise<Map<string, string>>): Promise<Map<string, string>> {
  const agora = Date.now();
  const achado = guardado.get(chave);
  if (achado && achado.ate > agora) return achado.valor;
  const valor = await buscar();
  if (guardado.size > 200) guardado.clear();
  guardado.set(chave, { ate: agora + TTL_MS, valor });
  return valor;
}
