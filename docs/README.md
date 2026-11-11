# Documentação e plano do Respawnou

Esta pasta (`docs/`) é a memória do projeto. Tudo o que for decidido ou construído entra aqui,
para que qualquer pessoa (ou o Claude, depois de perder o contexto) saiba onde estamos
e o que vem a seguir.

**Regra:** toda tarefa concluída atualiza o status abaixo e o documento da área.

## Documentos

| Arquivo | Conteúdo |
|---|---|
| [decisoes.md](decisoes.md) | Registro de decisões (o quê, quando e por quê) |
| [arquitetura.md](arquitetura.md) | Stack, pastas, camada de dados, variáveis de ambiente |
| [banco-de-dados.md](banco-de-dados.md) | Tabelas, migrations e como rodar |
| [automacao.md](automacao.md) | Robô de postagem: cron da Hostinger, RSS, Gemini |
| [adsense.md](adsense.md) | Estratégia para o site automatizado ser aprovado no AdSense |
| [admin.md](admin.md) | Painel administrativo em /admin |
| [deploy-hostinger.md](deploy-hostinger.md) | Domínio, site Node.js, SSL, e-mail, variáveis |

## Status

Legenda: ✅ feito · 🔄 em andamento · ⏳ próximo · 💤 depois

| Fase | Item | Status |
|---|---|---|
| 0 | Nome, stack, estilo "Central de Comando" | ✅ |
| 0 | Frontend completo com dados de exemplo (home, editorias, post, jogo, plataforma, lançamentos, busca) | ✅ |
| 0 | Auditoria de UX/UI (375 / 768 / 1024 / 1440) | ✅ |
| 0 | Páginas institucionais e legais (11 páginas) | ✅ |
| 0 | Sem contas de usuário; só admin em /admin | ✅ |
| 1 | Reviews viram "consenso da crítica" (automatizável) | ✅ |
| 1 | Schema MySQL + migration 001 | ✅ |
| 1 | Camada de dados MySQL com fallback para os dados de exemplo | ✅ |
| 2 | Domínio respawnou.com.br ativo | ✅ |
| 2 | Site Node.js na Hostinger + auto-deploy pelo GitHub + SSL + www→apex | ✅ |
| 2 | Banco MySQL criado na Hostinger e migration 001 aplicada | ✅ |
| 2 | E-mail contato@respawnou.com.br | ✅ |
| 3 | Robô de postagem: código, fontes RSS e rotas /api/cron (migration 002) | ✅ |
| 3 | CRON_TOKEN no painel + teste em produção + Cron Jobs da Hostinger (1ª matéria no ar) | ✅ |
| 3 | Dados de jogos (RAWG fora do ar; alternativa IGDB) | 💤 |
| 3 | Matérias com SEO completo: capa e imagens próprias (WebP), vídeo, links internos/externos, checagem com refação (regras do Anime Profile, migration 003) | ✅ |
| 3 | Painel admin (login, posts, fontes, execuções do robô) | ⏳ |
| 4 | Imagem OG padrão (páginas sem capa) | 💤 |
| 4 | Google Search Console + sitemap (só depois das primeiras matérias) | 💤 |
| 4 | Pedido do AdSense (ver checklist em adsense.md) | 💤 |
| 4 | Banner de consentimento de cookies (obrigatório ao ativar AdSense/analytics) | 💤 |

## Histórico de commits relevantes

- `7fa3e2b` frontend inicial · `8f4b64a` tema Central de Comando · `c82e4d9` auditoria UX
- `c8a719c` páginas institucionais · `a8d6776` textos legais sem CNPJ · `9f484d9` remove login, busca na navbar
- `b1abafc` fase 1: reviews como consenso da crítica, migration 001, camada MySQL com fallback
- `9d16ea6`…`e872c12` deploy na Hostinger (servidor Express, correções de build e do LiteSpeed)
