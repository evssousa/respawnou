// Legendas do vídeo por rede (montadas por código, sem IA). Funções puras.
import { SOCIAL } from "~/social/config";
import { hashtags, montarLegenda } from "~/social/core/legenda";
import type { EntradaSocial, Modelo } from "~/social/tipos";
import { VIDEO } from "./config";
import type { Roteiro } from "./roteiro";

export interface LegendasVideo {
  instagram: string;
  youtube: { title: string; description: string };
  tiktok: string;
}

const cortar = (t: string, max: number) => (t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`);

export function legendasDoVideo(e: EntradaSocial, modelo: Modelo, roteiro: Roteiro, urlMateria: string): LegendasVideo {
  const tags = hashtags(e, modelo);
  const sufixo = " #Shorts";
  return {
    instagram: montarLegenda(e, modelo),
    youtube: {
      title: `${cortar(roteiro.titulo_curto, 100 - sufixo.length)}${sufixo}`,
      description: [e.excerpt, `Matéria completa: ${urlMateria}?utm_source=youtube&utm_medium=shorts`, VIDEO.avisoVoz, tags.join(" ")].filter(Boolean).join("\n\n"),
    },
    tiktok: [roteiro.gancho, `Matéria completa no link do perfil. Siga @${SOCIAL.handle}.`, [...tags, `#${VIDEO.hashtagTikTokExtra}`].join(" ")].join("\n\n"),
  };
}
