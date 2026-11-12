# Arquitetura

## Stack

- React 19 + React Router 8 em modo framework, com SSR (`react-router build` / `react-router-serve`).
- Tailwind CSS 4 (tokens em `app/app.css`, tema "Central de Comando").
- TypeScript estrito. Vite 8.
- MySQL (Hostinger) via `mysql2`. Node 22 em produção (mínimo 20).

## Pastas

```
app/
  root.tsx               layout, cabeçalho fixo, rodapé, página de erro
  routes.ts              mapa de rotas (editorias registradas uma vez por slug)
  routes/                páginas e resource routes (sitemap, rss, robots)
  components/            Header, Footer, cards, módulos da home, StaticPage, ArcadeShell...
  arcade/                jogos do Arcade em canvas (engine.ts + um arquivo por jogo)
  lib/
    site.ts              configuração: editorias, plataformas, menu, páginas institucionais
    arcade.ts            catálogo do Arcade e recorde no localStorage
    types.ts             Post, Game, Review (consenso da crítica), FreeGame...
    format.ts            datas no fuso America/Sao_Paulo, notas, normalização de busca
    seo.ts               title, description, canonical, Open Graph
    content.server.ts    API de dados usada pelas rotas (paginação, rótulos de data)
    db.server.ts         pool MySQL + helpers (json, iso)
    repo/types.ts        contrato das fontes de dados
    repo/mock.server.ts  fonte em memória (mock-data.ts, tudo fictício)
    repo/mysql.server.ts fonte MySQL
db/migrations/           SQL versionado (NNN_nome.sql)
scripts/                 db-migrate, db-seed-dev (rodam com Node, sem build)
docs/                    este plano
```

## Camada de dados

- Rotas só importam `content.server.ts`. Ele escolhe a fonte:
  **MySQL** se `DB_NAME` e `DB_USER` existirem; senão **mock** (dados de exemplo).
- Rótulos relativos ("HÁ 3H", "T-02") são calculados no servidor para evitar diferença de
  hidratação entre servidor e navegador.
- Datas no banco: `DATETIME` em **UTC**. O pool usa `timezone: "Z"` e `dateStrings: true`;
  `iso()` converte para ISO. Datas só de dia (`release_date`) ficam `AAAA-MM-DD`.
- Colunas JSON: o MariaDB devolve texto, o MySQL 8 devolve objeto; `json()` trata os dois.
- Só aparecem posts com `status = 'published'` e `published_at <= agora` (dá para agendar).
- Busca: `LIKE` com collation `utf8mb4_unicode_ci` (ignora acento e maiúsculas), todos os termos.

## Variáveis de ambiente

| Variável | Uso | Fase |
|---|---|---|
| `VITE_SITE_URL` | URL canônica (build) | ✅ |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | MySQL | ✅ |
| `CRON_TOKEN` | protege `/api/cron/*` | 3 |
| `GEMINI_API_KEY` | escrita dos posts | 3 |
| `RAWG_API_KEY` | dados de jogos e lançamentos | 3 |
| `ADMIN_EMAIL` `ADMIN_PASSWORD_HASH` `SESSION_SECRET` | login do /admin | 3 |

Modelo em `.env.example`. O `.env` real nunca vai para o Git (repositório público).

## Testes manuais usados até aqui

- Auditoria de layout com puppeteer-core + Edge headless (375/768/1024/1440): estouro de
  largura, alvos de toque < 44 px, contraste, erros de console.
- Banco: MySQL 8.4 descartável (`mysql-memory-server`), migration + seed + comparação das páginas
  com a versão mock (mesmos posts, mesma ordem), rascunho oculto, busca sem acento.
