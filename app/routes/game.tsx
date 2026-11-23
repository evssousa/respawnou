import { data, Link } from "react-router";
import type { Route } from "./+types/game";
import { AdSlot } from "~/components/AdSlot";
import { PostGrid, ScoreBadge } from "~/components/cards";
import { Gallery } from "~/components/Gallery";
import { Art, Hud, Kicker, PlatformTags, SectionTitle } from "~/components/ui";
import { getGame, getSimilarGames, listPosts } from "~/lib/content.server";
import { daysUntil, formatDate } from "~/lib/format";
import { gameFaq, languageText, parseRequirements, releaseText } from "~/lib/game-faq";
import { seo } from "~/lib/seo";
import { absoluteUrl, PLATFORMS, SITE } from "~/lib/site";
import type { Game } from "~/lib/types";

export async function loader({ params }: Route.LoaderArgs) {
  const game = await getGame(params.slug);
  if (!game) throw data("Jogo não encontrado", { status: 404 });
  const [posts, similar] = await Promise.all([listPosts({ gameSlug: game.slug, perPage: 12 }), getSimilarGames(game.similarIgdb, 4)]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = game.releaseDate ? game.releaseDate >= today : Boolean(game.releaseLabel);
  const guide = posts.items.find((p) => p.url.startsWith("/guias/")) ?? null;
  const consensus = posts.items.find((p) => p.url.startsWith("/reviews/")) ?? null;
  return { game, posts: posts.items, upcoming, similar: similar.filter((g) => g.slug !== game.slug), guideUrl: guide?.url ?? null, consensusUrl: consensus?.url ?? null };
}

const platformLabels = Object.fromEntries(PLATFORMS.map((p) => [p.slug, p.label]));

/** Descrição da ficha: a do IGDB traduzida ou, enquanto não há, uma frase montada só com os dados. */
function describe(game: Game) {
  if (game.description) return game.description;
  const genres = game.genres.length ? `de ${game.genres.slice(0, 2).join(" e ").toLowerCase()} ` : "";
  const platforms = game.platforms.map((p) => platformLabels[p] ?? p);
  const on = platforms.length ? ` para ${platforms.join(", ").replace(/, ([^,]*)$/, " e $1")}` : "";
  const by = game.developer ? `, da ${game.developer}` : "";
  const when = game.releaseDate ? `, com lançamento em ${formatDate(game.releaseDate)}` : game.releaseLabel && game.releaseLabel !== "sem data" ? `, previsto para ${game.releaseLabel}` : "";
  return `${game.name} é um jogo ${genres}${on}${by}${when}.`.replace(/\s+/g, " ");
}

/** Title (até ~48 caracteres antes do sufixo do site): só promete o que a ficha tem. Nunca diz "review". */
function titleOf(game: Game, upcoming: boolean) {
  const parts = upcoming ? ["data de lançamento", "plataformas", ...(game.pcMin ? ["requisitos"] : [])] : ["plataformas", ...(game.pcMin ? ["requisitos de PC"] : []), ...((game.criticCount ?? 0) >= 3 ? ["nota da crítica"] : [])];
  for (let n = parts.length; n >= 1; n--) {
    const t = `${game.name}: ${parts.slice(0, n).join(parts.length > 1 && n > 1 ? ", " : "")}`.replace(/, ([^,]*)$/, " e $1");
    if (t.length <= 48) return t;
  }
  return `${game.name}: ficha do jogo`;
}

/** Meta description por código (120 a 158 caracteres, sem inventar nada). */
function metaOf(game: Game, upcoming: boolean) {
  const plats = game.releases?.length ? [...new Set(game.releases.map((r) => r.p))].join(", ").replace(/, ([^,]*)$/, " e $1") : game.platforms.map((p) => platformLabels[p] ?? p).join(", ").replace(/, ([^,]*)$/, " e $1");
  const when = game.releaseDate ? formatDate(game.releaseDate) : game.releaseLabel && game.releaseLabel !== "sem data" ? game.releaseLabel : null;
  const lead = when ? `${game.name} ${upcoming ? "sai" : "saiu"} ${game.releaseDate ? "em " : ""}${when}${plats ? ` para ${plats}` : ""}.` : `${game.name}${plats ? `: ${plats}` : ""}.`;
  const tail = [game.pcMin ? "requisitos de PC" : "", game.languages ? "idiomas" : "", game.trailer ? "trailer" : ""].filter(Boolean);
  const text = `${lead} Veja ${tail.length ? tail.join(", ").replace(/, ([^,]*)$/, " e $1") + " e " : ""}o que já se sabe.`;
  return text.length > 158 ? `${lead} Veja o que já se sabe.` : text;
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { game, posts, upcoming } = loaderData;
  const url = absoluteUrl(`/jogos/${game.slug}`);
  const platforms = game.releases?.length ? [...new Set(game.releases.map((r) => r.p))] : game.platforms.map((p) => PLATFORMS.find((x) => x.slug === p)?.label ?? p);
  const lang = game.languages;
  return [
    ...seo({
      title: titleOf(game, upcoming),
      description: metaOf(game, upcoming),
      path: `/jogos/${game.slug}`,
      image: game.image ?? undefined,
      // Ficha só com dados fica fora do Google até ter matéria nossa ou ser liberada (app/lib/game-index.ts).
      noindex: posts.length === 0 && !game.indexFrom,
    }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "VideoGame",
            name: game.name,
            description: describe(game),
            url,
            ...(game.image ? { image: game.image } : {}),
            genre: game.genres,
            gamePlatform: platforms,
            ...(game.modes?.length ? { playMode: game.modes.map((m) => (/um jogador/i.test(m) ? "SinglePlayer" : /multi|mmo|battle|tela dividida/i.test(m) ? "MultiPlayer" : /cooperativ/i.test(m) ? "CoOp" : m)) } : {}),
            ...(lang && (lang.interface || lang.legendas) ? { inLanguage: ["pt-BR"] } : {}),
            ...(game.developer ? { author: { "@type": "Organization", name: game.developer } } : {}),
            ...(game.publisher ? { publisher: { "@type": "Organization", name: game.publisher } } : {}),
            ...(game.releaseDate ? { datePublished: game.releaseDate } : {}),
            ...(game.trailer
              ? {
                  trailer: {
                    "@type": "VideoObject",
                    name: `Trailer de ${game.name}`,
                    embedUrl: `https://www.youtube.com/embed/${game.trailer}`,
                    thumbnailUrl: `https://i.ytimg.com/vi/${game.trailer}/hqdefault.jpg`,
                    uploadDate: (game.steamSyncedAt ?? new Date().toISOString()).slice(0, 10),
                    description: `Trailer de ${game.name}`,
                  },
                }
              : {}),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: SITE.url },
              { "@type": "ListItem", position: 2, name: "Lançamentos", item: absoluteUrl("/lancamentos") },
              { "@type": "ListItem", position: 3, name: game.name, item: url },
            ],
          },
        ],
      },
    },
  ];
}

function ReqCard({ title, text }: { title: string; text: string }) {
  const rows = parseRequirements(text);
  return (
    <div className="ch flex flex-col gap-3 bg-ink-2 p-5">
      <h3 className="font-mono text-xs font-semibold text-acc">&gt; {title}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map((r, i) =>
          r.label ? (
            <div key={i} className="contents">
              <dt className="text-muted">{r.label}</dt>
              <dd className="min-w-0 break-words">{r.value}</dd>
            </div>
          ) : (
            <dd key={i} className="col-span-2 break-words text-body">
              {r.value}
            </dd>
          ),
        )}
      </dl>
    </div>
  );
}

export default function GamePage({ loaderData }: Route.ComponentProps) {
  const { game, posts, upcoming, similar, guideUrl, consensusUrl } = loaderData;
  // Miniatura leve na página; a versão 1080p só carrega ao ampliar.
  const shots = (game.screenshots ?? []).map((src, i) => ({
    thumb: src,
    full: src.replace(/\/t_[a-z0-9_]+\//, "/t_1080p/"),
    alt: `${game.name}: imagem ${i + 1}`,
  }));
  const faq = gameFaq(game, upcoming);
  const lang = languageText(game);
  const showScore = (game.criticCount ?? 0) >= 3 && game.criticScore != null;
  const steamDate = game.steamSyncedAt ? formatDate(game.steamSyncedAt.slice(0, 10)) : null;
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-14 px-4 pt-10 sm:px-6">
      <section className="flex flex-wrap gap-8">
        <Art variant={game.art} image={game.image ? { src: game.image, alt: `Arte de ${game.name}` } : undefined} eager className="ch min-h-[280px] flex-[1_1_480px]">
          <Hud left="> FICHA DO JOGO" right={upcoming ? "STATUS: EM BREVE" : "STATUS: DISPONÍVEL"} />
        </Art>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
          <Kicker>{"// JOGO · "}{game.genres.join(" · ")}</Kicker>
          <h1 className="font-display text-6xl uppercase leading-[0.9] sm:text-[96px]">{game.name}</h1>
          <p className="text-lg leading-relaxed text-body">{describe(game)}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-dashed border-line-soft py-4 text-sm">
            <dt className="font-mono text-xs font-semibold text-muted">LANÇAMENTO</dt>
            <dd>{game.releaseDate ? formatDate(game.releaseDate) : game.releaseLabel ? `Previsto: ${game.releaseLabel}` : "Já disponível"}</dd>
            {game.developer && (
              <>
                <dt className="font-mono text-xs font-semibold text-muted">ESTÚDIO</dt>
                <dd>{game.developer}</dd>
              </>
            )}
            {game.publisher && (
              <>
                <dt className="font-mono text-xs font-semibold text-muted">DISTRIBUIDORA</dt>
                <dd>{game.publisher}</dd>
              </>
            )}
            {game.franchise && (
              <>
                <dt className="font-mono text-xs font-semibold text-muted">FRANQUIA</dt>
                <dd>{game.franchise}</dd>
              </>
            )}
            {game.modes && game.modes.length > 0 && (
              <>
                <dt className="font-mono text-xs font-semibold text-muted">MODOS</dt>
                <dd>{game.modes.join(", ")}</dd>
              </>
            )}
            {game.priceBrl && (
              <>
                <dt className="font-mono text-xs font-semibold text-muted">PREÇO NA STEAM</dt>
                <dd>{game.priceBrl}</dd>
              </>
            )}
          </dl>
          <PlatformTags platforms={game.platforms} labels={platformLabels} />
        </div>
      </section>

      {game.releases && game.releases.length > 0 && (
        <section aria-labelledby="datas" className="flex flex-col gap-6">
          <SectionTitle code="CALENDÁRIO" accent="por plataforma">
            Lançamento
          </SectionTitle>
          <h2 id="datas" className="sr-only">
            Data de lançamento de {game.name} por plataforma
          </h2>
          <div className="ch bg-ink-2 p-5">
            <ul className="flex flex-col">
              {game.releases.map((r, i) => {
                const days = daysUntil(r.date);
                return (
                  <li key={r.p} className="flex min-h-11 items-center justify-between gap-4 border-b border-line last:border-b-0">
                    <span className="font-mono text-xs font-bold uppercase text-acc">{r.p}</span>
                    <span className="text-right text-paper">
                      {formatDate(r.date)}
                      {i === 0 && days > 0 && <span className="ml-3 text-sm text-muted">faltam {days} {days === 1 ? "dia" : "dias"}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {game.pcMin && game.pcRec && (
        <section className="flex flex-col gap-6">
          <SectionTitle code="HARDWARE" accent="de PC">
            Requisitos
          </SectionTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReqCard title="MÍNIMO" text={game.pcMin} />
            <ReqCard title="RECOMENDADO" text={game.pcRec} />
          </div>
          <p className="text-sm text-muted">Fonte: página do jogo na Steam{steamDate ? `, consultada em ${steamDate}` : ""}.</p>
          {guideUrl && (
            <Link to={guideUrl} className="font-mono text-xs font-semibold text-acc hover:text-paper">
              LER O GUIA COMPLETO →
            </Link>
          )}
        </section>
      )}

      {lang && game.languages && (
        <section className="flex flex-col gap-6">
          <SectionTitle code="IDIOMA" accent="do jogo">
            Português
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["INTERFACE", game.languages.interface],
                ["LEGENDAS", game.languages.legendas],
                ["ÁUDIO", game.languages.audio],
              ] as const
            ).map(([label, on]) => (
              <span key={label} className={`chs inline-flex min-h-9 items-center gap-2 border px-3 font-mono text-xs ${on ? "border-acc text-acc" : "border-line text-muted"}`}>
                {label} {on ? "✓" : "—"}
              </span>
            ))}
          </div>
          <p className="text-body">{lang}</p>
          <p className="text-sm text-muted">Fonte: {game.languages.fonte === "steam" ? "Steam" : "IGDB"}.</p>
        </section>
      )}

      {showScore && (
        <section className="flex flex-col gap-4">
          <SectionTitle code="IMPRENSA" accent="da crítica">
            Nota
          </SectionTitle>
          <div className="flex items-center gap-4">
            <ScoreBadge score={game.criticScore! / 10} />
            <p className="max-w-xl text-body">Média de {game.criticCount} análises da imprensa, segundo o IGDB.</p>
          </div>
          {consensusUrl && (
            <Link to={consensusUrl} className="font-mono text-xs font-semibold text-acc hover:text-paper">
              VER O CONSENSO DA CRÍTICA →
            </Link>
          )}
        </section>
      )}

      {(game.trailer || shots.length > 0) && (
        <section className="flex flex-col gap-6">
          <SectionTitle code="ARQUIVO VISUAL" accent={game.trailer ? "e imagens" : undefined}>
            {game.trailer ? "Trailer" : "Imagens"}
          </SectionTitle>
          {/* Desktop: trailer à esquerda e imagens 2×2 à direita, ocupando a largura toda. */}
          <div className={game.trailer && shots.length ? "grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}>
            {game.trailer && (
              <div className="ch aspect-video w-full overflow-hidden bg-ink-2">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${game.trailer}`}
                  title={`Trailer de ${game.name}`}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )}
            {/* Ao lado do trailer: 2 colunas e fileiras que esticam até a altura dele. */}
            {shots.length > 0 && (
              <Gallery
                images={shots}
                fill={Boolean(game.trailer)}
                className={game.trailer ? `grid-cols-2 lg:h-full ${shots.length > 4 ? "lg:grid-rows-3" : "lg:grid-rows-2"}` : "grid-cols-2 lg:grid-cols-4"}
              />
            )}
          </div>
        </section>
      )}

      {faq.length >= 3 && (
        <section className="flex flex-col gap-6">
          <SectionTitle code="FAQ" accent={`sobre ${game.name}`}>
            Perguntas
          </SectionTitle>
          <div className="flex max-w-3xl flex-col gap-6">
            {faq.map((f) => (
              <div key={f.q} className="flex flex-col gap-2">
                <h3 className="font-display text-2xl uppercase leading-none">{f.q}</h3>
                <p className="text-body">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="flex flex-col gap-6">
          <SectionTitle code="RADAR" accent="parecidos">
            Jogos
          </SectionTitle>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {similar.map((g) => (
              <li key={g.slug}>
                <Link to={`/jogos/${g.slug}`} className="group chs flex h-full flex-col bg-ink-2 hover:bg-ink-3">
                  <Art variant={g.art} image={g.cover || g.image ? { src: (g.cover ?? g.image)!, alt: `Capa de ${g.name}` } : undefined} className="aspect-video w-full" />
                  <span className="flex flex-col gap-1 p-3">
                    <span className="font-display text-xl uppercase leading-none group-hover:text-acc">{g.name}</span>
                    {releaseText(g) && <span className="text-xs text-muted">{g.releaseDate ? formatDate(g.releaseDate) : g.releaseLabel}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(posts.length > 0 || game.indexFrom) && <AdSlot kind="horizontal" place="ficha-1" />}

      <section className="flex flex-col gap-6">
        <SectionTitle code="ARQUIVOS DO JOGO" accent={`sobre ${game.name}`}>Tudo</SectionTitle>
        {posts.length ? (
          <PostGrid posts={posts} />
        ) : (
          <p className="text-body">
            Ainda não publicamos nada sobre este jogo.{" "}
            <Link to="/lancamentos" className="text-acc underline">
              Veja o calendário completo de lançamentos
            </Link>
            .
          </p>
        )}
      </section>

      {game.igdbUrl && (
        <p className="font-mono text-[11px] text-muted">
          DADOS E IMAGENS DA FICHA:{" "}
          <a href={game.igdbUrl} target="_blank" rel="noopener" className="underline hover:text-acc">
            IGDB.COM
          </a>
          {game.pcMin ? " · STEAM" : ""}
        </p>
      )}
    </main>
  );
}
