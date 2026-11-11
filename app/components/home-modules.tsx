// Módulos da homepage. Cada editoria tem um formato visual próprio.
import { Link } from "react-router";
import type { SectionStat } from "~/lib/content.server";
import { formatScore } from "~/lib/format";
import { PLATFORMS, type Platform } from "~/lib/site";
import type { FreeGame, PostView, Release } from "~/lib/types";
import { Rail } from "./Rail";
import { Art, Badge, Hud, Kicker, cx } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");
const platformLabel = Object.fromEntries(PLATFORMS.map((p) => [p.slug, p.label]));
const platformsText = (slugs: string[]) => slugs.map((s) => platformLabel[s] ?? s).join(" · ").toUpperCase();

/* ───────────── M01 · Transmissão principal + log ───────────── */

/** Módulo sem conteúdo ainda (banco recém-criado). */
function EmptyModule({ children = "Nenhuma matéria por aqui ainda. Volte em breve!" }: { children?: string }) {
  return <p className="ch bg-ink-2 p-5 font-mono text-xs text-muted">&gt; {children.toUpperCase()}</p>;
}

export function MainBroadcast({ post, log }: { post: PostView; log: PostView[] }) {
  return (
    <section aria-label="Destaque" className="flex flex-wrap gap-5">
      <Link to={post.url} className="group ch relative flex min-w-0 flex-[999_1_600px] flex-col justify-end bg-ink-2 sm:min-h-[520px]">
        <Art variant={post.art} image={post.image} eager className="relative aspect-[16/10] sm:absolute sm:inset-0 sm:aspect-auto" />
        <div aria-hidden className="absolute inset-0 hidden bg-linear-to-t from-ink from-10% to-transparent to-75% sm:block" />
        <Hud
          left="> TRANSMISSÃO PRINCIPAL"
          right={
            <>
              CH-01 <span className="blink">●</span> REC
            </>
          }
        />
        <div className="relative flex flex-col gap-4 p-5 sm:p-8">
          <Badge>
            {post.kicker} // {post.ago}
          </Badge>
          <h1 className="max-w-3xl font-display text-[40px] uppercase leading-[0.92] transition-colors group-hover:text-acc sm:text-[68px]">{post.title}</h1>
          <p className="max-w-2xl text-base leading-relaxed text-body">{post.excerpt}</p>
        </div>
      </Link>

      <aside aria-label="Últimas transmissões" className="ch flex flex-[1_1_320px] flex-col bg-ink-2 py-5 pr-5 pl-6">
        <h2 className="mb-1 font-mono text-xs font-bold text-acc">&gt; LOG DE TRANSMISSÕES</h2>
        <ol>
          {log.map((p, i) => (
            <li key={p.url} className={cx(i >= 4 && "hidden md:block")}>
              <Link to={p.url} className="group flex gap-3.5 border-b border-dashed border-line-soft py-3.5">
                <time dateTime={p.publishedAt} className="w-11 shrink-0 pt-0.5 font-mono text-xs font-semibold text-muted">
                  {/* Até 24h mostra o horário; depois, "ONTEM" / "HÁ 3 DIAS". */}
                  {p.ago.startsWith("HÁ") && !p.ago.includes("DIAS") ? p.timeLabel : p.ago}
                </time>
                <span className="flex flex-col gap-1">
                  <Kicker>{p.kicker}</Kicker>
                  <span className="text-[15px] leading-snug font-semibold transition-colors group-hover:text-acc">{p.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}

/* ───────────── M02 · Módulos (atalhos das editorias) ───────────── */

export function ModuleGrid({ stats, releases, showReleases = true }: { stats: SectionStat[]; releases: number; showReleases?: boolean }) {
  const items = [
    // Editoria vazia fica de fora (Notícias sempre aparece).
    ...stats.filter((s) => s.total > 0 || s.slug === "noticias").map((s) => ({ to: `/${s.slug}`, label: s.label, info: `${pad(s.total)} ARQUIVOS` })),
    ...(showReleases ? [{ to: "/lancamentos", label: "Lançamentos", info: `${pad(releases)} NA SEMANA` }] : []),
  ];
  return (
    <nav aria-label="Módulos" className="rail -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
      {items.map((m, i) => (
        <Link key={m.to} to={m.to} className="group ch flex w-40 shrink-0 flex-col gap-2 bg-ink-3 p-4 transition-colors hover:bg-acc hover:text-ink sm:w-auto">
          <span className="font-mono text-[11px] font-semibold text-muted group-hover:text-ink">MÓDULO {pad(i + 1)}</span>
          <span className="font-display text-[26px] uppercase leading-none">{m.label}</span>
          <span className="font-mono text-[11px] font-semibold text-acc group-hover:text-ink">{m.info}</span>
        </Link>
      ))}
    </nav>
  );
}

/* ───────────── Cabeçalho dos módulos ───────────── */

export function ModuleHeader({ n, code, title, accent, action }: { n: number; code: string; title: string; accent?: string; action?: { to: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
      <span aria-hidden className="stroke-num font-display text-[64px] leading-[0.8] sm:text-[80px]">
        {pad(n)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="font-mono text-[11px] font-bold text-acc">&gt; {code}</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="font-display text-4xl uppercase leading-none sm:text-[44px]">
            {title} {accent && <span className="text-acc">{accent}</span>}
          </h2>
          <span aria-hidden className="hidden min-w-8 flex-1 border-t border-dashed border-line-soft sm:block" />
          {action && (
            <Link to={action.to} className="-my-3 inline-block py-3 font-mono text-xs font-bold text-acc hover:text-paper">
              {action.label} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── M03 · Notícias: feed tático (1 lead + intel) ───────────── */

export function NewsFeed({ posts }: { posts: PostView[] }) {
  if (!posts.length) return <EmptyModule />;
  const [lead, ...rest] = posts;
  if (!lead) return null;
  return (
    <div className="flex flex-col gap-5">
      <Link to={lead.url} className="group ch flex flex-col bg-ink-2 transition-colors hover:bg-ink-3 md:flex-row">
        <Art variant={lead.art} image={lead.image} className="h-56 md:h-auto md:w-1/2 md:min-h-[300px]">
          <Hud left="> INTEL PRIORITÁRIA" />
        </Art>
        <div className="flex flex-col justify-center gap-4 p-6 md:w-1/2 md:p-8">
          <Kicker>
            {"// "}
            {lead.kicker} · {lead.ago}
          </Kicker>
          <h3 className="font-display text-4xl uppercase leading-[0.95] transition-colors group-hover:text-acc sm:text-5xl">{lead.title}</h3>
          <p className="text-body">{lead.excerpt}</p>
          <span className="font-mono text-[11px] font-semibold text-muted">{platformsText(lead.platforms)}</span>
        </div>
      </Link>
      <ol className="grid gap-px bg-line sm:grid-cols-2">
        {rest.map((p, i) => (
          <li key={p.url} className="bg-ink">
            <Link to={p.url} className="group flex h-full gap-4 p-5 transition-colors hover:bg-ink-2">
              <span className="font-mono text-xs font-bold text-acc">{pad(i + 2)}</span>
              <span className="flex flex-col gap-2">
                <span className="font-mono text-[11px] font-semibold text-muted">
                  {p.timeLabel} · {p.ago}
                </span>
                <span className="font-display text-[22px] uppercase leading-[1.05] transition-colors group-hover:text-acc">{p.title}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ───────────── M04 · Reviews: placar com medidor ───────────── */

function ScoreMeter({ score }: { score: number }) {
  return (
    <span aria-hidden className="flex gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={cx("h-2.5 flex-1", i < Math.round(score) ? "bg-acc" : "bg-line")} />
      ))}
    </span>
  );
}

export function ReviewBoard({ posts }: { posts: PostView[] }) {
  if (!posts.length) return <EmptyModule />;
  return (
    <div className="rail -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:pb-0">
      {posts.map((p) => (
        <Link key={p.url} to={p.url} className="group ch flex w-[82%] shrink-0 flex-col bg-ink-2 transition-colors hover:bg-ink-3 sm:w-[300px] md:w-auto">
          <Art variant={p.art} image={p.image} className="h-36">
            <Hud left="> CONSENSO DA CRÍTICA" />
          </Art>
          <div className="flex flex-1 flex-col gap-4 p-5">
            <div className="flex items-end justify-between gap-4">
              <span className="font-display text-[72px] leading-[0.8] text-acc" aria-label={p.review ? `Média da crítica ${formatScore(p.review.score)}` : undefined}>
                {p.review ? formatScore(p.review.score) : "—"}
              </span>
              <span className="pb-1 text-right font-mono text-[11px] font-semibold text-muted">
                MÉDIA DE
                <br />
                {p.review ? `${p.review.critics.length} ANÁLISES` : "DE 10"}
              </span>
            </div>
            {p.review && <ScoreMeter score={p.review.score} />}
            <h3 className="font-display text-2xl uppercase leading-[1.02] transition-colors group-hover:text-acc">{p.title}</h3>
            <span className="font-mono text-[11px] font-semibold text-muted">{platformsText(p.platforms)}</span>
            {p.review && <p className="mt-auto text-sm leading-relaxed text-body">“{p.review.verdict}”</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ───────────── M05 · Lançamentos: contagem regressiva ───────────── */

export function Countdown({ releases }: { releases: Release[] }) {
  if (!releases.length) return <p className="text-body">Nenhum lançamento previsto para os próximos dias.</p>;
  return (
    <Rail label="Próximos lançamentos">
      {releases.map((r, i) => (
        <Link key={r.game.slug} to={`/jogos/${r.game.slug}`} className="group relative flex w-[230px] shrink-0 flex-col">
          {/* Linha do tempo */}
          <span aria-hidden className="relative mb-4 block h-px bg-line-soft">
            <span className={cx("absolute -top-1.5 left-0 h-3 w-3", i === 0 ? "bg-acc" : "border border-acc bg-ink")} />
          </span>
          <span className="ch flex flex-1 flex-col gap-3 bg-ink-2 p-5 transition-colors group-hover:bg-acc group-hover:text-ink">
            <span className="font-mono text-[11px] font-bold text-acc group-hover:text-ink">
              {r.weekday.toUpperCase()} · {r.day} {r.monthShort}
            </span>
            <span className="font-display text-[56px] leading-[0.85]">
              {r.daysLeft <= 0 ? "HOJE" : `T-${pad(r.daysLeft)}`}
            </span>
            <span className="font-mono text-[11px] font-semibold text-muted group-hover:text-ink">{r.daysLeft === 1 ? "DIA PARA O LANÇAMENTO" : "DIAS PARA O LANÇAMENTO"}</span>
            <span className="mt-2 font-display text-[26px] uppercase leading-none">{r.game.name}</span>
            <span className="font-mono text-[11px] font-semibold text-muted group-hover:text-ink">{platformsText(r.game.platforms)}</span>
          </span>
        </Link>
      ))}
    </Rail>
  );
}

/* ───────────── M06 · Guias: manual de missão ───────────── */

export function MissionManual({ posts }: { posts: PostView[] }) {
  if (!posts.length) return <EmptyModule />;
  return (
    <ol className="grid gap-4 lg:grid-cols-2">
      {posts.map((p, i) => (
        <li key={p.url}>
          <Link to={p.url} className="group ch flex h-full items-start gap-4 border-l-4 border-acc bg-ink-2 p-5 transition-colors hover:bg-ink-3 sm:items-center">
            <span className="flex shrink-0 flex-col font-mono text-[11px] font-bold text-muted">
              MISSÃO
              <span className="font-display text-5xl leading-none text-acc">{pad(i + 1)}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-2.5">
              <span className="font-display text-2xl uppercase leading-[1.02] transition-colors group-hover:text-acc">{p.title}</span>
              <span className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] font-semibold text-muted">
                <span>
                  TEMPO <span className="text-paper">{p.readMinutes} MIN</span>
                </span>
                <span>
                  ALVO <span className="text-paper">{platformsText(p.platforms.slice(0, 2))}</span>
                </span>
              </span>
            </span>
            <span aria-hidden className="chs hidden shrink-0 bg-acc px-3 py-2 font-mono text-[11px] font-bold text-ink sm:inline-block">INICIAR →</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/* ───────────── M07 · Artigos: arquivo em pôsteres ───────────── */

export function ArchiveRail({ posts }: { posts: PostView[] }) {
  if (!posts.length) return <EmptyModule />;
  return (
    <Rail label="Arquivo de artigos">
      {posts.map((p, i) => (
        <Link key={p.url} to={p.url} className="group ch relative flex h-[380px] w-[260px] shrink-0 flex-col justify-end bg-ink-2">
          <Art variant={p.art} image={p.image} className="absolute inset-0 transition-transform duration-300 group-hover:scale-105" />
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-ink from-15% to-transparent" />
          <Hud left={`> ARQUIVO ${pad(i + 1)}`} right={p.tag?.toUpperCase()} />
          <div className="relative flex flex-col gap-2 p-5">
            <span className="font-mono text-[11px] font-semibold text-muted">{p.readMinutes} MIN DE LEITURA</span>
            <h3 className="font-display text-[28px] uppercase leading-[0.98] transition-colors group-hover:text-acc">{p.title}</h3>
          </div>
        </Link>
      ))}
    </Rail>
  );
}

/* ───────────── M08 · Promoções e grátis: loot ───────────── */

export function LootDrop({ free, promos }: { free: FreeGame[]; promos: PostView[] }) {
  if (!free.length && !promos.length) return <EmptyModule children={"Nenhuma promoção ativa no momento."} />;
  return (
    <div className="flex flex-wrap gap-5">
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3">
        <h3 className="font-mono text-xs font-bold text-acc">&gt; LOOT GRÁTIS DETECTADO</h3>
        {free.length === 0 && <p className="text-body">Nenhum jogo grátis no momento.</p>}
        {free.slice(0, 3).map((g) => (
          <a
            key={`${g.store}-${g.name}`}
            href={g.postUrl ?? g.url}
            {...(g.postUrl ? {} : { target: "_blank", rel: "nofollow noopener" })}
            className="group ch flex bg-acc text-ink"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1 p-5">
              <span className="font-mono text-[11px] font-bold opacity-70">{g.store.toUpperCase()}</span>
              <span className="font-display text-[32px] uppercase leading-none">{g.name}</span>
              <span className="font-mono text-[11px] font-bold">{g.platform.toUpperCase()} · RESGATE GRÁTIS</span>
            </span>
            <span aria-hidden className="ticket-cut w-0.5" />
            <span className="flex w-28 shrink-0 flex-col items-center justify-center p-4 text-center">
              <span className="font-mono text-[11px] font-bold opacity-70">EXPIRA EM</span>
              <span className="font-display text-5xl leading-none">{pad(Math.max(0, g.daysLeft))}</span>
              <span className="font-mono text-[11px] font-bold">{g.daysLeft === 1 ? "DIA" : "DIAS"}</span>
            </span>
          </a>
        ))}
      </div>
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3">
        <h3 className="font-mono text-xs font-bold text-warn">&gt; DESCONTOS ATIVOS</h3>
        {promos.map((p) => (
          <Link key={p.url} to={p.url} className="group ch flex gap-4 border border-warn/40 bg-ink-2 p-4 transition-colors hover:bg-ink-3">
            <Art variant="d" image={p.image} className="chs h-20 w-24 shrink-0" />
            <span className="flex min-w-0 flex-col gap-1.5">
              <span className="font-mono text-[11px] font-bold text-warn">
                {p.kicker.toUpperCase()} · {p.ago}
              </span>
              <span className="font-display text-[22px] uppercase leading-[1.02] transition-colors group-hover:text-warn">{p.title}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ───────────── M09 · Seletor de plataforma ───────────── */

export function PlatformSelect({ platforms = PLATFORMS }: { platforms?: Platform[] }) {
  return (
    <nav aria-label="Plataformas" className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
      {platforms.map((p, i) => (
        <Link key={p.slug} to={`/plataforma/${p.slug}`} className="group ch flex flex-col gap-6 bg-ink-2 p-5 transition-colors hover:bg-acc hover:text-ink">
          <span className="flex justify-between font-mono text-[11px] font-bold text-muted group-hover:text-ink">
            <span>P{i + 1}</span>
            <span>SELECIONAR</span>
          </span>
          <span className="font-display text-2xl uppercase leading-none sm:text-3xl">{p.label}</span>
        </Link>
      ))}
    </nav>
  );
}
