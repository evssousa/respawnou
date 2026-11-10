# Deploy na Hostinger

Status: ✅ no ar desde 2026-11-10 em https://respawnou.com.br

## Conta

- Plano Business (o número do pedido e o usuário ficam fora do repositório, que é público:
  consultar com `hosting_websites_list` pelo MCP).
- O plano já hospeda outros sites, inclusive um app Node.js publicado pelo GitHub.
- O MCP da Hostinger está conectado no Claude Code (ferramentas `hosting_*`, `domains_*`).

## Como está configurado

| Item | Valor |
|---|---|
| Site | `respawnou.com.br` (plano Business) |
| Deploy | GitHub `evssousa/respawnou`, branch `main`, **auto-deploy a cada push** |
| Build | Node 24, `npm install` + `npm run build`, app type `express` |
| Entrada | `server.js` (define NODE_ENV) → `server-app.js` (Express + migrations) |
| Banco | MySQL `u218539700_respawnou` em `127.0.0.1:3306` (só acesso local) |
| Variáveis | `VITE_SITE_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (senha só no painel) |
| SSL | Let's Encrypt (Hostinger); HTTP → HTTPS pela Hostinger; `www` → apex pelo `server-app.js` |
| Migrations | Aplicadas automaticamente a cada início do app (`db/migrate.mjs`) |

## Armadilhas da Hostinger (aprendidas no primeiro deploy)

1. **GitHub App por conta**: o app da Hostinger estava instalado só na organização `criasite-app`.
   Para repositórios da conta pessoal, instalar o app nela (hPanel → site → Git/Node.js → conectar).
2. **Não colocar `NODE_ENV` nas variáveis do painel**: o `npm install` do build passa a omitir
   devDependencies. Por segurança, as ferramentas de build (`@react-router/dev`, `vite`, tailwind,
   typescript) ficam em `dependencies`.
3. **LiteSpeed carrega a entrada com `require()`**: nada de `await` no nível do módulo
   (ERR_REQUIRE_ASYNC_MODULE). A entrada usa `import()` dinâmico.
4. **`NODE_ENV` antes de qualquer import**: imports estáticos rodam antes do código do arquivo;
   se o React carregar sem `NODE_ENV=production`, mistura build dev/prod e quebra o SSR
   (`dispatcher.getOwner is not a function`). Por isso a entrada é separada do app.
5. **Acesso remoto ao MySQL** foi negado pelo próprio fluxo de segurança: nada roda contra o banco
   de fora; as migrations rodam no app. Para inspecionar dados, usar o phpMyAdmin do hPanel.
6. **Vários processos**: o LiteSpeed pode subir mais de um processo; as migrations são idempotentes
   (`schema_migrations`), e uma falha numa execução concorrente só é registrada no log.
7. **Logs**: `hosting_nodejs_runtime-logs` (MCP) mostra o console do app; `hosting_get-deployment`
   mostra o build.

## Pendente

- E-mail `contato@respawnou.com.br` (criar no hPanel; senha definida pelo dono).
- Cron Jobs do robô (fase 3, ver [automacao.md](automacao.md)).
- Google Search Console + envio do sitemap.
