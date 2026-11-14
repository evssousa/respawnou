import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ARCADE_CATEGORIES, readRecord, type ArcadeGame } from "~/lib/arcade";
import { ArcadeThumb } from "./ArcadeThumb";

/** Recorde de cada jogo: fica no navegador, por isso só é lido depois de montar. */
export function useArcadeRecords(games: ArcadeGame[]) {
  const [best, setBest] = useState<Record<string, number>>({});
  // Depende só dos nomes: quem chama pode montar a lista de novo a cada renderização.
  const key = games.map((g) => g.slug).join(",");
  useEffect(() => setBest(Object.fromEntries(key.split(",").map((slug) => [slug, readRecord(slug).best]))), [key]);
  return best;
}

export function ArcadeCard({ game, best, as: Tag = "h2" }: { game: ArcadeGame; best?: number; as?: "h2" | "h3" }) {
  return (
    <Link to={`/arcade/${game.slug}`} className="group ch flex h-full flex-col bg-ink-2 transition-colors hover:bg-ink-3">
      <ArcadeThumb slug={game.slug} className="block aspect-video w-full" />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="font-mono text-[11px] font-bold uppercase text-acc">{ARCADE_CATEGORIES[game.category]}</span>
        <Tag className="font-display text-3xl uppercase leading-none group-hover:text-acc">{game.name}</Tag>
        <p className="text-body">{game.tagline}</p>
        <div className="mt-auto flex items-center justify-between pt-3 font-mono text-xs font-bold">
          <span className="text-muted">
            {best ? (
              <>
                SEU RECORDE <span className="text-paper">{best}</span>
              </>
            ) : (
              "NOVO"
            )}
          </span>
          <span className="text-acc">JOGAR →</span>
        </div>
      </div>
    </Link>
  );
}
