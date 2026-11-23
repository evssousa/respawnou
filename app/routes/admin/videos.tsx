// Painel de vídeos (/admin/videos): roteiro para aprovar, vídeo pronto para baixar e legendas por rede, configuração e uso da voz.
// Módulo: app/video (docs/instagram-stories-videos.md, frente B).
import { useState } from "react";
import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/videos";
import { adminMeta, Button, Card, Field, inputCls, Notice, PageTitle, Pill, Stat, when } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { hasDatabase } from "~/lib/db.server";
import { AlinharImagem } from "~/components/AlinharImagem";
import { ehFocoManual, foco as focoValido, FOCOS, ROTULO_FOCO } from "~/social/core/overrides";
import type { Foco } from "~/social/tipos";
import { SECOES_VOZ, VIDEO, type VideoConfig } from "~/video/config";
import { lerConfig, salvarConfig } from "~/video/config.server";
import { aprovar, descartar, gerarRoteiroDoJob, listarJobs, resumoMes, salvarRoteiro } from "~/video/fila.server";
import { caracteresDoRoteiro, palavrasDoRoteiro } from "~/video/roteiro";

export const meta = () => adminMeta("Vídeos");

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  if (!hasDatabase()) return { semBanco: true as const };
  const url = new URL(request.url);
  const [jobs, resumo, cfg] = await Promise.all([listarJobs(10), resumoMes(), lerConfig()]);
  return {
    semBanco: false as const,
    jobs,
    resumo,
    cfg,
    chaveVoz: Boolean(process.env.ELEVENLABS_API_KEY),
    msg: url.searchParams.get("ok"),
    aviso: url.searchParams.get("aviso"),
    erro: url.searchParams.get("erro"),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const f = await request.formData();
  const intent = String(f.get("intent"));
  const id = Number(f.get("id"));
  const back = (q: string) => redirect(`/admin/videos?${q}`);
  try {
    if (intent === "salvar_config") {
      const num = (n: string, min: number, max: number, pad: number) => {
        const v = Number(String(f.get(n)).replace(",", "."));
        return Number.isFinite(v) && v >= min && v <= max ? v : pad;
      };
      const atual = await lerConfig();
      const cfg: VideoConfig = {
        enabled: f.get("enabled") === "on",
        perDay: Math.round(num("perDay", 0, 3, atual.perDay)),
        hour: Math.round(num("hour", 0, 23, atual.hour)),
        autoApprove: f.get("autoApprove") === "on",
        model: f.get("model") === "eleven_flash_v2_5" ? "eleven_flash_v2_5" : "eleven_multilingual_v2",
        speed: num("speed", 0.85, 1.1, atual.speed),
        creditsMonth: Math.round(num("creditsMonth", 1000, 1_000_000, atual.creditsMonth)),
        voiceDefault: String(f.get("voiceDefault") ?? "").trim().slice(0, 40),
        voices: Object.fromEntries(SECOES_VOZ.map((s) => [s.id, String(f.get(`voz_${s.id}`) ?? "").trim().slice(0, 40)]).filter(([, v]) => v)),
      };
      await salvarConfig(cfg);
      return back("ok=config");
    }
    if (intent === "gerar_roteiro") {
      const r = await gerarRoteiroDoJob(id);
      return back(r === "ok" ? "ok=roteiro" : `erro=${encodeURIComponent(r)}`);
    }
    if (intent === "descartar") return (await descartar(id), back("ok=descartado"));
    if (intent === "salvar" || intent === "aprovar" || intent === "refazer") {
      if (intent !== "refazer") {
        const cenas: { fala: string; imagem: number }[] = [];
        const focus: Record<string, Foco> = {};
        for (let i = 0; f.has(`fala_${i}`); i++) {
          const imagem = Number(f.get(`img_${i}`));
          cenas.push({ fala: String(f.get(`fala_${i}`) ?? "").trim(), imagem });
          const fo = String(f.get(`foco_${i}`) ?? "auto");
          if (fo === "inteira") focus[String(imagem)] = "inteira" as Foco;
          else focus[String(imagem)] = focoValido(fo);
        }
        const capa = Number(f.get("capa"));
        if (f.get("capa") !== "" && Number.isInteger(capa) && capa >= 0) focus["_capa"] = String(capa) as Foco;
        const erro = await salvarRoteiro(id, { gancho: String(f.get("gancho") ?? ""), titulo_curto: String(f.get("titulo_curto") ?? ""), cenas }, focus);
        if (erro !== "ok") return back(`erro=${encodeURIComponent(erro)}`);
      }
      if (intent === "salvar") return back("ok=salvo");
      const r = await aprovar(id);
      if (!r.ok) return back(`erro=${encodeURIComponent(r.aviso ?? "não aprovou")}`);
      return back(`ok=aprovado${r.aviso ? `&aviso=${encodeURIComponent(r.aviso)}` : ""}`);
    }
  } catch (e) {
    return back(`erro=${encodeURIComponent(String((e as Error)?.message ?? e).slice(0, 240))}`);
  }
  return back(`erro=${encodeURIComponent(`Ação desconhecida: ${intent}.`)}`);
}

const MSG: Record<string, string> = {
  config: "Configuração salva.",
  roteiro: "Roteiro novo gerado.",
  salvo: "Roteiro salvo.",
  descartado: "Vídeo descartado.",
  aprovado: "Aprovado. O vídeo fica pronto em alguns minutos: recarregue a página.",
};
const ROTULO_STATUS: Record<string, string> = { aguardando: "aguardando você", aprovado: "aprovado, na fila do gerador", gerando: "gerando", pronto: "pronto", falhou: "falhou" };

function Copiavel({ titulo, texto }: { titulo: string; texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-bold uppercase text-body">{titulo}</span>
        <button type="button" className="min-h-9 border border-line-soft px-3 font-mono text-xs font-bold text-paper hover:border-acc" onClick={() => { void navigator.clipboard?.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); }}>
          {ok ? "COPIADO" : "Copiar"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap border border-line bg-ink p-3 text-xs text-body">{texto}</pre>
    </div>
  );
}

type Job = Extract<Route.ComponentProps["loaderData"], { semBanco: false }>["jobs"][number];

/** Uma cena do roteiro: fala, imagem, enquadramento (presets, imagem inteira ou alinhamento manual arrastando) e ver maior. */
function CenaLinha({ i, c, images, focus }: { i: number; c: { fala: string; imagem: number }; images: { src: string; alt: string }[]; focus: Record<string, string> }) {
  const [img, setImg] = useState(c.imagem);
  const [foco, setFoco] = useState<string>(focus[String(c.imagem)] ?? "auto");
  const [alinhando, setAlinhando] = useState(false);
  const src = images[img]?.src;
  const real = src && !src.startsWith("arte:") ? src : null;
  return (
    <div className="grid gap-2 border border-line p-2 sm:grid-cols-[64px_1fr]">
      {real ? (
        <button type="button" className="block hover:opacity-90" aria-label="Ver a imagem grande e alinhar" onClick={() => setAlinhando(true)}>
          <img src={real} alt="" width={64} height={114} className="h-[114px] w-16 border border-line object-cover" style={ehFocoManual(foco) ? { objectPosition: foco.replace(",", "% ") + "%" } : undefined} loading="lazy" />
        </button>
      ) : (
        <div className="flex h-[114px] w-16 items-center justify-center border border-line text-[10px] text-muted">ARTE</div>
      )}
      <div className="flex flex-col gap-2">
        <textarea name={`fala_${i}`} defaultValue={c.fala} rows={2} maxLength={VIDEO.limites.cena} aria-label={`Fala da cena ${i + 1}`} className={inputCls} />
        <input type="hidden" name={`img_${i}`} value={img} />
        <input type="hidden" name={`foco_${i}`} value={foco} />
        <div className="flex flex-wrap gap-2">
          <select value={img} onChange={(e) => { const n = Number(e.target.value); setImg(n); setFoco(focus[String(n)] ?? "auto"); }} aria-label="Imagem da cena" className="min-h-9 border border-line bg-ink px-2 text-xs text-paper">
            {images.map((x, k) => <option key={k} value={k}>{`Imagem ${k + 1}: ${x.alt.slice(0, 40)}`}</option>)}
          </select>
          <select value={foco} onChange={(e) => setFoco(e.target.value)} aria-label="Enquadramento" className="min-h-9 border border-line bg-ink px-2 text-xs text-paper">
            {ehFocoManual(foco) && <option value={foco}>{`Manual (${foco.replace(",", "% / ")}%)`}</option>}
            <option value="inteira">Imagem inteira (fundo desfocado)</option>
            {FOCOS.map((x) => <option key={x} value={x}>{`Recorte: ${ROTULO_FOCO[x]}`}</option>)}
          </select>
          {real && <button type="button" className="min-h-9 border border-line-soft px-3 font-mono text-xs font-bold text-paper hover:border-acc" onClick={() => setAlinhando(true)}>Ver maior e alinhar</button>}
        </div>
      </div>
      {alinhando && real && <AlinharImagem src={real} aspecto={9 / 16} inicial={foco} titulo={`CENA ${i + 1} · enquadramento no vídeo (9:16)`} onSalvar={(f) => { setFoco(f); setAlinhando(false); }} onFechar={() => setAlinhando(false)} />}
    </div>
  );
}

function CartaoJob({ j, cfg, busy }: { j: Job; cfg: VideoConfig; busy: boolean }) {
  const r = j.script;
  const palavras = r ? palavrasDoRoteiro(r) : 0;
  const chars = r ? caracteresDoRoteiro(r) : 0;
  const custo = ((chars * (cfg.model === "eleven_flash_v2_5" ? 0.5 : 1)) / 1000) * VIDEO.usdPorMilCreditos;
  const editavel = (j.status === "aguardando" || j.status === "falhou") && !!r;
  const capa = j.post_image ?? undefined;
  return (
    <Card title={`${(j.section ?? "").toUpperCase()} · ${j.title ?? ""}`}>
      <div className="grid gap-4 lg:grid-cols-[270px_1fr]">
        <div className="w-[270px] max-w-full">
          {j.status === "pronto" && j.video ? (
            <video controls playsInline preload="metadata" poster={j.cover ?? undefined} className="aspect-[9/16] w-[270px] bg-ink">
              <source src={j.video} type="video/mp4" />
            </video>
          ) : j.status === "falhou" && !r ? (
            <div className="flex aspect-[9/16] w-[270px] items-center justify-center border border-warn p-3 text-sm text-warn">{j.error}</div>
          ) : (
            <div className="relative aspect-[9/16] w-[270px] overflow-hidden border border-line bg-ink">
              {capa && <img src={capa} alt="" className="h-full w-full object-cover" loading="lazy" />}
              <div className="absolute inset-x-0 bottom-0 bg-ink/80 p-2 text-xs font-bold text-paper">{j.title}</div>
              {j.status === "gerando" && <div className="absolute inset-x-0 top-0 animate-pulse bg-acc px-2 py-1 font-mono text-xs font-bold text-ink">GERANDO… 2 A 5 MIN</div>}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
            <Pill status={j.status === "pronto" ? "ok" : j.status === "falhou" ? "failed" : j.status === "aguardando" ? "draft" : "new"} />
            <span>{ROTULO_STATUS[j.status] ?? j.status}</span>
            <span>· {j.origin === "auto" ? "escolhido sozinho" : "pedido por você"}</span>
            <span>· {when(j.created_at)}</span>
            {j.duration_s != null && <span>· {j.duration_s}s</span>}
          </p>
          {j.error && j.status === "falhou" && r && <Notice tone="warn">{j.error}</Notice>}

          {editavel && r && (
            <Form method="post" className="flex flex-col gap-3">
              <input type="hidden" name="id" value={j.id} />
              <Field label={`Gancho (${r.gancho.length}/${VIDEO.limites.gancho})`}>
                <input name="gancho" defaultValue={r.gancho} maxLength={VIDEO.limites.gancho} className={inputCls} />
              </Field>
              <Field label={`Título do vídeo (até ${VIDEO.limites.tituloCurto})`}>
                <input name="titulo_curto" defaultValue={r.titulo_curto} maxLength={VIDEO.limites.tituloCurto} className={inputCls} />
              </Field>
              <Field label="Imagem da capa e da abertura (a 1ª imagem do vídeo)">
                <select name="capa" defaultValue={j.focus["_capa"] ?? ""} className={inputCls}>
                  <option value="">Automática (a da 1ª cena)</option>
                  {j.images.map((x, k) => (x.src.startsWith("arte:") ? null : <option key={k} value={k}>{`Imagem ${k + 1}: ${x.alt.slice(0, 40)}`}</option>))}
                </select>
              </Field>
              {r.cenas.map((c, i) => (
                <CenaLinha key={`${j.id}-${i}`} i={i} c={c} images={j.images} focus={j.focus} />
              ))}
              <p className="text-xs text-muted">Fechamento fixo: “{VIDEO.fechamento}”</p>
              <p className="font-mono text-xs text-body">≈ {Math.round(palavras / 2.5 + 3)} s · {chars} caracteres · ~US$ {custo.toFixed(2).replace(".", ",")}</p>
              <div className="flex flex-wrap gap-2">
                <Button tone="primary" name="intent" value="aprovar" disabled={busy}>Aprovar e gerar</Button>
                <Button name="intent" value="salvar" disabled={busy}>Salvar roteiro</Button>
              </div>
            </Form>
          )}
          {(j.status === "aguardando" || j.status === "falhou") && (
            <div className="flex flex-wrap gap-2">
              <Form method="post"><input type="hidden" name="id" value={j.id} /><Button name="intent" value="gerar_roteiro" disabled={busy}>Gerar outro roteiro (usa 1 pedido do Gemini)</Button></Form>
              <Form method="post" onSubmit={(e) => { if (!confirm("Descartar este vídeo?")) e.preventDefault(); }}><input type="hidden" name="id" value={j.id} /><Button name="intent" value="descartar" disabled={busy}>Descartar</Button></Form>
            </div>
          )}

          {j.status === "pronto" && (
            <>
              <div className="flex flex-wrap gap-2">
                {j.video && <a href={j.video} download className="inline-flex min-h-10 items-center bg-acc px-4 font-mono text-xs font-bold text-ink">Baixar MP4</a>}
                {j.cover && <a href={j.cover} download className="inline-flex min-h-10 items-center border border-line-soft px-4 font-mono text-xs font-bold text-paper hover:border-acc">Baixar capa</a>}
                <Form method="post" onSubmit={(e) => { if (!confirm(`Refazer o vídeo? Gasta ~${j.chars ?? 550} créditos da ElevenLabs de novo.`)) e.preventDefault(); }}>
                  <input type="hidden" name="id" value={j.id} /><Button name="intent" value="refazer" disabled={busy}>Refazer vídeo (gasta ~{j.chars ?? 550} créditos)</Button>
                </Form>
              </div>
              {j.captions && (
                <div className="flex flex-col gap-3">
                  <Copiavel titulo="Legenda do Instagram (Reels)" texto={j.captions.instagram} />
                  <Copiavel titulo="YouTube: título" texto={j.captions.youtube.title} />
                  <Copiavel titulo="YouTube: descrição" texto={j.captions.youtube.description} />
                  <Copiavel titulo="Legenda do TikTok" texto={j.captions.tiktok} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AdminVideos({ loaderData: d }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  if (d.semBanco) return <><PageTitle>Vídeos</PageTitle><Notice tone="warn">Precisa do banco de dados.</Notice></>;
  const { cfg } = d;
  const estado = !cfg.enabled ? "DESLIGADO" : d.resumo.aguardando ? "AGUARDANDO VOCÊ" : "LIGADO";
  const pct = Math.round((d.resumo.creditos / cfg.creditsMonth) * 100);
  const msg = d.msg ? MSG[d.msg] : null;
  return (
    <>
      <PageTitle aside={<span className={`border border-line-soft px-3 py-1 font-mono text-xs font-bold ${estado === "AGUARDANDO VOCÊ" ? "text-warn" : estado === "LIGADO" ? "text-acc" : "text-muted"}`}>{estado}</span>}>Vídeos</PageTitle>
      {msg && <Notice>{msg}</Notice>}
      {d.aviso && <Notice tone="warn">{decodeURIComponent(d.aviso)}</Notice>}
      {d.erro && <Notice tone="warn">{decodeURIComponent(d.erro)}</Notice>}
      {!d.chaveVoz && <Notice tone="warn">Falta cadastrar ELEVENLABS_API_KEY nas variáveis de ambiente do hPanel: sem ela o servidor não consegue gerar a voz.</Notice>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Prontos este mês" value={d.resumo.prontos} />
        <Stat label="Créditos usados" value={`${d.resumo.creditos.toLocaleString("pt-BR")}/${cfg.creditsMonth.toLocaleString("pt-BR")}`} tone={pct >= 80 ? "warn" : undefined} />
        <Stat label="Aguardando aprovação" value={d.resumo.aguardando} />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {d.jobs.length === 0 ? (
          <Card title="Vídeos"><p className="text-sm text-muted">Nenhum vídeo ainda. O próximo é escolhido sozinho depois das {cfg.hour}h (se estiver ligado), ou abra uma matéria e clique em “Fazer vídeo desta matéria”.</p></Card>
        ) : (
          d.jobs.map((j) => <CartaoJob key={j.id} j={j} cfg={cfg} busy={busy} />)
        )}
      </div>

      <details className="mt-6 border border-line p-3" open={!cfg.enabled}>
        <summary className="cursor-pointer font-mono text-xs font-bold text-acc">CONFIGURAÇÃO</summary>
        <Form method="post" className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="intent" value="salvar_config" />
          <label className="flex items-center gap-3 text-paper"><input type="checkbox" name="enabled" defaultChecked={cfg.enabled} className="h-5 w-5 accent-[var(--color-acc)]" />Ligado (escolhe 1 matéria por dia e prepara o roteiro)</label>
          <label className="flex items-center gap-3 text-paper"><input type="checkbox" name="autoApprove" defaultChecked={cfg.autoApprove} className="h-5 w-5 accent-[var(--color-acc)]" />Aprovar sozinho (sem você ler o roteiro — não recomendado)</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Vídeos por dia (0–3)"><input name="perDay" type="number" min={0} max={3} defaultValue={cfg.perDay} className={inputCls} /></Field>
            <Field label="Escolhe depois das (h)"><input name="hour" type="number" min={0} max={23} defaultValue={cfg.hour} className={inputCls} /></Field>
            <Field label="Velocidade da voz"><input name="speed" type="number" step="0.01" min={0.85} max={1.1} defaultValue={cfg.speed} className={inputCls} /></Field>
            <Field label="Cota mensal (créditos)"><input name="creditsMonth" type="number" min={1000} defaultValue={cfg.creditsMonth} className={inputCls} /></Field>
          </div>
          <Field label="Modelo da voz">
            <select name="model" defaultValue={cfg.model} className={inputCls}>
              <option value="eleven_multilingual_v2">eleven_multilingual_v2 (melhor em português, 1 crédito por caractere)</option>
              <option value="eleven_flash_v2_5">eleven_flash_v2_5 (mais barato, 0,5 crédito por caractere)</option>
            </select>
          </Field>
          <p className="font-mono text-xs font-bold text-body">VOZ POR EDITORIA (o código da voz, “voice_id”, copiado da ElevenLabs)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Voz padrão (usada onde não houver uma da editoria)"><input name="voiceDefault" defaultValue={cfg.voiceDefault} maxLength={40} className={inputCls} /></Field>
            {SECOES_VOZ.map((s) => (
              <Field key={s.id} label={`Voz de ${s.rotulo}`}><input name={`voz_${s.id}`} defaultValue={cfg.voices[s.id] ?? ""} maxLength={40} className={inputCls} /></Field>
            ))}
          </div>
          <div><Button tone="primary" disabled={busy}>Salvar</Button></div>
          <p className="text-xs text-muted">O vídeo é montado aqui no próprio servidor (leva alguns minutos; a chave da ElevenLabs fica em ELEVENLABS_API_KEY no hPanel).</p>
        </Form>
      </details>
    </>
  );
}
