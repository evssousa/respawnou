# Respawnou

Portal de notícias de games em português, com publicação automática de conteúdo: notícias, reviews, guias, listas, lançamentos e promoções para PC, PlayStation, Xbox, Nintendo Switch e mobile.

> **Status:** frontend completo e camada MySQL pronta. Sem banco configurado, o site roda com **dados de exemplo** (fictícios). Plano, decisões e próximos passos ficam em [`docs/`](docs/README.md).

## Stack

- **React 19** + **React Router 8** (modo framework, com SSR para SEO)
- **Tailwind CSS 4**
- **TypeScript**
- **MySQL** (`mysql2`)
- Hospedagem: **Hostinger Business** (app Node.js + MySQL + Cron Jobs)

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:5173
```

Build de produção:

```bash
npm run build
npm start          # serve ./build na porta 3000 (ou $PORT)
npm run typecheck
```

Copie `.env.example` para `.env`. Sem as variáveis `DB_*`, o site usa os dados de exemplo.

Banco de dados:

```bash
npm run db:migrate   # aplica as migrations pendentes de db/migrations
npm run db:seed-dev  # preenche um banco de desenvolvimento com os dados de exemplo
```

## Estrutura

```
app/
├── root.tsx              # documento HTML, header, footer, página de erro/404
├── routes.ts             # mapa de rotas
├── routes/               # páginas e recursos (sitemap.xml, rss.xml, robots.txt)
├── components/           # UI do tema "Central de Comando" (home-modules.tsx = módulos da home)
└── lib/
    ├── site.ts           # nome, URL, editorias e plataformas
    ├── types.ts          # Post, Game, Release, FreeGame
    ├── content.server.ts # API de dados usada pelas rotas (só servidor)
    ├── db.server.ts      # conexão MySQL
    ├── repo/             # fontes de dados: mysql.server.ts e mock.server.ts
    ├── mock-data.ts      # dados de exemplo (fictícios)
    ├── format.ts         # datas em pt-BR (fuso de Brasília)
    └── seo.ts            # meta tags, Open Graph e canonical
```

### Camada de dados

As páginas só falam com `app/lib/content.server.ts` (`listPosts`, `getPost`, `getReleases`, …). Ele usa o MySQL quando `DB_NAME` e `DB_USER` estão definidos e, sem eles, os dados de exemplo. Detalhes em [`docs/arquitetura.md`](docs/arquitetura.md) e [`docs/banco-de-dados.md`](docs/banco-de-dados.md).

## Rotas

| Rota | Página |
|---|---|
| `/` | Home em módulos: transmissão principal + log, feed de notícias, placar de reviews, contagem regressiva de lançamentos, manual de guias, arquivo de artigos, loot (grátis e promoções), ranking e plataformas |
| `/noticias`, `/artigos`, `/reviews`, `/guias`, `/promocoes` | Listagem da editoria (filtro `?plataforma=` e paginação `?pagina=`) |
| `/:editoria/:slug` | Matéria (nas reviews: consenso da crítica, com média e link para cada análise) |
| `/jogos/:slug` | Ficha do jogo e tudo publicado sobre ele |
| `/plataforma/:slug` | Conteúdo e próximos lançamentos por plataforma |
| `/lancamentos` | Calendário de lançamentos |
| `/busca?q=` | Busca em matérias e jogos |
| `/sobre`, `/contato`, `/faq`, `/politica-editorial`, `/como-avaliamos`, `/anuncie` | Institucionais (lista em `DOC_PAGES`, `app/lib/site.ts`) |
| `/termos`, `/privacidade`, `/cookies`, `/acessibilidade`, `/mapa-do-site` | Legais (site informativo, sem CNPJ nem vendas) |
| `/sitemap.xml`, `/rss.xml`, `/robots.txt` | SEO e feed |

## Próximos passos

O status completo está em [`docs/README.md`](docs/README.md). Em resumo:

- [ ] Deploy na Hostinger (domínio `respawnou.com.br` em ativação), banco criado e migration rodada
- [ ] Robô de postagem automática: rota protegida + Cron Job da Hostinger + Gemini
- [ ] Painel administrativo em `/admin`
- [ ] Imagens de capa reais e imagem Open Graph padrão
- [ ] Search Console e pedido do AdSense
