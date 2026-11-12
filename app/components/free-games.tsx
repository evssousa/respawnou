// Jogos grátis por tempo limitado (página /promocoes). Dados: app/lib/robot/offers.server.ts.
import { Link } from "react-router";
import type { FreeGame } from "~/lib/types";

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

function FreeCard({ g }: { g: FreeGame }) {
  const ends =
    g.daysLeft <= 0
      ? `ACABA HOJE ÀS ${g.untilTime}${g.hoursLeft <= 6 ? ` (${g.hoursLeft} H)` : ""}`
      : `ACABA EM ${pad(g.daysLeft)} ${g.daysLeft === 1 ? "DIA" : "DIAS"}`;
  return (
    <li className="ch flex min-w-0 flex-col bg-ink-2">
      {g.image ? (
        <img src={g.image} alt={`Arte de ${g.name}`} loading="lazy" className="aspect-[16/9] w-full object-cover" />
      ) : (
        <div aria-hidden className="aspect-[16/9] w-full bg-ink-3" />
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="flex flex-wrap justify-between gap-2 font-mono text-[11px] font-bold">
          <span className="text-acc">{g.store.toUpperCase()}</span>
          <span className="text-warn">{ends}</span>
        </p>
        <h3 className="font-display text-[28px] uppercase leading-none">{g.name}</h3>
        <p className="text-sm text-body">
          {g.platform} · grátis até {g.untilLabel}, às {g.untilTime}
          {g.worth && (
            <>
              {" "}
              · preço normal <s className="text-muted">{g.worth}</s>
            </>
          )}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <a href={g.url} target="_blank" rel="nofollow noopener" className="chs bg-acc px-4 py-3 font-mono text-xs font-bold text-ink hover:bg-paper">
            RESGATAR NA LOJA ↗
          </a>
          {g.postUrl && (
            <Link to={g.postUrl} className="chs border border-line-soft px-4 py-3 font-mono text-xs font-bold text-paper hover:border-acc hover:text-acc">
              LER A MATÉRIA
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

export function FreeGamesBoard({ free, upcoming }: { free: FreeGame[]; upcoming: FreeGame[] }) {
  if (!free.length && !upcoming.length) return null;
  const sources = new Set([...free, ...upcoming].map((g) => g.source));
  return (
    <section aria-labelledby="gratis-agora" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs font-bold text-acc">&gt; LOOT GRÁTIS DETECTADO</p>
        <h2 id="gratis-agora" className="font-display text-4xl uppercase leading-none">
          Grátis <span className="text-acc">agora</span>
        </h2>
        <p className="max-w-2xl text-body">Jogos que ficam na sua conta para sempre se você resgatar dentro do prazo. A lista se atualiza sozinha.</p>
      </div>
      {free.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {free.map((g) => (
            <FreeCard key={`${g.store}-${g.name}`} g={g} />
          ))}
        </ul>
      )}
      {upcoming.length > 0 && (
        <div className="ch flex flex-col gap-2 border border-line bg-ink p-5">
          <p className="font-mono text-xs font-bold text-warn">&gt; PRÓXIMOS GRÁTIS JÁ ANUNCIADOS</p>
          <ul className="flex flex-col gap-1.5">
            {upcoming.map((g) => (
              <li key={`${g.store}-${g.name}`} className="text-sm text-body">
                <span className="font-semibold text-paper">{g.name}</span> · {g.store}, de {g.startsLabel} até {g.untilLabel}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="font-mono text-[11px] text-muted">
        DADOS: {sources.has("epic") ? "EPIC GAMES STORE" : ""}
        {sources.has("epic") && sources.has("gamerpower") ? " E " : ""}
        {sources.has("gamerpower") && (
          <a href="https://www.gamerpower.com" target="_blank" rel="noopener" className="underline hover:text-acc">
            GAMERPOWER
          </a>
        )}
        . PRAZOS E DISPONIBILIDADE DEPENDEM DE CADA LOJA.
      </p>
    </section>
  );
}
