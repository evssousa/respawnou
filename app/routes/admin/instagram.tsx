// Painel do Instagram (/admin/instagram): conta, automação, fila e prévias. Módulo: app/social (docs/instagram.md).
import { useEffect, useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/instagram";
import { adminMeta, Button, Card, Field, inputCls, Notice, PageTitle, Pill, Stat, when } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { hasDatabase } from "~/lib/db.server";
import { SOCIAL } from "~/social/config";
import { conectar, desconectar, getConta, salvarConfig, salvarConfigStory } from "~/social/server/conta.server";
import { chaveOk } from "~/social/server/cripto.server";
import { extrairPontos } from "~/social/core/pontos";
import { montarLegenda } from "~/social/core/legenda";
import { lerEntrada, urlDaMateria } from "~/social/site.server";
import type { Modelo } from "~/social/tipos";
import { enfileirarRecentes, gerarDeNovo, imagensDe, listarFila, listarPostados, marcarPostadoAMao, postarAgora, pular, repostar, resumo, tick, tirarDosPostados, zerarFila } from "~/social/server/fila.server";
import { cota, perfil } from "~/social/server/instagram.server";
import { getToken } from "~/social/server/conta.server";

export const meta = () => adminMeta("Instagram");

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  if (!hasDatabase()) return { semBanco: true as const };
  const aba = new URL(request.url).searchParams.get("aba") === "stories" ? ("stories" as const) : ("feed" as const);
  const kind = aba === "stories" ? ("story" as const) : ("feed" as const);
  const [conta, fila0, postados, r] = await Promise.all([getConta(), listarFila(30, kind), listarPostados(50, kind), resumo()]);
  // Para cada item: legenda (calculada na hora se a arte ainda não foi gerada), categoria da matéria e quantos slides terá.
  const fila = await Promise.all(
    fila0.map(async (l) => {
      let caption = l.caption;
      let categoria = "";
      let slides = imagensDe(l.images).length;
      let link = "";
      try {
        const e = await lerEntrada(l.post_id);
        if (e) {
          link = `${urlDaMateria(e)}?${SOCIAL.utm.replace("social", "story")}`;
          if (!caption && kind === "feed") caption = montarLegenda(e, l.model as Modelo);
          categoria = [SOCIAL.rotuloSecao[e.section] ?? e.section, e.tag].filter(Boolean).join(" · ");
          if (!slides) slides = l.model === "C-artigo" ? extrairPontos(e.corpo).length + 2 : l.model === "C-review" ? 3 : 1;
        }
      } catch {
        /* sem os extras: o item continua aparecendo */
      }
      return { ...l, caption, categoria, slides, link };
    }),
  );
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
    aba,
    conta,
    resumo: r,
    chave: chaveOk(),
    dias,
    usoApi,
    msg: url.searchParams.get("ok"),
    erro: url.searchParams.get("erro"),
    postados: postados.map((l) => ({ id: l.id, post_id: l.post_id, title: l.title ?? "", model: l.model, published_at: l.published_at, permalink: l.permalink, imagem: imagensDe(l.images)[0] ?? null })),
    fila: fila.map((l) => ({ id: l.id, post_id: l.post_id, title: l.title ?? "", model: l.model, status: l.status, origin: l.origin, created_at: l.created_at, published_at: l.published_at, permalink: l.permalink, error: l.error, attempts: l.attempts, caption: l.caption, categoria: l.categoria, slides: l.slides, link: l.link, expires_at: l.expires_at ?? null, imagens: imagensDe(l.images) })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const f = await request.formData();
  const intent = String(f.get("intent"));
  const id = Number(f.get("id"));
  const back = (q: string) => redirect(`/admin/instagram?${q}${f.get("aba") === "stories" ? "&aba=stories" : ""}`);
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
    if (intent === "salvar_story") {
      const num = (n: string, min: number, max: number, pad: number) => Math.max(min, Math.min(max, Math.round(Number(f.get(n)) || pad)));
      await salvarConfigStory({ enabled: f.get("story_enabled") === "on", daily_limit: num("story_daily_limit", 1, 15, 6), min_gap_minutes: num("story_min_gap_minutes", 15, 360, 45) });
      return back("ok=salvo");
    }
    if (intent === "manual") return (await marcarPostadoAMao(id), back("ok=manual"));
    if (intent === "rodar") {
      // Espera até 25 s para dizer o que aconteceu (a CDN corta pedidos longos; o que passar disso segue em segundo plano).
      const andamento = tick();
      const r = await Promise.race([andamento, new Promise<{ acao: string }>((ok) => setTimeout(() => ok({ acao: "ainda trabalhando; recarregue em 1 minuto" }), 25_000))]);
      andamento.catch(() => undefined);
      return back(`ok=rodou-${encodeURIComponent(r.acao)}`);
    }
    if (intent === "recentes") {
      const n = await enfileirarRecentes(30);
      return back(`ok=recentes-${n}`);
    }
    if (intent === "zerar") {
      const n = await zerarFila(f.get("aba") === "stories" ? "story" : "feed");
      return back(`ok=zerou-${n}`);
    }
    if (intent === "postar") {
      // Em segundo plano (a CDN corta pedidos longos).
      void postarAgora(id).catch((e) => console.error(`[social] postar ${id}: ${String(e?.message ?? e).slice(0, 120)}`));
      return back("ok=enviando");
    }
    if (intent === "pular") return (await pular(id), back("ok=pulado"));
    if (intent === "novo") return (await gerarDeNovo(id), back("ok=novo"));
    if (intent === "tirar") return (await tirarDosPostados(id), back("ok=tirado"));
    if (intent === "repostar") return (await repostar(id), back("ok=repostar"));
  } catch (e) {
    return back(`erro=${encodeURIComponent(String((e as Error)?.message ?? e).slice(0, 200))}`);
  }
  return back(`erro=${encodeURIComponent(`Ação desconhecida: ${intent}. Se acabou de publicar uma versão nova, espere o deploy terminar e recarregue a página.`)}`);
}

const MSG: Record<string, string> = {
  salvo: "Configurações salvas.",
  desconectado: "Conta desconectada.",
  rodando: "Fila rodando em segundo plano; recarregue em 1 minuto.",
  enviando: "Enviando em segundo plano; recarregue em 1 minuto.",
  pulado: "Post pulado.",
  novo: "Vai gerar a arte de novo no próximo ciclo.",
  manual: "Marcado como postado à mão.",
  tirado: "Tirado da lista de postados (continua no Instagram).",
  repostar: "Voltou para a fila (cuidado: vai criar outro post no Instagram).",
};

/** Visualizador em tela cheia: a imagem grande (1080×1350 reduzida à tela), com setas para o carrossel e Esc para fechar. */
function Visualizador({ imgs, inicio, onFechar }: { imgs: string[]; inicio: number; onFechar: () => void }) {
  const [i, setI] = useState(inicio);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
      if (e.key === "ArrowRight") setI((x) => Math.min(imgs.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [imgs.length, onFechar]);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-black/90 p-4" role="dialog" aria-modal="true" onClick={onFechar}>
      <img src={imgs[i]} alt={`Slide ${i + 1} de ${imgs.length}`} className="max-h-[88vh] max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
      <div className="flex items-center gap-3 font-mono text-xs font-bold text-paper" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="min-h-10 border border-line-soft px-4 hover:border-acc disabled:opacity-40" disabled={i === 0} onClick={() => setI(i - 1)}>‹ ANTERIOR</button>
        <span>{i + 1} / {imgs.length}</span>
        <button type="button" className="min-h-10 border border-line-soft px-4 hover:border-acc disabled:opacity-40" disabled={i === imgs.length - 1} onClick={() => setI(i + 1)}>PRÓXIMO ›</button>
        <a href={imgs[i]} target="_blank" rel="noopener" className="min-h-10 border border-line-soft px-4 py-2.5 hover:border-acc">ABRIR EM TAMANHO REAL</a>
        <button type="button" className="min-h-10 bg-acc px-4 text-ink" onClick={onFechar}>FECHAR (ESC)</button>
      </div>
    </div>
  );
}

const ESTADO: Record<string, string> = { pending: "na fila", preview: "prévia", sending: "enviando", published: "publicado", failed: "falhou", skipped: "pulado", expired: "expirou" };

export default function AdminInstagram({ loaderData: d }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const [aberto, setAberto] = useState<{ imgs: string[]; i: number } | null>(null);
  const [carregando, setCarregando] = useState<number | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);
  /** Abre o visualizador. Sem arte gerada ainda: pergunta quantos slides a matéria terá e mostra todos (gerados na hora). */
  const abrir = async (l: { id: number; post_id: number; imagens: string[] }, i = 0) => {
    const fmt = d.semBanco ? "" : d.aba === "stories" ? "&formato=story" : "";
    if (l.imagens.length) return setAberto({ imgs: l.imagens, i });
    setCarregando(l.id);
    try {
      const r = await fetch(`/admin/instagram/previa/${l.post_id}?info=1${fmt}`);
      const j = r.ok ? ((await r.json()) as { slides: number }) : { slides: 1 };
      setAberto({ imgs: Array.from({ length: j.slides }, (_, k) => `/admin/instagram/previa/${l.post_id}?s=${k + 1}${fmt}`), i });
    } catch {
      setAberto({ imgs: [`/admin/instagram/previa/${l.post_id}?s=1${fmt}`], i: 0 });
    } finally {
      setCarregando(null);
    }
  };
  if (d.semBanco) return <><PageTitle>Instagram</PageTitle><Notice tone="warn">Precisa do banco de dados.</Notice></>;
  const { conta } = d;
  const estado = conta.token_status === "invalid" ? "TOKEN INVÁLIDO" : !conta.enabled && !conta.test_mode ? "DESLIGADO" : conta.test_mode ? "MODO DE TESTE" : "LIGADO";
  const msg = d.msg
    ? d.msg.startsWith("conectado-")
      ? `Conectado: @${decodeURIComponent(d.msg.slice(10))}.`
      : d.msg.startsWith("rodou-")
        ? `Fila rodou: ${decodeURIComponent(d.msg.slice(6))}.`
        : d.msg.startsWith("zerou-")
          ? `Fila zerada: ${d.msg.slice(6)} item(ns) removido(s). Os já postados ficam na lista de baixo. Clique em "Colocar as 30 últimas matérias na fila" para montar de novo.`
          : d.msg.startsWith("recentes-")
          ? `${d.msg.slice(9)} item(ns) colocado(s) na fila (feed e Stories). Clique em "Rodar a fila agora" para gerar as artes.`
          : MSG[d.msg]
    : null;
  return (
    <>
      <PageTitle aside={<span className="border border-line-soft px-3 py-1 font-mono text-xs font-bold text-acc">{estado}</span>}>Instagram</PageTitle>
      {msg && <Notice>{msg}</Notice>}
      {d.erro && <Notice tone="warn">{decodeURIComponent(d.erro)}</Notice>}
      {d.usoApi && <Notice>{d.usoApi}</Notice>}
      {conta.token_status === "invalid" && <Notice tone="warn">O token do Instagram não vale mais. Gere outro e cole abaixo (passo a passo em docs/instagram.md).</Notice>}
      {conta.note && <Notice tone="warn">{conta.note}</Notice>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Hoje (feed)" value={`${d.resumo.hoje}/${conta.daily_limit}`} />
        <Stat label="Stories hoje" value={`${d.resumo.storiesHoje}/${conta.story_daily_limit}`} />
        <Stat label="Na fila" value={`${d.resumo.naFila} + ${d.resumo.storiesNaFila} stories`} />
        <Stat label="Token" value={d.dias == null ? "—" : `${d.dias} dias`} tone={d.dias != null && d.dias < 10 ? "warn" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Conta">
          {!d.chave && <Notice tone="warn">Falta a variável SOCIAL_KEY no hPanel (64 caracteres hexadecimais). Sem ela o token não pode ser guardado.</Notice>}
          <p className="mt-2 text-sm text-body">{conta.username ? `Conectada: @${conta.username}` : `Nenhuma conta conectada (a conta do site é @${SOCIAL.handle}).`}</p>
          <Form method="post" className="mt-3 flex flex-col gap-3"><input type="hidden" name="aba" value={d.aba} />
            <input type="hidden" name="intent" value="conectar" />
            <Field label="Token de acesso" hint="Do login do Instagram (começa com IG…) ou do login do Facebook (começa com EAA…). Gerado no app da Meta; nunca cole no chat. Fica criptografado.">
              <input name="token" type="password" autoComplete="off" className={inputCls} placeholder="IGAA… ou EAA…" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button tone="primary" disabled={busy || !d.chave}>Conectar</Button>
              <a href="/admin/instagram?testar=1" className="inline-flex min-h-10 items-center border border-line-soft px-4 font-mono text-xs font-bold uppercase hover:border-acc">Testar conexão</a>
            </div>
          </Form>
          {conta.hasToken && (
            <Form method="post" className="mt-3"><input type="hidden" name="aba" value={d.aba} />
              <input type="hidden" name="intent" value="desconectar" />
              <Button tone="danger" disabled={busy}>Desconectar</Button>
            </Form>
          )}
        </Card>

        <Card title="Stories">
          <Form method="post" className="flex flex-col gap-3">
            <input type="hidden" name="intent" value="salvar_story" />
            <label className="flex items-center gap-3 text-paper">
              <input type="checkbox" name="story_enabled" defaultChecked={conta.story_enabled} className="h-5 w-5 accent-[var(--color-acc)]" />
              Stories ligados (1 story por matéria publicada)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stories por dia"><input name="story_daily_limit" type="number" min={1} max={15} defaultValue={conta.story_daily_limit} className={inputCls} /></Field>
              <Field label="Intervalo (min)"><input name="story_min_gap_minutes" type="number" min={15} max={360} defaultValue={conta.story_min_gap_minutes} className={inputCls} /></Field>
            </div>
            <div><Button tone="primary" disabled={busy}>Salvar</Button></div>
            <p className="text-xs text-muted">Usam a mesma janela de horário e o mesmo modo de teste do feed. Pela API não dá para pôr figurinha de link: o Story manda para o link da bio.</p>
          </Form>
        </Card>
        <Card title="Automação">
          <Form method="post" className="flex flex-col gap-3"><input type="hidden" name="aba" value={d.aba} />
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
              {([["N", "Notícia (1 imagem)"], ["C", "Carrossel (entra na fila para você revisar e postar; nunca sai sozinho)"], ["P", "Promoções"], ["S", "Lançamentos da semana"]] as const).map(([k, rot]) => (
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
          <div className="mt-3 flex flex-wrap gap-2">
            <Form method="post"><input type="hidden" name="aba" value={d.aba} />
              <input type="hidden" name="intent" value="recentes" />
              <Button disabled={busy}>Colocar as 30 últimas matérias na fila</Button>
            </Form>
            <Form method="post"><input type="hidden" name="aba" value={d.aba} />
              <input type="hidden" name="intent" value="rodar" />
              <Button disabled={busy}>Rodar a fila agora</Button>
            </Form>
            <Form method="post" onSubmit={(e) => { if (!confirm("Zerar a fila? Apaga tudo que ainda não foi postado (o que já está no Instagram fica registrado).")) e.preventDefault(); }}><input type="hidden" name="aba" value={d.aba} />
              <input type="hidden" name="intent" value="zerar" />
              <Button disabled={busy}>Zerar a fila</Button>
            </Form>
          </div>
          <p className="mt-2 text-xs text-muted">A fila só recebe sozinha as matérias publicadas depois da conexão. O botão de cima traz as que já estão no site.</p>
        </Card>
      </div>

      <nav className="mt-2 flex gap-5 border-b border-line font-mono text-xs font-bold uppercase" aria-label="Formato">
        <Link to="/admin/instagram" className={`-mb-px border-b-2 px-1 py-2 ${d.aba === "feed" ? "border-acc text-paper" : "border-transparent text-muted hover:text-paper"}`}>Feed ({d.resumo.naFila})</Link>
        <Link to="/admin/instagram?aba=stories" className={`-mb-px border-b-2 px-1 py-2 ${d.aba === "stories" ? "border-acc text-paper" : "border-transparent text-muted hover:text-paper"}`}>Stories ({d.resumo.storiesNaFila})</Link>
      </nav>

      <Card title={d.aba === "stories" ? "Fila de Stories" : "Fila (últimas 30)"}>
        {d.fila.length === 0 ? (
          <p className="text-sm text-muted">{d.aba === "stories" ? "Nenhum Story na fila. Ligue os stories no card acima; cada matéria publicada gera um." : "Nada na fila. Assim que uma matéria for publicada, ela aparece aqui."}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {d.fila.map((l) => (
              <li key={l.id} className="flex flex-col gap-3 py-4">
                <div className="flex flex-wrap items-start gap-3">
                  {/* Sem arte gerada ainda (na fila): mostra a prévia feita na hora; clicar abre grande. */}
                  <button
                    type="button"
                    className={`shrink-0 overflow-hidden border border-line bg-ink hover:border-acc ${d.aba === "stories" ? "h-[192px] w-[108px]" : "h-[150px] w-[120px]"}`}
                    aria-label="Ver a arte grande"
                    onClick={() => void abrir(l)}
                  >
                    <img src={l.imagens[0] ?? `/admin/instagram/previa/${l.post_id}?s=1${d.aba === "stories" ? "&formato=story" : ""}`} alt="" width={d.aba === "stories" ? 108 : 120} height={d.aba === "stories" ? 192 : 150} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    {carregando === l.id && <span className="block bg-acc px-1 font-mono text-[10px] font-bold text-ink">CARREGANDO…</span>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-bold text-paper">{l.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
                      <Pill status={l.status === "published" ? "ok" : l.status === "failed" ? "failed" : l.status === "preview" ? "draft" : "new"} />
                      <span>{ESTADO[l.status] ?? l.status}</span>
                      <span>· {l.model}</span>
                      {l.categoria && <span className="font-bold text-paper">· {l.categoria}</span>}
                      <span>· {when(l.published_at ?? l.created_at)}</span>
                      {l.attempts > 0 && <span>· {l.attempts} tentativa(s)</span>}
                    </p>
                    <p className="mt-1 font-mono text-xs font-bold text-acc">
                      {d.aba === "stories" ? (l.expires_at && l.status !== "published" ? `STORY 9:16 · EXPIRA ${when(l.expires_at)}` : "STORY 9:16") : l.slides > 1 ? `CARROSSEL · ${l.slides} SLIDES (ARRASTE PARA O LADO)` : "IMAGEM ÚNICA"}
                    </p>
                    {l.error && <p className="mt-1 line-clamp-1 text-xs text-warn" title={l.error}>{l.error}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["pending", "preview", "failed", "skipped"].includes(l.status) && (
                      <Form method="post"><input type="hidden" name="aba" value={d.aba} /><input type="hidden" name="intent" value="postar" /><input type="hidden" name="id" value={l.id} /><Button tone="primary" disabled={busy}>Postar agora</Button></Form>
                    )}
                    {l.status !== "published" && l.status !== "skipped" && (
                      <Form method="post"><input type="hidden" name="aba" value={d.aba} /><input type="hidden" name="intent" value="pular" /><input type="hidden" name="id" value={l.id} /><Button disabled={busy}>Pular</Button></Form>
                    )}
                    {l.status !== "published" && (
                      <Form method="post"><input type="hidden" name="aba" value={d.aba} /><input type="hidden" name="intent" value="novo" /><input type="hidden" name="id" value={l.id} /><Button disabled={busy}>Gerar de novo</Button></Form>
                    )}
                    {l.status === "published" && (
                      <Form method="post" onSubmit={(e) => { if (!confirm("Já está no Instagram; postar de novo cria outro post. Continuar?")) e.preventDefault(); }}><input type="hidden" name="aba" value={d.aba} />
                        <input type="hidden" name="intent" value="repostar" /><input type="hidden" name="id" value={l.id} /><Button disabled={busy}>Repostar</Button>
                      </Form>
                    )}
                    {l.permalink && <a href={l.permalink} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center px-2 font-mono text-xs font-bold text-acc underline">Abrir no Instagram</a>}
                    {d.aba === "stories" && l.status !== "published" && (
                      <>
                        <a href={l.imagens[0] ?? `/admin/instagram/previa/${l.post_id}?s=1&formato=story`} download={`story-${l.id}.jpg`} className="inline-flex min-h-10 items-center border border-line-soft px-3 font-mono text-xs font-bold text-paper hover:border-acc">Baixar JPEG</a>
                        <button type="button" className="inline-flex min-h-10 items-center border border-line-soft px-3 font-mono text-xs font-bold text-paper hover:border-acc" onClick={() => { void navigator.clipboard?.writeText(l.link); setCopiado(l.id); setTimeout(() => setCopiado(null), 2000); }}>
                          {copiado === l.id ? "COPIADO" : "Copiar link da matéria"}
                        </button>
                        <Form method="post" onSubmit={(e) => { if (!confirm("Você postou este Story pelo app? O robô não vai postá-lo.")) e.preventDefault(); }}>
                          <input type="hidden" name="intent" value="manual" /><input type="hidden" name="id" value={l.id} /><Button disabled={busy}>Marcar como postado à mão</Button>
                        </Form>
                      </>
                    )}
                  </div>
                </div>
                {d.aba === "feed" && l.imagens.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {l.imagens.map((src, k) => (
                      <button key={src} type="button" className="shrink-0 hover:opacity-90" aria-label={`Ver o slide ${k + 1} grande`} onClick={() => setAberto({ imgs: l.imagens, i: k })}>
                        <img src={src} alt="" width={216} height={270} className="h-[270px] w-[216px] border border-line object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
                {d.aba === "feed" && l.caption && <pre className="whitespace-pre-wrap border border-line bg-ink p-3 text-xs text-body">{l.caption}</pre>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {d.postados.length > 0 && (
        <section className="mt-6 opacity-70 transition hover:opacity-100">
          <h2 className="mb-2 font-mono text-xs font-bold uppercase tracking-wide text-muted">{d.aba === "stories" ? "Stories já postados" : "Já postados no Instagram"} ({d.postados.length})</h2>
          <ul className="flex flex-col divide-y divide-line border border-line">
            {d.postados.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                {l.imagem && <img src={l.imagem} alt="" width={32} height={40} loading="lazy" className="h-10 w-8 shrink-0 border border-line object-cover" />}
                <span className="min-w-0 flex-1 truncate text-body" title={l.title}>{l.title}</span>
                <span className="font-mono text-xs text-muted">{l.model} · {when(l.published_at)}</span>
                {d.aba === "stories" && l.published_at && (
                  <span className="font-mono text-xs font-bold text-acc">
                    {Date.now() - new Date(`${l.published_at.replace(" ", "T")}Z`).getTime() < 86_400_000 ? `NO AR ATÉ ${when(new Date(new Date(`${l.published_at.replace(" ", "T")}Z`).getTime() + 86_400_000).toISOString())}` : <span className="text-muted">SAIU DO AR</span>}
                  </span>
                )}
                {l.permalink && <a href={l.permalink} target="_blank" rel="noopener" className="font-mono text-xs font-bold text-acc underline">Abrir</a>}
                <Form method="post" onSubmit={(e) => { if (!confirm("Tirar da lista? O post continua no Instagram; a matéria poderá entrar na fila de novo.")) e.preventDefault(); }}><input type="hidden" name="aba" value={d.aba} />
                  <input type="hidden" name="intent" value="tirar" /><input type="hidden" name="id" value={l.id} />
                  <button type="submit" disabled={busy} className="font-mono text-xs text-muted underline hover:text-warn">Tirar da lista</button>
                </Form>
              </li>
            ))}
          </ul>
        </section>
      )}
      {aberto && <Visualizador imgs={aberto.imgs} inicio={aberto.i} onFechar={() => setAberto(null)} />}
    </>
  );
}
