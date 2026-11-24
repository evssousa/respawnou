// Cliente da API oficial do Instagram (Instagram API com login do Instagram; grátis). Nunca loga o token.
// Fluxo: contêiner de mídia → esperar FINISHED → media_publish → permalink. Carrossel: 1 contêiner por slide + 1 do carrossel.
// Dois caminhos oficiais, mesma API de publicação:
//  - login do Instagram: token que começa com "IG" → graph.instagram.com (não precisa de Página do Facebook);
//  - login do Facebook: token da Página ou do usuário ("EAA…") → graph.facebook.com (a conta profissional precisa estar ligada a uma Página).
const API = "https://graph.instagram.com/v23.0";
const FB = "https://graph.facebook.com/v23.0";
export const tokenDoInstagram = (token: string) => token.startsWith("IG");
const baseDe = (token: string) => (tokenDoInstagram(token) ? API : FB);

export class ErroInstagram extends Error {
  constructor(
    message: string,
    public codigo: number | null,
    public subcodigo: number | null,
    public http: number,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined>;

async function chamar<T>(caminho: string, token: string, opts: { metodo?: "GET" | "POST"; params?: Params; base?: string } = {}): Promise<T> {
  const metodo = opts.metodo ?? "GET";
  const corpo = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.params ?? {})) if (v !== undefined) corpo.set(k, String(v));
  const url = `${opts.base ?? baseDe(token)}${caminho}${metodo === "GET" && corpo.size ? `?${corpo}` : ""}`;
  const res = await fetch(url, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(metodo === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: metodo === "POST" ? corpo : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const texto = await res.text();
  let json: { error?: { message?: string; code?: number; error_subcode?: number } } & Record<string, unknown> = {};
  try {
    json = JSON.parse(texto);
  } catch {
    /* resposta sem JSON */
  }
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    throw new ErroInstagram((e.message ?? texto.slice(0, 200)).slice(0, 300), e.code ?? null, e.error_subcode ?? null, res.status);
  }
  return json as T;
}

/** Conta do Instagram a que o token dá acesso: { id, username, tokenFinal }. No login do Facebook, descobre a Página ligada à conta. */
export async function perfil(token: string): Promise<{ user_id: string; username: string; tokenFinal: string }> {
  if (tokenDoInstagram(token)) {
    const r = await chamar<{ user_id: string; username: string }>("/me", token, { params: { fields: "user_id,username" } });
    return { ...r, tokenFinal: token };
  }
  // Token de Página: /me já traz a conta do Instagram ligada.
  try {
    const r = await chamar<{ instagram_business_account?: { id: string; username: string } }>("/me", token, { params: { fields: "instagram_business_account{id,username}" } });
    if (r.instagram_business_account) return { user_id: r.instagram_business_account.id, username: r.instagram_business_account.username, tokenFinal: token };
  } catch {
    /* não é token de Página: tenta como token de usuário */
  }
  // Token de usuário: procura a Página com conta do Instagram e guarda o token dela (não vence, se vier de um token de usuário de longa duração).
  const r = await chamar<{ data: { name: string; access_token: string; instagram_business_account?: { id: string; username: string } }[] }>("/me/accounts", token, {
    params: { fields: "name,access_token,instagram_business_account{id,username}" },
  });
  const pagina = r.data.find((p) => p.instagram_business_account);
  if (!pagina) {
    // Diz o motivo: quais permissões o token tem e quais Páginas a Meta devolveu (só nomes, nunca tokens).
    let permissoes = "";
    try {
      const perm = await chamar<{ data: { permission: string; status: string }[] }>("/me/permissions", token);
      const ok = perm.data.filter((x) => x.status === "granted").map((x) => x.permission);
      const faltam = ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement"].filter((x) => !ok.includes(x));
      permissoes = faltam.length ? ` Permissões que faltam no token: ${faltam.join(", ")}.` : " Permissões do token: ok.";
    } catch {
      /* sem detalhe de permissões */
    }
    const motivo = r.data.length
      ? `A Meta devolveu ${r.data.length} Página(s) (${r.data.map((p) => p.name).join(", ")}), mas nenhuma tem conta profissional do Instagram ligada: ligue o Instagram à Página (Página → Configurações → Contas vinculadas → Instagram).`
      : "A Meta não devolveu nenhuma Página para este token: na janela de autorização marque a Página do Respawnou, ou, se a Página pertence a um portfólio empresarial, inclua também a permissão business_management.";
    throw new ErroInstagram(`${motivo}${permissoes}`, null, null, 200);
  }
  return { user_id: pagina.instagram_business_account!.id, username: pagina.instagram_business_account!.username, tokenFinal: pagina.access_token };
}

export async function cota(id: string, token: string) {
  const r = await chamar<{ data: { quota_usage: number; config?: { quota_total: number } }[] }>(`/${id}/content_publishing_limit`, token, { params: { fields: "quota_usage,config" } });
  return { uso: r.data?.[0]?.quota_usage ?? 0, total: r.data?.[0]?.config?.quota_total ?? 100 };
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Espera o contêiner ficar FINISHED (a cada 3 s, até 20 vezes; vídeo demora mais: a cada 5 s, até 72 vezes = 6 min). */
async function esperar(idContainer: string, token: string, tentativas = 20, intervaloMs = 3000) {
  for (let i = 0; i < tentativas; i++) {
    const r = await chamar<{ status_code?: string }>(`/${idContainer}`, token, { params: { fields: "status_code" } });
    if (r.status_code === "FINISHED") return;
    if (r.status_code === "ERROR" || r.status_code === "EXPIRED") throw new ErroInstagram(`contêiner ${r.status_code}`, null, null, 200);
    await dormir(intervaloMs);
  }
  throw new ErroInstagram("tempo esgotado esperando o Instagram processar a mídia", null, null, 200);
}

export async function containerStatus(idContainer: string, token: string) {
  return (await chamar<{ status_code?: string }>(`/${idContainer}`, token, { params: { fields: "status_code" } })).status_code ?? "";
}

export const permalink = async (mediaId: string, token: string) => (await chamar<{ permalink?: string }>(`/${mediaId}`, token, { params: { fields: "permalink" } })).permalink ?? null;

/** Publica 1 imagem (ou um carrossel de 2 a 10). `aoCriarContainer` grava o id antes do media_publish (contra post duplicado). */
export async function publicar(opts: { contaId: string; token: string; imagens: string[]; legenda: string; aoCriarContainer?: (id: string) => Promise<void> }) {
  const { contaId, token, imagens, legenda } = opts;
  let container: string;
  if (imagens.length === 1) {
    const r = await chamar<{ id: string }>(`/${contaId}/media`, token, { metodo: "POST", params: { image_url: imagens[0], caption: legenda } });
    container = r.id;
  } else {
    const filhos: string[] = [];
    for (const url of imagens) {
      const r = await chamar<{ id: string }>(`/${contaId}/media`, token, { metodo: "POST", params: { image_url: url, is_carousel_item: true } });
      filhos.push(r.id);
    }
    for (const f of filhos) await esperar(f, token);
    const r = await chamar<{ id: string }>(`/${contaId}/media`, token, { metodo: "POST", params: { media_type: "CAROUSEL", children: filhos.join(","), caption: legenda } });
    container = r.id;
  }
  await opts.aoCriarContainer?.(container);
  await esperar(container, token);
  const pub = await chamar<{ id: string }>(`/${contaId}/media_publish`, token, { metodo: "POST", params: { creation_id: container } });
  return { containerId: container, mediaId: pub.id, link: await permalink(pub.id, token).catch(() => null) };
}

/** Publica 1 Story (imagem 9:16, sem legenda). Mesmo caminho do post: contêiner → FINISHED → media_publish. */
export async function publicarStory(opts: { contaId: string; token: string; imagem: string; aoCriarContainer?: (id: string) => Promise<void> }) {
  const { contaId, token } = opts;
  const r = await chamar<{ id: string }>(`/${contaId}/media`, token, { metodo: "POST", params: { media_type: "STORIES", image_url: opts.imagem } });
  await opts.aoCriarContainer?.(r.id);
  await esperar(r.id, token);
  const pub = await chamar<{ id: string }>(`/${contaId}/media_publish`, token, { metodo: "POST", params: { creation_id: r.id } });
  return { containerId: r.id, mediaId: pub.id, link: null as string | null };
}

/** Publica 1 Reel (vídeo 9:16 em MP4/H.264 numa URL pública). Contêiner → FINISHED (o vídeo demora para processar) → media_publish. */
export async function publicarReel(opts: { contaId: string; token: string; videoUrl: string; legenda: string; capaUrl?: string; aoCriarContainer?: (id: string) => Promise<void> }) {
  const { contaId, token } = opts;
  const r = await chamar<{ id: string }>(`/${contaId}/media`, token, {
    metodo: "POST",
    params: { media_type: "REELS", video_url: opts.videoUrl, caption: opts.legenda, share_to_feed: true, cover_url: opts.capaUrl },
  });
  await opts.aoCriarContainer?.(r.id);
  await esperar(r.id, token, 72, 5000);
  const pub = await chamar<{ id: string }>(`/${contaId}/media_publish`, token, { metodo: "POST", params: { creation_id: r.id } });
  return { containerId: r.id, mediaId: pub.id, link: await permalink(pub.id, token).catch(() => null) };
}

export const METRICAS_REEL = ["views", "reach", "likes", "comments", "shares", "saved", "total_interactions", "ig_reels_avg_watch_time", "ig_reels_video_view_total_time"];

/** Estatísticas de uma mídia (Reel). Métrica que a API não aceita (código 100) é tirada e tenta uma vez de novo. Devolve nome → número. */
export async function insightsMidia(mediaId: string, token: string, metricas: string[] = METRICAS_REEL): Promise<Record<string, number>> {
  type Resp = { data?: { name: string; values?: { value?: number }[]; total_value?: { value?: number } }[] };
  const ler = (r: Resp) => {
    const out: Record<string, number> = {};
    for (const m of r.data ?? []) {
      const v = m.total_value?.value ?? m.values?.[0]?.value;
      if (typeof v === "number") out[m.name] = v;
    }
    return out;
  };
  try {
    return ler(await chamar<Resp>(`/${mediaId}/insights`, token, { params: { metric: metricas.join(",") } }));
  } catch (e) {
    if (e instanceof ErroInstagram && e.codigo === 100) {
      const citadas = metricas.filter((m) => e.message.includes(m));
      const resto = metricas.filter((m) => !citadas.includes(m));
      if (citadas.length && resto.length) return ler(await chamar<Resp>(`/${mediaId}/insights`, token, { params: { metric: resto.join(",") } }));
    }
    throw e;
  }
}

/** Plano B sem permissão de estatísticas: só curtidas e comentários. */
export async function contagensMidia(mediaId: string, token: string): Promise<{ likes: number | null; comments: number | null }> {
  const r = await chamar<{ like_count?: number; comments_count?: number }>(`/${mediaId}`, token, { params: { fields: "like_count,comments_count" } });
  return { likes: r.like_count ?? null, comments: r.comments_count ?? null };
}

/** Erro de permissão (códigos 10 e 200 da Meta). */
export const semPermissao = (e: unknown) => e instanceof ErroInstagram && (e.codigo === 10 || e.codigo === 200 || e.subcodigo === 2108006);

/** Últimas mídias (para achar um post que já foi publicado quando o processo caiu no meio). */
export const ultimasMidias = (token: string) => chamar<{ data: { id: string; caption?: string; permalink?: string }[] }>("/me/media", token, { params: { fields: "id,caption,permalink,timestamp", limit: 5 } });

/** Renova o token de longa duração (vale mais 60 dias). */
export async function renovar(token: string) {
  const r = await chamar<{ access_token: string; expires_in: number }>("/refresh_access_token", token, { base: "https://graph.instagram.com", params: { grant_type: "ig_refresh_token", access_token: token } });
  return { token: r.access_token, expiraEmSeg: r.expires_in };
}

/** Classifica o erro para a fila: o que fazer depois. */
export function classificar(e: unknown): { acao: "token" | "limite" | "pausa" | "bloqueio" | "tentar" | "falhar"; atrasoMin?: number } {
  if (!(e instanceof ErroInstagram)) return { acao: "tentar" };
  const c = e.codigo;
  if (c === 190) return { acao: "token" };
  if (c === 368) return { acao: "bloqueio" };
  if (c !== null && [4, 17, 32, 613].includes(c)) return { acao: "limite", atrasoMin: 60 };
  if (c === 9 || e.subcodigo === 2207042) return { acao: "pausa" };
  if (e.subcodigo !== null && [2207004, 2207005, 2207009, 2207023, 2207026].includes(e.subcodigo)) return { acao: "falhar" };
  return { acao: "tentar" };
}
