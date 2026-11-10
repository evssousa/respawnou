# Respawnou

Portal de notícias de games em português, com publicação automática de conteúdo: notícias, reviews, guias, listas, lançamentos e promoções para PC, PlayStation, Xbox, Nintendo Switch e mobile.

> **Status:** frontend completo rodando com **dados de exemplo** (todos os jogos e notícias atuais são fictícios). O banco MySQL e o domínio `respawnou.com.br` serão conectados na próxima etapa.

## Stack

- **React 19** + **React Router 8** (modo framework, com SSR para SEO)
- **Tailwind CSS 4**
- **TypeScript**
- Hospedagem planejada: **Hostinger Business** (app Node.js + MySQL)

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

Copie `.env.example` para `.env` para mudar a URL pública usada em canonical, Open Graph, sitemap e RSS.

## Estrutura

```
app/
├── root.tsx              # documento HTML, header, footer, página de erro/404
├── routes.ts             # mapa de rotas
├── routes/               # páginas e recursos (sitemap.xml, rss.xml, robots.txt)
├── components/           # UI do tema "Manchete Brutal"
└── lib/
    ├── site.ts           # nome, URL, editorias e plataformas
    ├── types.ts          # Post, Game, Release, FreeGame
    ├── content.server.ts # camada de dados (só servidor)
    ├── mock-data.ts      # dados de exemplo
    ├── format.ts         # datas em pt-BR (fuso de Brasília)
    └── seo.ts            # meta tags, Open Graph e canonical
```

### Camada de dados

As páginas só falam com `app/lib/content.server.ts` (`listPosts`, `getPost`, `getReleases`, …). Hoje essas funções leem `mock-data.ts`. Para ligar o banco, basta reimplementá-las com consultas ao MySQL, sem mexer nas rotas nem nos componentes.

## Rotas

| Rota | Página |
|---|---|
| `/` | Home: destaque, últimas, mais lidas, grátis, lançamentos, reviews e guias |
| `/noticias`, `/artigos`, `/reviews`, `/guias`, `/promocoes` | Listagem da editoria (filtro `?plataforma=` e paginação `?pagina=`) |
| `/:editoria/:slug` | Matéria (com veredito e nota nas reviews) |
| `/jogos/:slug` | Ficha do jogo e tudo publicado sobre ele |
| `/plataforma/:slug` | Conteúdo e próximos lançamentos por plataforma |
| `/lancamentos` | Calendário de lançamentos |
| `/busca?q=` | Busca em matérias e jogos |
| `/sobre`, `/contato`, `/privacidade` | Institucionais |
| `/sitemap.xml`, `/rss.xml`, `/robots.txt` | SEO e feed |

## Próximos passos

- [ ] Banco MySQL na Hostinger + implementação real de `content.server.ts`
- [ ] API protegida para o worker de publicação automática (GitHub Actions + Gemini)
- [ ] Imagens de capa reais e imagem Open Graph padrão
- [ ] Deploy na Hostinger e domínio `respawnou.com.br`
- [ ] Contas de usuário: login, comentários, favoritos e alertas de lançamento (os espaços já existem no layout, marcados como "em breve")
