# Deploy na Hostinger

Status: 🔄 domínio registrado em 2026-11-10, aguardando ativação (status "requested").

## Conta

- Plano Business (o número do pedido e o usuário ficam fora do repositório, que é público:
  consultar com `hosting_websites_list` pelo MCP).
- O plano já hospeda outros sites, inclusive um app Node.js publicado pelo GitHub.
- O MCP da Hostinger está conectado no Claude Code (ferramentas `hosting_*`, `domains_*`).

## Passos (quando o domínio estiver "active")

1. Criar o site `respawnou.com.br` no pedido do plano Business (`hosting_websites_create`) e esperar o setup
   (`hosting_websites_list-setups` → `completed`).
2. Deploy a partir do GitHub (`hosting_deploy`): repositório `evssousa/respawnou`, branch `main`,
   `type: "nodejs"`. Build `npm run build`, start `npm start`, Node 22. Auto-deploy a cada push.
3. Variáveis de ambiente (`hosting_nodejs_replace-environment-variables`, substitui todas):
   ver lista em [arquitetura.md](arquitetura.md). `VITE_SITE_URL` é usada no build → rebuild depois.
4. Banco: criar MySQL + usuário pelo painel/MCP, rodar `db/migrations/*.sql` em ordem.
   No app, conectar em `127.0.0.1:3306` (nunca no host `srvNNNN.hstgr.io`).
5. SSL (Let's Encrypt) para apex e www; `www` → 301 → `https://respawnou.com.br`.
6. E-mail `contato@respawnou.com.br` (senha definida pelo dono no painel).
7. Cron Jobs (ver [automacao.md](automacao.md)).
8. Verificar: home, post, páginas legais, `/sitemap.xml`, `/robots.txt`, redirecionamentos,
   `/admin` sem acesso público.
