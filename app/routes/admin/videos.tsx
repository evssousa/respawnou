// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Painel de vídeos (/admin/videos): roteiro para aprovar, vídeo pronto para baixar e legendas por rede, configuração e uso da voz.
// Módulo: app/video (docs/instagram-stories-videos.md, frente B).
import { useEffect, useRef, useState } from "react";
import { Form, isRouteErrorResponse, Link, redirect, useNavigation, useRevalidator } from "react-router";
import type { Route } from "./+types/videos";
import { adminMeta, Button, Card, Field, inputCls, Notice, PageTitle, Pill, Stat, when } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { hasDatabase } from "~/lib/db.server";
import { MARCA } from "~/marca";
import { cartoesDisponiveis, rotuloOpcaoCartao, type FatosVideo } from "~/video/cartoes";
import { AlinharImagem } from "~/components/AlinharImagem";
import { EscolherImagem } from "~/components/EscolherImagem";
import { BlocoFechamento, BlocoGancho } from "~/components/video/Ganchos";
import { CartaoPronuncia } from "~/components/video/Pronuncia";
import { juntarDicionario, suspeitas, type ItemPronuncia } from "~/video/pronuncia";
import { lerPronuncia, salvarPronuncia } from "~/video/pronuncia.server";
import { ehFocoManual, foco as focoValido, FOCOS, ROTULO_FOCO } from "~/social/core/overrides";
import type { Foco } from "~/social/tipos";
import type { PreviaVoz } from "~/video/fila.server";
import { ENERGIA_VOZ, perfilDaSecao, SECOES_VOZ, VIDEO, type VideoConfig } from "~/video/config";
import { lerConfig, salvarConfig } from "~/video/config.server";
import { ErroUpload } from "~/social/server/uploads.server";
import { adicionarImagem, adicionarVideo, analisarVideoEnviado, aprovar, cancelarGeracao, descartar, lerPrevia, obterJob, listarJobs, listarPublicados, pedirPreviaVoz, pedirRoteiro, publicarReel, reabrir, resumoMes, salvarRoteiro } from "~/video/fila.server";
import { caracteresDoRoteiro, palavrasDoRoteiro, textoFalado } from "~/video/roteiro";

export const meta = () => adminMeta("Vídeos");

/** Erro do painel com a mensagem de verdade (o React Router esconde a de erros do servidor em produção). */
function falha(onde: string, e: unknown): Response {
  if (e instanceof Response) return e;
  const msg = String((e as Error)?.message ?? e).slice(0, 400);
  console.error(`[videos] ${onde}:`, e);
  return new Response(`Não consegui ${onde}: ${msg}`, { status: 500 });
}

export async function loader({ request }: Route.LoaderArgs) {
  try {
    return await carregar(request);
  } catch (e) {
    throw falha("carregar o painel de vídeos", e);
  }
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const msg = isRouteErrorResponse(error) ? String(error.data ?? error.statusText) : error instanceof Error ? error.message : "Erro desconhecido";
  return (
    <>
      <PageTitle>Vídeos</PageTitle>
      <Notice tone="warn">{msg}</Notice>
      <p className="mt-3 text-xs text-muted">Copie esta mensagem e mande no chat para eu corrigir.</p>
    </>
  );
}

async function carregar(request: Request) {
  await requireAdmin(request);
  if (!hasDatabase()) return { semBanco: true as const };
  const url = new URL(request.url);
  const busca = (url.searchParams.get("q") ?? "").slice(0, 80);
  const aba = abaDe(url.searchParams.get("aba") ?? (url.searchParams.get("nova") ? "pronuncia" : busca ? "publicados" : null));
  const [jobs, resumo, cfg, publicados] = await Promise.all([listarJobs(10), resumoMes(), lerConfig(), listarPublicados(busca)]);
  const pronunciaDono = await lerPronuncia();
  const previas: Record<number, PreviaVoz | null> = {};
  for (const j of jobs) if ((j.status === "aguardando" || j.status === "falhou") && j.script) previas[j.id] = await lerPrevia(j);
  return {
    semBanco: false as const,
    aba,
    previas,
    jobs,
    publicados,
    pronunciaDono,
    nova: (url.searchParams.get("nova") ?? "").slice(0, 40),
    busca,
    resumo,
    cfg,
    chaveVoz: Boolean(process.env.ELEVENLABS_API_KEY),
    msg: url.searchParams.get("ok"),
    aviso: url.searchParams.get("aviso"),
    erro: url.searchParams.get("erro"),
  };
}

/** Menus internos de Vídeos: cada um é uma aba (?aba=). */
const ABAS = [
  { id: "fila", rotulo: "Vídeos" },
  { id: "publicados", rotulo: "Já publicados" },
  { id: "pronuncia", rotulo: "Pronúncia de voz" },
  { id: "config", rotulo: "Configuração" },
] as const;
type Aba = (typeof ABAS)[number]["id"];
const abaDe = (v: string | null): Aba => ABAS.find((a) => a.id === v)?.id ?? "fila";

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const f = await request.formData();
  const intent = String(f.get("intent"));
  const id = Number(f.get("id"));
  // Volta para a aba de onde veio (salvar configuração e pronúncia voltam para a própria aba).
  const abaAtual: Aba = intent === "salvar_config" ? "config" : intent === "salvar_pronuncia" ? "pronuncia" : intent === "reabrir" ? "fila" : abaDe(new URL(request.url).searchParams.get("aba"));
  const back = (q: string) => redirect(`/admin/videos?${q}${abaAtual !== "fila" ? `&aba=${abaAtual}` : ""}`);
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
        efeitos: f.get("efeitos") === "on",
        musica: f.get("musica") === "baixa" || f.get("musica") === "alta" ? (String(f.get("musica")) as "baixa" | "alta") : "media",
        series: Object.fromEntries(
          Object.keys(atual.series).map((k) => [k, { ligado: f.get(`serie_${k}_on`) === "on", dia: Math.round(num(`serie_${k}_dia`, 0, 6, atual.series[k].dia)), hora: Math.round(num(`serie_${k}_hora`, 0, 23, atual.series[k].hora)) }]),
        ),
        formatos: Object.fromEntries(Object.keys(atual.formatos).map((k) => [k, f.get(`formato_${k}`) === "on"])),
        energia: f.get("energia") === "calma" || f.get("energia") === "normal" ? (String(f.get("energia")) as "calma" | "normal") : "animada",
        creditsMonth: Math.round(num("creditsMonth", 1000, 1_000_000, atual.creditsMonth)),
        voiceDefault: String(f.get("voiceDefault") ?? "").trim().slice(0, 40),
        voices: Object.fromEntries(SECOES_VOZ.map((s) => [s.id, String(f.get(`voz_${s.id}`) ?? "").trim().slice(0, 40)]).filter(([, v]) => v)),
      };
      await salvarConfig(cfg);
      return back("ok=config");
    }
    if (f.get("analisar") != null) {
      // "Mostrar trechos do vídeo": analisa um vídeo enviado antes desta versão (ou que a análise não terminou) em segundo plano.
      const job = await obterJob(id);
      const alvo = job?.images[Number(f.get("analisar"))];
      if (!alvo) return back(`erro=${encodeURIComponent("Vídeo não encontrado na lista.")}`);
      void analisarVideoEnviado(id, alvo.src).catch((e) => console.error("[video] análise:", String((e as Error)?.message ?? e).slice(0, 160)));
      return back("ok=analisando");
    }
    if (intent === "cancelar") return (await cancelarGeracao(id)) ? back("ok=cancelado") : back(`erro=${encodeURIComponent("Esse vídeo não está sendo gerado agora.")}`);
    if (intent === "gerar_roteiro") {
      const r = await pedirRoteiro(id);
      return back(r === "ok" ? "ok=roteiro" : `erro=${encodeURIComponent(r)}`);
    }
    if (intent === "descartar") return (await descartar(id)) ? back("ok=descartado") : back(`erro=${encodeURIComponent("Não dá para excluir um vídeo que está sendo gerado agora.")}`);
    if (intent === "salvar_pronuncia") {
      const de = f.getAll("p_de").map(String);
      const para = f.getAll("p_para").map(String);
      await salvarPronuncia(de.map((d, i) => ({ de: d, para: para[i] ?? "" })));
      return back("ok=pronuncia");
    }
    if (intent === "publicar_reel") {
      const r = await publicarReel(id);
      return r === "ok" ? back("ok=reel") : back(`erro=${encodeURIComponent(r)}`);
    }
    if (intent === "reabrir") return (await reabrir(id)) ? back("ok=reaberto") : back(`erro=${encodeURIComponent("Este vídeo não pode ser reaberto agora.")}`);
    if (intent === "salvar" || intent === "ouvir" || intent === "aprovar" || intent === "refazer" || intent === "img_add" || intent === "vid_add") {
      if (intent !== "refazer") {
        const cenas: { fala: string; imagem: number; cartao?: string; item?: number | null; ss?: number }[] = [];
        const json = <T,>(v: FormDataEntryValue | null, fb: T): T => {
          try {
            return v ? (JSON.parse(String(v)) as T) : fb;
          } catch {
            return fb;
          }
        };
        const focus: Record<string, Foco> = {};
        for (let i = 0; f.has(`fala_${i}`); i++) {
          const imagem = Number(f.get(`img_${i}`));
          const cartao = String(f.get(`cartao_${i}`) ?? "");
          const itemTxt = String(f.get(`item_${i}`) ?? "");
          cenas.push({ fala: String(f.get(`fala_${i}`) ?? "").trim(), imagem, ...(cartao ? { cartao } : {}), ...(itemTxt !== "" ? { item: Number(itemTxt) } : {}), ...(String(f.get(`ss_${i}`) ?? "") !== "" && Number.isFinite(Number(f.get(`ss_${i}`))) ? { ss: Number(f.get(`ss_${i}`)) } : {}) });
          const fo = String(f.get(`foco_${i}`) ?? "auto");
          if (fo === "inteira") focus[String(imagem)] = "inteira" as Foco;
          else focus[String(imagem)] = focoValido(fo);
        }
        const capa = Number(f.get("capa"));
        if (f.get("capa") !== "" && Number.isInteger(capa) && capa >= 0) focus["_capa"] = String(capa) as Foco;
        // Enquadramento da imagem da capa (feito na própria caixa da capa); vale para essa imagem em todo o vídeo.
        const capaFoco = String(f.get("capa_foco") ?? "");
        const idxCapa = f.get("capa") !== "" && Number.isInteger(capa) && capa >= 0 ? capa : cenas[0]?.imagem;
        if (capaFoco && Number.isInteger(idxCapa)) focus[String(idxCapa)] = capaFoco === "inteira" ? ("inteira" as Foco) : focoValido(capaFoco);
        // Roteiro novo (v2): ganchos, pergunta, destaques e cartões precisam voltar do formulário, senão somem ao salvar.
        const v2 = f.has("ganchos_json");
        const erro = await salvarRoteiro(
          id,
          {
            gancho: String(f.get("gancho") ?? ""),
            titulo_curto: String(f.get("titulo_curto") ?? ""),
            cenas,
            ...(v2 ? { ganchos: json<string[]>(f.get("ganchos_json"), []), pergunta: String(f.get("pergunta") ?? ""), usarPergunta: f.get("usar_pergunta") === "on", destaques: json<string[]>(f.get("destaques_json"), []) } : {}),
          },
          focus,
        );
        if (erro !== "ok") return back(`erro=${encodeURIComponent(erro)}`);
      }
      if (intent === "img_add") {
        const file = f.get("file");
        if (!(file instanceof File) || !file.size) return back(`erro=${encodeURIComponent("Escolha uma imagem primeiro.")}`);
        const r = await adicionarImagem(id, file);
        return r === "ok" ? back("ok=imagem") : back(`erro=${encodeURIComponent(r)}`);
      }
      if (intent === "vid_add") {
        const file = f.get("video");
        if (!(file instanceof File) || !file.size) return back(`erro=${encodeURIComponent("Escolha um arquivo de vídeo primeiro.")}`);
        const r = await adicionarVideo(id, file, String(f.get("credito") ?? ""));
        return r === "ok" ? back("ok=video") : back(`erro=${encodeURIComponent(r)}`);
      }
      if (intent === "salvar") return back("ok=salvo");
      if (intent === "ouvir") {
        // Salva o texto da tela (com as suas edições) e gera a voz em segundo plano: o áudio fica guardado e a geração do vídeo o reaproveita.
        const r = await pedirPreviaVoz(id);
        return r === "ok" ? back("ok=ouvindo") : back(`erro=${encodeURIComponent(r)}`);
      }
      const r = await aprovar(id);
      if (!r.ok) return back(`erro=${encodeURIComponent(r.aviso ?? "não aprovou")}`);
      return back(`ok=aprovado${r.aviso ? `&aviso=${encodeURIComponent(r.aviso)}` : ""}`);
    }
  } catch (e) {
    if (e instanceof ErroUpload) return back(`erro=${encodeURIComponent(e.message)}`);
    return back(`erro=${encodeURIComponent(String((e as Error)?.message ?? e).slice(0, 240))}`);
  }
  return back(`erro=${encodeURIComponent(`Ação desconhecida: ${intent}.`)}`);
}

const MSG: Record<string, string> = {
  config: "Configuração salva.",
  roteiro: "Pedi o roteiro ao Gemini. Ele aparece aqui sozinho em até 2 minutos (a tela atualiza sozinha).",
  salvo: "Roteiro salvo.",
  descartado: "Vídeo excluído (arquivos apagados).",
  ouvindo: "Gerando a voz da narração… em alguns segundos o player aparece aqui (a tela atualiza sozinha).",
  cancelado: "Geração cancelada. O vídeo voltou para rascunho, com o roteiro e as escolhas salvos.",
  analisando: "Analisando o vídeo: os quadros dos trechos aparecem em instantes (a tela atualiza sozinha).",
  imagem: "Imagem acrescentada (e o roteiro salvo). Escolha-a numa cena, ou como capa.",
  video: "Vídeo acrescentado (e o roteiro salvo). Escolha-o numa cena: o sistema recorta os melhores trechos sozinho.",
  pronuncia: "Pronúncias salvas. Valem para os próximos vídeos (não mudam a legenda).",
  reel: "Enviando ao Instagram… o vídeo leva alguns minutos para processar. Esta tela atualiza sozinha.",
  reaberto: "Vídeo reaberto: mexa no roteiro, nas imagens e no enquadramento e clique em Aprovar e gerar quando quiser.",
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

/** Escolha da imagem da capa/abertura com a prévia da 1ª tela (imagem enquadrada + moldura + cartão de título), montada pelo servidor. */
function CapaEscolha({ j }: { j: Job }) {
  const [sel, setSel] = useState<string>(j.focus["_capa"] ?? "");
  const [v, setV] = useState(0);
  const [prev, setPrev] = useState<{ url: string | null; erro: string | null; carregando: boolean; indice: string }>({ url: null, erro: null, carregando: true, indice: "" });
  const indice = sel !== "" ? sel : String(j.script?.cenas[0]?.imagem ?? 0);
  const [foco, setFoco] = useState<string>(j.focus[indice] ?? "auto");
  const [alinhando, setAlinhando] = useState(false);
  const real = j.images[Number(indice)]?.src;
  const imagemReal = !!real && !real.startsWith("arte:") && !real.startsWith("yt:") && !/\.(mp4|webm)$/i.test(real);
  // Busca a prévia por fetch (sem cache) e mostra o resultado: assim a imagem sempre acompanha a escolha e qualquer erro aparece escrito.
  useEffect(() => {
    let vivo = true;
    let objeto: string | null = null;
    setPrev((p) => ({ ...p, carregando: true, erro: null }));
    fetch(`/admin/videos/capa/${j.id}/${indice}/${Date.now()}-${v}?foco=${encodeURIComponent(foco)}`, { cache: "no-store", credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.text()).slice(0, 160) || `HTTP ${r.status}`);
        const b = await r.blob();
        if (!/^image\//.test(b.type)) throw new Error("A resposta não era uma imagem (sessão expirada? recarregue a página).");
        objeto = URL.createObjectURL(b);
        if (vivo) setPrev({ url: objeto, erro: null, carregando: false, indice });
      })
      .catch((e) => vivo && setPrev({ url: null, erro: String(e?.message ?? e), carregando: false, indice }));
    return () => {
      vivo = false;
      if (objeto) setTimeout(() => URL.revokeObjectURL(objeto!), 5000);
    };
  }, [indice, v, j.id, foco]);
  return (
    <>
    <Field label="Imagem da capa e da abertura (a 1ª imagem do vídeo)">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <input type="hidden" name="capa" value={sel} />
          <EscolherImagem opcoes={j.images} valor={sel} onChange={(x) => { setSel(x); const n = x !== "" ? x : String(j.script?.cenas[0]?.imagem ?? 0); setFoco(j.focus[n] ?? "auto"); }} rotulo="Escolha a imagem da capa e da abertura" permitirAutomatica="a imagem da 1ª cena" semVideo />
          <input type="hidden" name="capa_foco" value={foco} />
          <div className="flex flex-wrap gap-2">
            <select value={foco} onChange={(e) => setFoco(e.target.value)} aria-label="Enquadramento da capa" className="min-h-9 border border-line bg-ink px-2 text-xs text-paper">
              {ehFocoManual(foco) && <option value={foco}>{`Manual (${foco.replace(",", "% / ")}%)`}</option>}
              <option value="inteira">Imagem inteira (fundo desfocado)</option>
              <option value="auto">Automático</option>
              {FOCOS.map((x) => <option key={x} value={x}>{`Recorte: ${ROTULO_FOCO[x]}`}</option>)}
            </select>
            {imagemReal && <button type="button" className="min-h-9 border border-line-soft px-3 font-mono text-xs font-bold text-paper hover:border-acc" onClick={() => setAlinhando(true)}>Mover e alinhar</button>}
            <button type="button" className="min-h-9 border border-line-soft px-3 font-mono text-xs font-bold text-paper hover:border-acc" onClick={() => setV(v + 1)}>Atualizar prévia</button>
          </div>
          <p className="text-[11px] text-muted">Use "Mover e alinhar" para arrastar a imagem até o encaixe certo; a prévia já usa o que você escolheu. Clique em Salvar roteiro para guardar. O enquadramento vale para essa imagem em todo o vídeo.</p>
        </div>
        <div className="flex flex-col gap-1">
          {prev.url && !prev.erro ? (
            <img src={prev.url} alt="Prévia da primeira tela do vídeo" width={180} height={320} className={`aspect-[9/16] w-[180px] border border-line bg-ink object-cover ${prev.carregando ? "opacity-50" : ""}`} />
          ) : (
            <div className="flex aspect-[9/16] w-[180px] items-center justify-center border border-line p-2 text-center text-xs text-muted">{prev.erro ?? "Carregando prévia…"}</div>
          )}
          <span className="font-mono text-[11px] text-muted">{prev.carregando ? "Atualizando…" : `Prévia da imagem ${Number(prev.indice) + 1}`}</span>
        </div>
      </div>
    </Field>
    {alinhando && imagemReal && <AlinharImagem src={real!} aspecto={9 / 16} inicial={foco} titulo="CAPA E ABERTURA · enquadramento (9:16)" onSalvar={(f) => { setFoco(f); setAlinhando(false); }} onFechar={() => setAlinhando(false)} />}
    </>
  );
}

/** Barra de andamento da geração do vídeo: porcentagem e etapa (vêm de `progress`, no formato "g:42:Montando as cenas"). */
function ProgressoGeracao({ progress }: { progress?: string | null }) {
  const m = /^g:(\d{1,3}):(.*)$/.exec(progress ?? "");
  const pct = m ? Math.min(100, Number(m[1])) : null;
  const rotulo = m?.[2] || "Preparando";
  return (
    <div className="absolute inset-x-0 top-0 bg-ink/90 p-2" role="progressbar" aria-label="Andamento da geração do vídeo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
      <div className="flex items-center justify-between gap-2 font-mono text-xs font-bold text-acc">
        <span className="truncate">{rotulo}</span>
        <span>{pct != null ? `${pct}%` : "…"}</span>
      </div>
      <div className="mt-1 h-2 w-full bg-line">
        <div className="h-2 bg-acc transition-all duration-700" style={{ width: `${pct ?? 3}%` }} />
      </div>
    </div>
  );
}

/** Lista de cenas. Guarda aqui o cartão escolhido em cada uma, para o "já na cena N" das outras valer na hora (e não só depois de salvar). */
function CenasEditor({ j, r, max, previa, busy }: { j: Job; r: NonNullable<Job["script"]>; max: number; previa: PreviaVoz | null; busy: boolean }) {
  const [cart, setCart] = useState<string[]>(() => r.cenas.map((c) => c.cartao ?? ""));
  const usados: Record<string, number> = {};
  cart.forEach((t, k) => {
    if (t) usados[t] = k;
  });
  // Player único: o da narração inteira; os botões "Ouvir esta cena" posicionam o mesmo áudio no começo da cena e param no fim dela.
  const audio = useRef<HTMLAudioElement>(null);
  const parar = useRef<(() => void) | null>(null);
  const [tocando, setTocando] = useState<number | null>(null);
  const tocar = (k: number, ini: number, fim: number) => {
    const a = audio.current;
    if (!a) return;
    if (parar.current) a.removeEventListener("timeupdate", parar.current);
    const fn = () => {
      if (a.currentTime >= fim) {
        a.pause();
        a.removeEventListener("timeupdate", fn);
        setTocando(null);
      }
    };
    parar.current = fn;
    a.addEventListener("timeupdate", fn);
    a.currentTime = ini;
    setTocando(k);
    void a.play();
  };
  const caracteres = r.gancho.length + r.cenas.reduce((n, c) => n + c.fala.length, 0) + 110;
  const gerandoVoz = j.progress === "voz";
  return (
    <>
      <div className="flex flex-col gap-2 border border-line p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button name="intent" value="ouvir" disabled={busy || gerandoVoz}>{previa ? "Ouvir de novo com o texto atual" : "Ouvir a narração"}</Button>
          <span className="text-[11px] text-muted">{`Salva o roteiro e gera a voz (cerca de ${caracteres.toLocaleString("pt-BR")} créditos da ElevenLabs). Ao gerar o vídeo, esta mesma voz é reaproveitada, sem gastar de novo.`}</span>
        </div>
        {gerandoVoz && <p className="animate-pulse font-mono text-xs font-bold text-acc">GERANDO A VOZ… ALGUNS SEGUNDOS</p>}
        {previa ? (
          <>
            <audio ref={audio} controls preload="auto" src={previa.url} className="w-full" onPause={() => setTocando(null)} />
            <p className="text-[11px] text-muted">{`Narração de ${previa.total.toFixed(0)} s. Use "Ouvir esta cena" em cada cena. Mudou alguma fala? Clique em "Ouvir de novo" (ouvir não gasta nada; gerar a voz de novo, sim).`}</p>
          </>
        ) : (
          !gerandoVoz && <p className="text-[11px] text-muted">Ouça antes de gerar o vídeo para conferir pronúncia, ritmo e se alguma fala precisa mudar.</p>
        )}
      </div>
      {r.cenas.map((c, i) => (
        <CenaLinha key={`${j.id}-${i}`} i={i} c={c} images={j.images} focus={j.focus} max={max} jobId={j.id} fatos={(j.facts as unknown as FatosVideo | null) ?? null} usados={usados} onCartao={(v) => setCart((a) => a.map((x, k) => (k === i ? v : x)))} onOuvir={previa && previa.cenas[i] && previa.cenas[i].fim > 0 ? () => tocar(i, previa.cenas[i].ini, previa.cenas[i].fim) : undefined} tocando={tocando === i} />
      ))}
    </>
  );
}

/** Uma cena do roteiro: fala, imagem, enquadramento (presets, imagem inteira ou alinhamento manual arrastando) e ver maior. */
function CenaLinha({ i, c, images, focus, max, jobId, fatos, usados, onCartao, onOuvir, tocando }: { onOuvir?: () => void; tocando?: boolean; onCartao: (v: string) => void; max: number; i: number; jobId: number; fatos: FatosVideo | null; usados: Record<string, number>; c: { fala: string; imagem: number; cartao?: string | null; item?: number | null; ss?: number | null }; images: { src: string; alt: string; trechos?: { ss: number; thumb: string }[]; duracao?: number }[]; focus: Record<string, string> }) {
  const [img, setImg] = useState(c.imagem);
  const [foco, setFoco] = useState<string>(focus[String(c.imagem)] ?? "auto");
  const [alinhando, setAlinhando] = useState(false);
  const [cartao, setCartao] = useState<string>(c.cartao ?? "");
  const [semPrevia, setSemPrevia] = useState(false);
  const [ss, setSs] = useState<string>(c.ss != null ? String(c.ss) : "");
  const disponiveis = fatos ? cartoesDisponiveis(fatos) : [];
  const src = images[img]?.src;
  const ehVid = !!src && /\.(mp4|webm)$/i.test(src);
  const real = src && !src.startsWith("arte:") && !ehVid ? src : null;
  const trechos = ehVid ? (images[img]?.trechos ?? []) : [];
  const trechoAtual = ss !== "" ? trechos.reduce<{ ss: number; thumb: string } | null>((a, t) => (a == null || Math.abs(t.ss - Number(ss)) < Math.abs(a.ss - Number(ss)) ? t : a), null) : (trechos[0] ?? null);
  const mmss = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
  return (
    <div className="grid gap-2 border border-line p-2 sm:grid-cols-[64px_1fr]">
      {real ? (
        <button type="button" className="block hover:opacity-90" aria-label="Ver a imagem grande e alinhar" onClick={() => setAlinhando(true)}>
          <img src={real} alt="" width={64} height={114} className="h-[114px] w-16 border border-line object-cover" style={ehFocoManual(foco) ? { objectPosition: foco.replace(",", "% ") + "%" } : undefined} loading="lazy" />
        </button>
      ) : ehVid ? (
        trechoAtual ? <img src={trechoAtual.thumb} alt="Quadro do trecho escolhido" width={64} height={114} className="h-[114px] w-16 border border-line object-cover" /> : <video src={`${src}#t=1`} muted playsInline preload="metadata" className="h-[114px] w-16 border border-line object-cover" />
      ) : (
        <div className="flex h-[114px] w-16 items-center justify-center border border-line text-[10px] text-muted">ARTE</div>
      )}
      <div className="flex flex-col gap-2">
        <textarea name={`fala_${i}`} defaultValue={c.fala} rows={2} maxLength={max} aria-label={`Fala da cena ${i + 1}`} className={inputCls} />
        {onOuvir && <button type="button" onClick={onOuvir} className={`min-h-9 self-start border px-3 font-mono text-xs font-bold ${tocando ? "border-acc text-acc" : "border-line-soft text-paper hover:border-acc"}`}>{tocando ? "▶ Tocando…" : "▶ Ouvir esta cena"}</button>}
        <input type="hidden" name={`img_${i}`} value={img} />
        <input type="hidden" name={`foco_${i}`} value={foco} />
        <input type="hidden" name={`cartao_${i}`} value={cartao} />
        <input type="hidden" name={`item_${i}`} value={c.item ?? ""} />
        <input type="hidden" name={`ss_${i}`} value={ehVid ? ss : ""} />
        {ehVid && (
          <div className="flex flex-col gap-1 border border-dashed border-line-soft p-2">
            <span className="text-[11px] text-muted">{`Vídeo: de onde o trecho desta cena começa${ss === "" ? " (automático, o servidor escolhe)" : ` (a partir de ${mmss(Number(ss))})`}. Clique num quadro para escolher.`}</span>
            {trechos.length ? (
              <div className="flex gap-1 overflow-x-auto pb-1">
                <button type="button" onClick={() => setSs("")} className={`min-h-[54px] shrink-0 border px-2 font-mono text-[11px] font-bold ${ss === "" ? "border-acc text-acc" : "border-line text-paper hover:border-acc"}`}>AUTO</button>
                {trechos.map((t) => (
                  <button key={t.ss} type="button" onClick={() => setSs(String(t.ss))} aria-label={`Começar em ${mmss(t.ss)}`} className={`shrink-0 border p-0.5 ${ss !== "" && Number(ss) === t.ss ? "border-acc" : "border-line hover:border-acc"}`}>
                    <img src={t.thumb} alt="" width={96} height={54} loading="lazy" className="h-[54px] w-24 object-cover" />
                    <span className="block text-center font-mono text-[10px] text-muted">{mmss(t.ss)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button type="submit" name="analisar" value={String(img)} formNoValidate className="min-h-9 border border-line-soft px-3 font-mono text-xs font-bold text-paper hover:border-acc">Mostrar os trechos do vídeo</button>
                <span className="text-[11px] text-muted">Os quadros aparecem em até 1 minuto depois do envio (a tela atualiza sozinha; se não aparecerem, clique aqui).</span>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <EscolherImagem opcoes={images} valor={String(img)} onChange={(v) => { const n = Number(v); setImg(n); setSs(""); setFoco(focus[String(n)] ?? "auto"); }} rotulo={`Imagem da cena ${i + 1}`} />
          <select value={foco} onChange={(e) => setFoco(e.target.value)} aria-label="Enquadramento" className="min-h-9 border border-line bg-ink px-2 text-xs text-paper">
            {ehFocoManual(foco) && <option value={foco}>{`Manual (${foco.replace(",", "% / ")}%)`}</option>}
            <option value="inteira">Imagem inteira (fundo desfocado)</option>
            {FOCOS.map((x) => <option key={x} value={x}>{`Recorte: ${ROTULO_FOCO[x]}`}</option>)}
          </select>
          {real && <button type="button" className="min-h-9 border border-line-soft px-3 font-mono text-xs font-bold text-paper hover:border-acc" onClick={() => setAlinhando(true)}>Ver maior e alinhar</button>}
          {fatos && (
            <span className="flex items-center gap-2">
              <select value={cartao} onChange={(e) => { setCartao(e.target.value); onCartao(e.target.value); setSemPrevia(false); }} aria-label="Cartão de dados desta cena" className="min-h-9 border border-line bg-ink px-2 text-xs text-paper">
                <option value="">Cartão: nenhum</option>
                {disponiveis.map((t) => {
                  const outra = usados[t] != null && usados[t] !== i;
                  return <option key={t} value={t} disabled={outra}>{`${rotuloOpcaoCartao(t, fatos)}${outra ? ` (já na cena ${usados[t] + 1})` : ""}`}</option>;
                })}
              </select>
              {cartao && !semPrevia && <img key={cartao} src={`/admin/videos/cartao/${jobId}?tipo=${cartao}`} alt="" height={60} className="h-[60px] border border-line" onError={() => setSemPrevia(true)} />}
              {cartao && semPrevia && <span className="text-[11px] text-muted">sem prévia</span>}
            </span>
          )}
        </div>
      </div>
      {alinhando && real && <AlinharImagem src={real} aspecto={9 / 16} inicial={foco} titulo={`CENA ${i + 1} · enquadramento no vídeo (9:16)`} onSalvar={(f) => { setFoco(f); setAlinhando(false); }} onFechar={() => setAlinhando(false)} />}
    </div>
  );
}

function CartaoJob({ j, cfg, busy, dicionario, previa }: { j: Job; cfg: VideoConfig; busy: boolean; dicionario: ItemPronuncia[]; previa: PreviaVoz | null }) {
  const perfil = perfilDaSecao(j.section ?? "");
  const r = j.script;
  const palavras = r ? palavrasDoRoteiro(r) : 0;
  const chars = r ? caracteresDoRoteiro(r, dicionario) : 0;
  const palavrasFaladas = r ? textoFalado(r, dicionario).split(/\s+/).filter(Boolean).length : 0;
  const duvidas = r ? suspeitas([r.gancho, ...r.cenas.map((c) => c.fala)], dicionario) : [];
  const custo = ((chars * (cfg.model === "eleven_flash_v2_5" ? 0.5 : 1)) / 1000) * VIDEO.usdPorMilCreditos;
  const editavel = (j.status === "aguardando" || j.status === "falhou") && !!r;
  const capa = j.post_image ?? undefined;
  return (
    <Card title={`${j.serie ? `${MARCA.video.series[j.serie]?.rotulo ?? ""} · ` : ""}${(j.section ?? "").toUpperCase()} · ${j.title ?? ""}`}>
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
              {j.status === "gerando" && <ProgressoGeracao progress={j.progress} />}
              {j.progress === "roteiro" && <div className="absolute inset-x-0 top-0 animate-pulse bg-acc px-2 py-1 font-mono text-xs font-bold text-ink">GERANDO O ROTEIRO… ATÉ 2 MIN</div>}
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
            <Form method="post" encType="multipart/form-data" className="flex flex-col gap-3">
              <input type="hidden" name="id" value={j.id} />
              <BlocoGancho r={r} />
              {r.v === 2 && <input type="hidden" name="destaques_json" value={JSON.stringify(r.destaques ?? [])} />}
              <Field label={`Título do vídeo (até ${VIDEO.limites.tituloCurto})`}>
                <input name="titulo_curto" defaultValue={r.titulo_curto} maxLength={VIDEO.limites.tituloCurto} className={inputCls} />
              </Field>
              <CapaEscolha j={j} />
              <CenasEditor j={j} r={r} max={perfil.cena} previa={previa} busy={busy} />
              <div className="flex flex-wrap items-center gap-2 border border-dashed border-line-soft p-2">
                <span className="text-xs text-muted">A imagem não combina com o texto? Envie outra ({j.images.length} no vídeo):</span>
                <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" className="max-w-full text-xs text-body" />
                <Button name="intent" value="img_add" disabled={busy}>Enviar imagem (salva o roteiro)</Button>
              </div>
              <div className="flex flex-col gap-2 border border-dashed border-line-soft p-2">
                <span className="text-xs text-muted">Envie aqui o arquivo do trailer/vídeo (material que você pode usar). O sistema recorta cortes curtos de até 4,5 s, só com a sua narração (o áudio do vídeo não entra), no máximo 40% do vídeo, com o crédito na tela.</span>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="file" name="video" accept="video/mp4,video/webm" className="max-w-full text-xs text-body" />
                  <input name="credito" placeholder="Crédito (ex.: Bandai Namco)" maxLength={60} className={`${inputCls} max-w-[240px]`} />
                  <Button name="intent" value="vid_add" disabled={busy}>Enviar vídeo (salva o roteiro)</Button>
                </div>
              </div>
              {duvidas.length > 0 && (
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  Confira a pronúncia:
                  {duvidas.map((w) => (
                    <a key={w} href={`/admin/videos?aba=pronuncia&nova=${encodeURIComponent(w)}`} className="inline-flex min-h-8 items-center border border-line-soft px-2 font-mono text-[11px] text-paper hover:border-acc">{w}</a>
                  ))}
                </p>
              )}
              {r.v === 2 ? <BlocoFechamento r={r} /> : <p className="text-xs text-muted">Fechamento fixo: “{VIDEO.fechamento}”</p>}
              <p className="font-mono text-xs text-body">≈ {Math.round(palavrasFaladas / 2.5 + 1)} s (alvo {perfil.rotulo}: {perfil.palavras[0]} a {perfil.palavras[1]} palavras; tem {palavras}) · {chars} caracteres · ~US$ {custo.toFixed(2).replace(".", ",")}</p>
              <div className="flex flex-wrap gap-2">
                <Button tone="primary" name="intent" value="aprovar" disabled={busy}>Aprovar e gerar</Button>
                <Button name="intent" value="salvar" disabled={busy}>Salvar roteiro</Button>
              </div>
            </Form>
          )}
          {(j.status === "gerando" || j.status === "aprovado") && (
            <Form method="post" onSubmit={(e) => { if (!confirm("Cancelar a geração deste vídeo? Ele volta para rascunho (o roteiro e as escolhas ficam salvos).")) e.preventDefault(); }}><input type="hidden" name="id" value={j.id} /><Button name="intent" value="cancelar">Cancelar geração</Button></Form>
          )}
          {(j.status === "aguardando" || j.status === "falhou") && (
            <div className="flex flex-wrap gap-2">
              <Form method="post"><input type="hidden" name="id" value={j.id} /><Button name="intent" value="gerar_roteiro" disabled={busy || j.progress === "roteiro"}>Gerar outro roteiro (usa 1 pedido do Gemini)</Button></Form>
              <Form method="post" onSubmit={(e) => { if (!confirm("Excluir este vídeo?")) e.preventDefault(); }}><input type="hidden" name="id" value={j.id} /><Button name="intent" value="descartar" disabled={busy}>Excluir</Button></Form>
            </div>
          )}

          {j.status === "pronto" && (
            <>
              <div className="flex flex-wrap gap-2">
                {j.video && <a href={j.video} download className="inline-flex min-h-10 items-center bg-acc px-4 font-mono text-xs font-bold text-ink">Baixar MP4</a>}
                {j.ig_status === "publicado" ? (
                  <span className="inline-flex min-h-10 items-center gap-2 border border-acc px-4 font-mono text-xs font-bold text-acc">
                    Publicado no Instagram{j.ig_published_at ? ` · ${when(j.ig_published_at)}` : ""}
                    {j.ig_permalink && <a href={j.ig_permalink} target="_blank" rel="noreferrer" className="underline">ver</a>}
                  </span>
                ) : j.ig_status === "enviando" ? (
                  <span className="inline-flex min-h-10 animate-pulse items-center border border-line-soft px-4 font-mono text-xs font-bold text-paper">Enviando ao Instagram… (até 6 min)</span>
                ) : (
                  <Form method="post" onSubmit={(e) => { if (!confirm(`Publicar este vídeo AGORA como Reels no Instagram do ${MARCA.site} (valendo, fora do modo de teste)?`)) e.preventDefault(); }}>
                    <input type="hidden" name="id" value={j.id} /><Button tone="primary" name="intent" value="publicar_reel" disabled={busy}>Publicar no Instagram (Reels)</Button>
                  </Form>
                )}
                {j.cover && <a href={j.cover} download className="inline-flex min-h-10 items-center border border-line-soft px-4 font-mono text-xs font-bold text-paper hover:border-acc">Baixar capa</a>}
                <Form method="post">
                  <input type="hidden" name="id" value={j.id} /><Button name="intent" value="reabrir" disabled={busy}>Editar e refazer (não gera ainda)</Button>
                </Form>
                <Form method="post" onSubmit={(e) => { if (!confirm("Excluir este vídeo? O MP4 e a capa são apagados e não dá para desfazer.")) e.preventDefault(); }}>
                  <input type="hidden" name="id" value={j.id} /><Button name="intent" value="descartar" disabled={busy}>Excluir vídeo</Button>
                </Form>
              </div>
              {j.ig_status === "falhou" && j.ig_error && <Notice tone="warn">Instagram: {j.ig_error}</Notice>}
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
  // Enquanto algo está sendo gerado ou enviado ao Instagram, a tela se atualiza sozinha a cada 8 s.
  const revalidador = useRevalidator();
  const ativo = !d.semBanco && d.jobs.some((j) => j.ig_status === "enviando" || j.status === "gerando" || j.status === "aprovado" || (j.status === "falhou" && /tentando de novo/.test(j.error ?? "")) || j.progress === "roteiro" || j.progress === "voz" || j.images.some((x) => /\.(mp4|webm)$/i.test(x.src) && x.duracao != null && !x.trechos));
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => revalidador.revalidate(), 4000);
    return () => clearInterval(t);
  }, [ativo]); // eslint-disable-line react-hooks/exhaustive-deps
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

      <nav aria-label="Menus de Vídeos" className="mb-4 flex flex-wrap gap-x-5 gap-y-1 border-b border-line font-mono text-xs font-bold">
        {ABAS.map((a) => (
          <Link key={a.id} to={a.id === "fila" ? "/admin/videos" : `/admin/videos?aba=${a.id}`} aria-current={d.aba === a.id ? "page" : undefined} className={`-mb-px border-b-2 px-1 py-2 ${d.aba === a.id ? "border-acc text-paper" : "border-transparent text-muted hover:text-paper"}`}>
            {a.rotulo}
            {a.id === "publicados" ? ` (${d.publicados.total})` : ""}
          </Link>
        ))}
      </nav>

      {d.aba === "fila" && (
        <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Prontos este mês" value={d.resumo.prontos} />
        <Stat label="Créditos usados" value={`${d.resumo.creditos.toLocaleString("pt-BR")}/${cfg.creditsMonth.toLocaleString("pt-BR")}`} tone={pct >= 80 ? "warn" : undefined} />
        <Stat label="Aguardando aprovação" value={d.resumo.aguardando} />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {d.jobs.length === 0 ? (
          <Card title="Vídeos"><p className="text-sm text-muted">Nenhum vídeo ainda. O próximo é escolhido sozinho depois das {cfg.hour}h (se estiver ligado), ou abra uma matéria e clique em “Fazer vídeo desta matéria”.</p></Card>
        ) : (
          d.jobs.map((j) => <CartaoJob key={j.id} j={j} cfg={cfg} busy={busy} dicionario={juntarDicionario(d.pronunciaDono)} previa={d.previas[j.id] ?? null} />)
        )}
      </div>

        </>
      )}

      {d.aba === "publicados" && (
      <details className="mt-2 border border-line p-3" open>
        <summary className="cursor-pointer font-mono text-xs font-bold text-muted">JÁ PUBLICADOS ({d.publicados.total}) — para baixar ou postar em outro lugar</summary>
        <Form method="get" className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="aba" value="publicados" />
          <input name="q" defaultValue={d.busca} placeholder="Buscar pelo título da matéria" className={`${inputCls} max-w-[320px]`} />
          <Button>Buscar</Button>
          {d.busca && <a href="/admin/videos?aba=publicados" className="font-mono text-xs text-muted underline">limpar</a>}
        </Form>
        <ul className="mt-3 flex flex-col gap-1">
          {d.publicados.itens.length === 0 && <li className="text-xs text-muted">{d.busca ? "Nenhum vídeo publicado com esse título." : "Nenhum vídeo publicado ainda."}</li>}
          {d.publicados.itens.map((j) => (
            <li key={j.id}>
              <details className="border border-line-soft">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-2 py-1.5 text-xs text-muted">
                  <span className="font-mono">{(j.section ?? "").toUpperCase()}</span>
                  <span className="min-w-0 flex-1 truncate text-body">{j.title}</span>
                  <span className="font-mono">{j.ig_published_at ? when(j.ig_published_at) : ""}</span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-line-soft p-2">
                  <div className="flex flex-wrap gap-2">
                    {j.video && <a href={j.video} download className="inline-flex min-h-9 items-center bg-acc px-3 font-mono text-xs font-bold text-ink">Baixar MP4</a>}
                    {j.cover && <a href={j.cover} download className="inline-flex min-h-9 items-center border border-line-soft px-3 font-mono text-xs font-bold text-paper hover:border-acc">Baixar capa</a>}
                    {j.ig_permalink && <a href={j.ig_permalink} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center border border-line-soft px-3 font-mono text-xs font-bold text-paper hover:border-acc">Ver no Instagram</a>}
                    <Form method="post" onSubmit={(e) => { if (!confirm("Editar e refazer? O registro de publicação deste vídeo é limpo e ele volta para a lista principal.")) e.preventDefault(); }}>
                      <input type="hidden" name="id" value={j.id} /><Button name="intent" value="reabrir" disabled={busy}>Editar e refazer</Button>
                    </Form>
                  </div>
                  {j.captions && (
                    <div className="flex flex-col gap-3">
                      <Copiavel titulo="YouTube: título" texto={j.captions.youtube.title} />
                      <Copiavel titulo="YouTube: descrição" texto={j.captions.youtube.description} />
                      <Copiavel titulo="Legenda do TikTok" texto={j.captions.tiktok} />
                    </div>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
        {d.publicados.total > d.publicados.itens.length && <p className="mt-2 text-xs text-muted">Mostrando os {d.publicados.itens.length} mais recentes de {d.publicados.total}. Use a busca para achar os outros.</p>}
      </details>
      )}

      {d.aba === "pronuncia" && <CartaoPronuncia dono={d.pronunciaDono} base={MARCA.video.pronunciaBase} nova={d.nova} busy={busy} aberto />}

      {d.aba === "config" && (
      <details className="mt-2 border border-line p-3" open>
        <summary className="cursor-pointer font-mono text-xs font-bold text-acc">CONFIGURAÇÃO</summary>
        <Form method="post" className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="intent" value="salvar_config" />
          <label className="flex items-center gap-3 text-paper"><input type="checkbox" name="enabled" defaultChecked={cfg.enabled} className="h-5 w-5 accent-[var(--color-acc)]" />Ligado (escolhe 1 matéria por dia e prepara o roteiro)</label>
          <label className="flex items-center gap-3 text-paper"><input type="checkbox" name="efeitos" defaultChecked={cfg.efeitos} className="h-5 w-5 accent-[var(--color-acc)]" />Efeitos sonoros nos cartões (ding no preço, impacto na nota)</label>
          <label className="flex flex-wrap items-center gap-3 text-paper">Volume da música de fundo
            <select name="musica" defaultValue={cfg.musica} className="min-h-9 border border-line bg-ink px-2 text-xs text-paper">
              {(Object.entries(VIDEO.musica) as [string, { rotulo: string }][]).map(([k, m]) => <option key={k} value={k}>{m.rotulo}</option>)}
            </select>
            <span className="text-xs text-muted">vale para os próximos vídeos; a música abaixa sozinha quando a voz fala</span>
          </label>
          <fieldset className="flex flex-col gap-2 border border-line p-3">
            <legend className="px-1 font-mono text-xs text-muted">SÉRIES</legend>
            {(["gratis-semana", "lancamentos-semana"] as const).map((k) => (
              <div key={k} className="flex flex-wrap items-center gap-3">
                <label className="flex min-w-[220px] items-center gap-3 text-paper">
                  <input type="checkbox" name={`serie_${k}_on`} defaultChecked={cfg.series[k]?.ligado} className="h-5 w-5 accent-[var(--color-acc)]" />
                  {MARCA.video.series[k].nome}
                </label>
                <select name={`serie_${k}_dia`} defaultValue={cfg.series[k]?.dia} aria-label="Dia da semana" className="min-h-9 border border-line bg-ink px-2 text-xs text-paper">
                  {["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"].map((n, d) => <option key={d} value={d}>{n}</option>)}
                </select>
                <label className="flex items-center gap-2 text-xs text-muted">depois das <input name={`serie_${k}_hora`} type="number" min={0} max={23} defaultValue={cfg.series[k]?.hora} className={`${inputCls} w-16`} /> h</label>
              </div>
            ))}
            <p className="text-[11px] text-muted">Lançamentos da semana nasce na segunda e nunca é aprovado sozinho: você aprova pelo painel (pode ser pelo celular).</p>
            <label className="flex items-center gap-3 text-paper"><input type="checkbox" name="formato_review-60" defaultChecked={cfg.formatos["review-60"]} className="h-5 w-5 accent-[var(--color-acc)]" />Reviews viram “Review em 60 s”</label>
            <label className="flex items-center gap-3 text-paper"><input type="checkbox" name="formato_top5" defaultChecked={cfg.formatos.top5} className="h-5 w-5 accent-[var(--color-acc)]" />Listas com 5 itens viram “Top 5”</label>
          </fieldset>
          <label className="flex items-center gap-3 text-paper"><input type="checkbox" name="autoApprove" defaultChecked={cfg.autoApprove} className="h-5 w-5 accent-[var(--color-acc)]" />Aprovar sozinho (sem você ler o roteiro — não recomendado)</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Vídeos por dia (0–3)"><input name="perDay" type="number" min={0} max={3} defaultValue={cfg.perDay} className={inputCls} /></Field>
            <Field label="Escolhe depois das (h)"><input name="hour" type="number" min={0} max={23} defaultValue={cfg.hour} className={inputCls} /></Field>
            <Field label="Velocidade da voz"><input name="speed" type="number" step="0.01" min={0.85} max={1.1} defaultValue={cfg.speed} className={inputCls} /></Field>
            <Field label="Energia da voz">
              <select name="energia" defaultValue={cfg.energia} className={inputCls}>
                {(Object.keys(ENERGIA_VOZ) as (keyof typeof ENERGIA_VOZ)[]).map((k) => <option key={k} value={k}>{ENERGIA_VOZ[k].rotulo}</option>)}
              </select>
            </Field>
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
      )}
    </>
  );
}
