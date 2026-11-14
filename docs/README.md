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
| [arcade.md](arcade.md) | Arcade: jogos de passatempo próprios em /arcade |
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
| 3 | Dados de jogos: IGDB (ver etapa 2 da fase 5) | ✅ |
| 3 | Matérias com SEO completo: capa e imagens próprias (WebP), vídeo, links internos/externos, checagem com refação (regras do Anime Profile, migration 003) | ✅ |
| 3 | Imagens extras da Steam + trailer pelo YouTube (`YOUTUBE_API_KEY` cadastrada) | ✅ |
| 3 | Polygon bloqueia o servidor → desativado; 5 fontes novas (migration 004) | ✅ |
| 3 | Painel admin (login, matérias, fila, fontes, robô, configurações) — ver admin.md | ✅ |
| 3 | Variáveis do painel no hPanel + primeiro login do dono (2026-11-11) | ✅ |
| 4 | Imagem OG padrão (páginas sem capa), logo PNG no JSON-LD, ícone da Apple | ✅ |
| 4 | Páginas vazias fora do menu/home/sitemap + `noindex` (availability.ts) | ✅ |
| 4 | AdSense preparado: `ADSENSE_CLIENT` liga script + Modo de Consentimento v2 + `ads.txt` + banner (adsense.md) | ✅ |
| 4 | Políticas de privacidade, cookies e termos citando o AdSense | ✅ |
| — | README de apresentação (todos os direitos reservados, LICENSE própria, capturas em docs/screenshots). Sem "projeto pessoal", sem estrutura de código nem instruções de execução | ✅ |
| — | Capturas do README refeitas da produção (home, matéria, celular) + Arcade e calendário (2026-11-14); as do painel seguem com dados de teste | ✅ |
| 4 | Google Search Console: domínio verificado por TXT, sitemap enviado, teste ao vivo OK ("disponível para o Google") e indexação solicitada (2026-11-13) | ✅ |
| 4 | Bing Webmaster Tools importado do Search Console (2026-11-14) | ✅ |
| 4 | Acompanhar a indexação no Search Console e no Bing (Páginas / Sitemaps) | ⏳ |
| 4 | Pedido do AdSense (ver checklist em adsense.md) | 💤 |
| 4 | Cadastrar `ADSENSE_CLIENT` no hPanel ao se inscrever no AdSense | 💤 dono |
| 4 | Ao aprovar o AdSense: e-mail para partner@igdb.com (parceria comercial do IGDB; Claude redige, dono envia) — ver adsense.md | 💤 dono |
| 5 | Editorias novas, etapa 1: Promoções — jogos grátis da Epic e GamerPower, matéria do grátis da Epic, página /promocoes (migration 006) | ✅ |
| 5 | Etapa 2: IGDB — calendário, fichas (noindex sem matéria), descrições em pt-BR, "Lançamentos do mês" (migration 008) | ✅ |
| 5 | Etapa 3: consenso da crítica — notas do JSON-LD das análises, mínimo de 4 veículos, quadro calculado pelo código (migration 007) | ✅ |
| 5 | Etapa 4: compilações — ofertas da Steam (sexta), resumo da semana (domingo), grátis do mês (dia 1º); "lançamentos do mês" espera o IGDB | ✅ |
| 5 | Etapa 5: guias de requisitos de PC (1/dia, Steam) + "Nova matéria" e envio de imagens no painel | ✅ |
| 6 | Arcade (/arcade): 1ª leva com Respawn, Torre e Quebra-Pixel (arcade.md) | ✅ |
| 6 | Arcade, 2ª leva: Chuva de Meteoros, Cabo de Força e Trinca (nova categoria Quebra-cabeça) | ✅ |
| 6 | Arcade, 3ª leva: Mira, Memória, Campo Minado e Paciência + filtro por categoria (10 jogos) | ✅ |
| 6 | Arcade: formato horizontal no PC e vertical no celular (todos os jogos) | ✅ |

## Histórico de commits relevantes

- `7fa3e2b` frontend inicial · `8f4b64a` tema Central de Comando · `c82e4d9` auditoria UX
- `c8a719c` páginas institucionais · `a8d6776` textos legais sem CNPJ · `9f484d9` remove login, busca na navbar
- `b1abafc` fase 1: reviews como consenso da crítica, migration 001, camada MySQL com fallback
- `9d16ea6`…`e872c12` deploy na Hostinger (servidor Express, correções de build e do LiteSpeed)
