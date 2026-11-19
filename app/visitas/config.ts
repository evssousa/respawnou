// Configuração do contador de visitas ESPECÍFICA DO SITE (respawnou). Ao copiar o módulo para outro site, este arquivo,
// `db.ts`, `site.server.ts` e `ui/visitas.css` são os que mudam. Dados puros: nada de banco aqui.
import type { TipoPagina } from "./core/caminho";

export const VISITAS = {
  site: "Respawnou",
  /** Referrer destes endereços conta como navegação interna. */
  hosts: ["respawnou.com.br", "www.respawnou.com.br", "localhost"],
  /** Cookie da sessão do admin: quando presente, a visita não é contada. */
  cookieAdmin: "__respawnou_admin",
  /** Quantos dias guardar páginas e origens (os totais por dia ficam sem prazo). */
  retencaoDias: 400,
  /** A ordem importa: o primeiro tipo que bate vence. */
  tipos: [
    { tipo: "inicio", rotulo: "Página inicial", re: /^\/$/ },
    { tipo: "materia", rotulo: "Matéria", re: /^\/(noticias|artigos|reviews|guias|promocoes)\/[^/]+$/ },
    { tipo: "jogo", rotulo: "Ficha de jogo", re: /^\/jogos\/[^/]+$/ },
    { tipo: "arcade-jogo", rotulo: "Jogo do Arcade", re: /^\/arcade\/[^/]+$/ },
    { tipo: "plataforma", rotulo: "Plataforma", re: /^\/plataforma\/[^/]+$/ },
    { tipo: "lista", rotulo: "Lista", re: /^\/(noticias|artigos|reviews|guias|promocoes|lancamentos|arcade|busca)$/ },
  ] as TipoPagina[],
  /** Abas do "Páginas mais vistas". `tipos: null` = todos. */
  filtros: [
    { id: "tudo", rotulo: "Tudo", tipos: null },
    { id: "materias", rotulo: "Matérias", tipos: ["materia"] },
    { id: "jogos", rotulo: "Jogos", tipos: ["jogo", "plataforma"] },
    { id: "arcade", rotulo: "Arcade", tipos: ["arcade-jogo"] },
    { id: "outras", rotulo: "Outras", tipos: ["inicio", "lista", "outra"] },
  ] as { id: string; rotulo: string; tipos: string[] | null }[],
  /** Contadores por matéria: o endereço bate com `re` e o `sql` soma as visitas (primeiro parâmetro = quantidade). */
  contadores: [
    {
      re: /^\/(noticias|artigos|reviews|guias|promocoes)\/([^/]+)$/,
      sql: "UPDATE posts SET views = views + ? WHERE section = ? AND slug = ? AND status = 'published'",
      args: (m: RegExpMatchArray) => [m[1], m[2]],
    },
  ],
  /** Títulos fixos das páginas que não são de um conteúdo. */
  fixos: {
    "/": "Página inicial",
    "/noticias": "Notícias",
    "/artigos": "Artigos",
    "/reviews": "Reviews",
    "/guias": "Guias",
    "/promocoes": "Promoções",
    "/lancamentos": "Lançamentos",
    "/arcade": "Arcade",
    "/busca": "Busca",
    "/sobre": "Sobre",
    "/contato": "Contato",
    "/anuncie": "Anuncie",
    "/faq": "Perguntas frequentes",
    "/privacidade": "Privacidade",
    "/termos": "Termos de uso",
    "/cookies": "Cookies",
    "/politica-editorial": "Política editorial",
    "/como-avaliamos": "Como avaliamos",
    "/acessibilidade": "Acessibilidade",
    "/mapa-do-site": "Mapa do site",
  } as Record<string, string>,
};

export type ConfigVisitas = typeof VISITAS;
