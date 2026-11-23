// Painel do Instagram (/admin/instagram): conta, automação, fila e prévias. Módulo: app/social (docs/instagram.md).
import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/instagram";
import { adminMeta, Button, Card, Field, inputCls, Notice, PageTitle, Pill, Stat, when } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { hasDatabase } from "~/lib/db.server";
import { SOCIAL } from "~/social/config";
import { conectar, desconectar, getConta, salvarConfig } from "~/social/server/conta.server";
import { chaveOk } from "~/social/server/cripto.server";
import { gerarDeNovo, imagensDe, listarFila, postarAgora, pular, repostar, resumo, tick } from "~/social/server/fila.server";
import { cota, perfil } from "~/social/server/instagram.server";
import { getToken } from "~/social/server/conta.server";

export const meta = () => adminMeta("Instagram");

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  if (!hasDatabase()) return { semBanco: true as const };
  const [conta, fila, r] = await Promise.all([getConta(), listarFila(30), resumo()]);
  let usoApi: string | null = null;
  const url = new URL(request.url);
  if (url.searchParams.get("testar") === "1" && conta.token_status === "ok" && conta.account_id) {
    try {
      const token = await getToken();
      const [p, c] = await Promise.all([perfil(token!), cota(conta.account_id, token!)]);
      usoApi = `Conexão ok: @${p.username}. Cota de publicação usada: ${c.uso}/${c.total}.`;
    } catch (e) {
      usoApi = `Falhou: ${String((e as Error)?.message ?? e).slice(0, 200)}`;
    }
  }
  const dias = conta.token_expires_at ? Math.floor((new Date(`${String(conta.token_expires_at).replace(" ", "T")}Z`).getTime() - Date.now()) / 86400_000) : null;
  return {
    semBanco: false as const,
    conta,
    resumo: r,
    chave: chaveOk(),
    dias,
    usoApi,
    msg: url.searchParams.get("ok"),
    erro: url.searchParams.get("erro"),
    fila: fila.map((l) => ({ id: l.id, post_id: l.post_id, title: l.title ?? "", model: l.model, status: l.status, origin: l.origin, created_at: l.created_at, published_at: l.published_at, permalink: l.permalink, error: l.error, attempts: l.attempts, caption: l.caption, imagens: imagensDe(l.images) })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const f = await request.formData();
  const intent = String(f.get("intent"));
  const id = Number(f.get("id"));
  const back = (q: string) => redirect(`/admin/instagram?${q}`);
  try {
    if (intent === "conectar") {
      const r = await conectar(String(f.get("token") ?? ""));
      return back(`ok=conectado-${encodeURIComponent(r.username)}`);
    }
    if (intent === "desconectar") return (await desconectar(), back("ok=desconectado"));
    if (intent === "salvar") {
      const num = (n: string, min: number, max: number, pad: number) => Math.max(min, Math.min(max, Math.round(Number(f.get(n)) || pad)));
      await salvarConfig({
        enabled: f.get("enabled") === "on",
        test_mode: f.get("test_mode") === "on",
        daily_limit: num("daily_limit", 1, 10, 4),
        min_gap_minutes: num("min_gap_minutes", 30, 720, 90),
        start_hour: num("start_hour", 0, 23, 9),
        end_hour: num("end_hour", 1, 24, 22),
        models: { N: f.get("m_N") === "on", C: f.get("m_C") === "on", P: f.get("m_P") === "on", S: f.get("m_S") === "on" },
      });
      return back("ok=salvo");
    }
    if (intent === "rodar") {
      void tick().catch(() => undefined);
      return back("ok=rodando");
    }
    if (intent === "postar") {
      // Em segundo plano (a CDN corta pedidos longos).
      void postarAgora(id).catch((e) => console.error(`[social] postar ${id}: ${String(e?.message ?? e).slice(0, 120)}`));
      return back("ok=enviando");
    }
    if (intent === "pular") return (await pular(id), back("ok=pulado"));
    if (intent === "novo") return (await gerarDeNovo(id), back("ok=novo"));
    if (intent === "repostar") return (await repostar(id), back("ok=repostar"));
  } catch (e) {
    return back(`erro=${encodeURIComponent(String((e as Error)?.message ?? e).slice(0, 200))}`);
  }
  return back("");
}

const MSG: Record<string, string> = {
  salvo: "Configurações salvas.",
  desconectado: "Conta desconectada.",
  rodando: "Fila rodando em segundo plano; recarregue em 1 minuto.",
  enviando: "Enviando em segundo plano; recarregue em 1 minuto.",
  pulado: "Post pulado.",
  novo: "Vai gerar a arte de novo no próximo ciclo.",
  repostar: "Voltou para a fila (cuidado: vai criar outro post no Instagram).",
};

const ESTADO: Record<string, string> = { pending: "na fila", preview: "prévia", sending: "enviando", published: "publicado", failed: "falhou", skipped: "pulado", expired: "expirou" };

export default function AdminInstagram({ loaderData: d }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  if (d.semBanco) return <><PageTitle>Instagram</PageTitle><Notice tone="warn">Precisa do banco de dados.</Notice></>;
  const { conta } = d;
  const estado = conta.token_status === "invalid" ? "TOKEN INVÁLIDO" : !conta.enabled && !conta.test_mode ? "DESLIGADO" : conta.test_mode ? "MODO DE TESTE" : "LIGADO";
  const msg = d.msg ? (d.msg.startsWith("conectado-") ? `Conectado: @${decodeURIComponent(d.msg.slice(10))}.` : MSG[d.msg]) : null;
  return (
    <>
      <PageTitle aside={<span className="border border-line-soft px-3 py-1 font-mono text-xs font-bold text-acc">{estado}</span>}>Instagram</PageTitle>
      {msg && <Notice>{msg}</Notice>}
      {d.erro && <Notice tone="warn">{decodeURIComponent(d.erro)}</Notice>}
      {d.usoApi && <Notice>{d.usoApi}</Notice>}
      {conta.token_status === "invalid" && <Notice tone="warn">O token do Instagram não vale mais. Gere outro e cole abaixo (passo a passo em docs/instagram.md).</Notice>}
      {conta.note && <Notice tone="warn">{conta.note}</Notice>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Hoje" value={`${d.resumo.hoje}/${conta.daily_limit}`} />
        <Stat label="Na fila" value={d.resumo.naFila} />
        <Stat label="Token" value={d.dias == null ? "—" : `${d.dias} dias`} tone={d.dias != null && d.dias < 10 ? "warn" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Conta">
          {!d.chave && <Notice tone="warn">Falta a variável SOCIAL_KEY no hPanel (64 caracteres hexadecimais). Sem ela o token não pode ser guardado.</Notice>}
          <p className="mt-2 text-sm text-body">{conta.username ? `Conectada: @${conta.username}` : `Nenhuma conta conectada (a conta do site é @${SOCIAL.handle}).`}</p>
          <Form method="post" className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="intent" value="conectar" />
            <Field label="Token de acesso do Instagram" hint="Gerado no app da Meta (nunca cole no chat). Fica criptografado.">
              <input name="token" type="password" autoComplete="off" className={inputCls} placeholder="IGAA…" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button tone="primary" disabled={busy || !d.chave}>Conectar</Button>
              <a href="/admin/instagram?testar=1" className="inline-flex min-h-10 items-center border border-line-soft px-4 font-mono text-xs font-bold uppercase hover:border-acc">Testar conexão</a>
            </div>
          </Form>
          {conta.hasToken && (
            <Form method="post" className="mt-3">
              <input type="hidden" name="intent" value="desconectar" />
              <Button tone="danger" disabled={busy}>Desconectar</Button>
            </Form>
          )}
        </Card>

        <Card title="Automação">
          <Form method="post" className="flex flex-col gap-3">
            <input type="hidden" name="intent" value="salvar" />
            <label className="flex items-center gap-3 text-paper">
              <input type="checkbox" name="enabled" defaultChecked={conta.enabled} className="h-5 w-5 accent-[var(--color-acc)]" />
              Ligado (posta sozinho quando uma matéria é publicada)
            </label>
            <label className="flex items-center gap-3 text-paper">
              <input type="checkbox" name="test_mode" defaultChecked={conta.test_mode} className="h-5 w-5 accent-[var(--color-acc)]" />
              Modo de teste (gera arte e legenda, mostra aqui e não envia)
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Posts por dia"><input name="daily_limit" type="number" min={1} max={10} defaultValue={conta.daily_limit} className={inputCls} /></Field>
              <Field label="Intervalo (min)"><input name="min_gap_minutes" type="number" min={30} max={720} defaultValue={conta.min_gap_minutes} className={inputCls} /></Field>
              <Field label="Começa às (h)"><input name="start_hour" type="number" min={0} max={23} defaultValue={conta.start_hour} className={inputCls} /></Field>
              <Field label="Termina às (h)"><input name="end_hour" type="number" min={1} max={24} defaultValue={conta.end_hour} className={inputCls} /></Field>
            </div>
            <fieldset className="flex flex-wrap gap-4">
              <legend className="mb-1 font-mono text-xs font-bold uppercase text-body">Modelos ligados</legend>
              {([["N", "Notícia (1 imagem)"], ["C", "Carrossel (artigos, reviews, guias)"], ["P", "Promoções"], ["S", "Lançamentos da semana"]] as const).map(([k, rot]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`m_${k}`} defaultChecked={conta.models[k] !== false} className="accent-[var(--color-acc)]" />
                  {rot}
                </label>
              ))}
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <Button tone="primary" disabled={busy}>Salvar</Button>
            </div>
          </Form>
          <Form method="post" className="mt-3">
            <input type="hidden" name="intent" value="rodar" />
            <Button disabled={busy}>Rodar a fila agora</Button>
          </Form>
        </Card>
      </div>

      <Card title="Fila (últimas 30)">
        {d.fila.length === 0 ? (
          <p className="text-sm text-muted">Nada na fila. Assim que uma matéria for publicada, ela aparece aqui.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {d.fila.map((l) => (
              <li key={l.id} className="flex flex-col gap-3 py-4">
                <div className="flex flex-wrap items-start gap-3">
                  {l.imagens[0] ? <img src={l.imagens[0]} alt="" width={64} height={80} className="h-20 w-16 shrink-0 border border-line object-cover" /> : <div className="h-20 w-16 shrink-0 border border-line bg-ink" />}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-bold text-paper">{l.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
                      <Pill status={l.status === "published" ? "ok" : l.status === "failed" ? "failed" : l.status === "preview" ? "draft" : "new"} />
                      <span>{ESTADO[l.status] ?? l.status}</span>
                      <span>· {l.model}</span>
                      <span>· {when(l.published_at ?? l.created_at)}</span>
                      {l.attempts > 0 && <span>· {l.attempts} tentativa(s)</span>}
                    </p>
                    {l.error && <p className="mt-1 line-clamp-1 text-xs text-warn" title={l.error}>{l.error}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["pending", "preview", "failed", "skipped"].includes(l.status) && (
                      <Form method="post"><input type="hidden" name="intent" value="postar" /><input type="hidden" name="id" value={l.id} /><Button tone="primary" disabled={busy}>Postar agora</Button></Form>
                    )}
                    {l.status !== "published" && l.status !== "skipped" && (
                      <Form method="post"><input type="hidden" name="intent" value="pular" /><input type="hidden" name="id" value={l.id} /><Button disabled={busy}>Pular</Button></Form>
                    )}
                    {l.status !== "published" && (
                      <Form method="post"><input type="hidden" name="intent" value="novo" /><input type="hidden" name="id" value={l.id} /><Button disabled={busy}>Gerar de novo</Button></Form>
                    )}
                    {l.status === "published" && (
                      <Form method="post" onSubmit={(e) => { if (!confirm("Já está no Instagram; postar de novo cria outro post. Continuar?")) e.preventDefault(); }}>
                        <input type="hidden" name="intent" value="repostar" /><input type="hidden" name="id" value={l.id} /><Button disabled={busy}>Repostar</Button>
                      </Form>
                    )}
                    {l.permalink && <a href={l.permalink} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center px-2 font-mono text-xs font-bold text-acc underline">Abrir no Instagram</a>}
                  </div>
                </div>
                {l.imagens.length > 0 && (
                  <details>
                    <summary className="cursor-pointer font-mono text-xs font-bold text-acc">VER {l.imagens.length} SLIDE(S) E A LEGENDA</summary>
                    <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                      {l.imagens.map((src) => <img key={src} src={src} alt="" width={216} height={270} className="h-[270px] w-[216px] shrink-0 border border-line object-cover" loading="lazy" />)}
                    </div>
                    {l.caption && <pre className="mt-2 whitespace-pre-wrap border border-line bg-ink p-3 text-xs text-body">{l.caption}</pre>}
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
