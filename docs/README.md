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
| [anuncios.md](anuncios.md) | Anúncios: locais e formatos por página, componente `<AdSlot>`, modo "ver espaços", passo a passo do painel do AdSense, medição |
| [admin.md](admin.md) | Painel administrativo em /admin |
| [arcade.md](arcade.md) | Arcade: jogos de passatempo próprios em /arcade |
| [crescimento.md](crescimento.md) | Plano de crescimento orgânico (custo zero): SEO do Arcade, fichas de jogos, evergreen, Discover, divulgação |
| [crescimento-rapido.md](crescimento-rapido.md) | Estratégia de crescimento rápido (seguidores, visitas, receita, rotina, equipe) e modelo para criar sites novos; vale para todos os sites |
| [deploy-hostinger.md](deploy-hostinger.md) | Domínio, site Node.js, SSL, e-mail, variáveis |
| [instagram.md](instagram.md) | Instagram automático: módulo `app/social`, artes, legenda, fila, painel `/admin/instagram`, Meta |
| [instagram-stories-videos.md](instagram-stories-videos.md) | Plano (2026-11-23): Stories 9:16, imagens próprias nos slides e vídeos curtos (Reels, Shorts, TikTok) com voz ElevenLabs |
| [modulo-video.md](modulo-video.md) | Guia permanente do módulo de vídeos e checklist para copiar para outro site (núcleo × do site, campos de `app/marca.ts`) |
| [video-melhorias.md](video-melhorias.md) | Plano (2026-11-24): melhorias dos vídeos curtos em 13 etapas: cartões de dados animados, legenda com destaque, 3 ganchos + pergunta, pronúncia e pausas, efeitos sonoros, séries fixas, métricas dos Reels, montagem em partes, arquivo de marca único (módulo copiável) |

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
| 4 | Search Console, relatório de Páginas (2026-11-16, dado de 12/11): 33 indexadas, 33 não indexadas (26 noindex de propósito, 1 redirecionamento, 6 "rastreada, mas não indexada") | ✅ |
| 4 | Acompanhar o Bing (Sitemaps) e o crescimento das indexadas | ⏳ |
| 4 | Anúncios preparados no código: locais/formatos, `<AdSlot>`, IDs no `/admin/config`, modo "ver espaços" (anuncios.md, fase A: AN1–AN13) — **prioridade, antes do pedido** | ⏳ |
| 4 | Pedido do AdSense (ver checklist em adsense.md e fase B de anuncios.md) | 💤 |
| 4 | Ao aprovar: painel do AdSense (automáticos desligados, 4 blocos, exclusão `/arcade/*`, categorias, CMP Europa) — anuncios.md fase C | 💤 dono |
| 4 | Cadastrar `ADSENSE_CLIENT` no hPanel ao se inscrever no AdSense | 💤 dono |
| 4 | Ao aprovar o AdSense: e-mail para partner@igdb.com (parceria comercial do IGDB; Claude redige, dono envia) — ver adsense.md | 💤 dono |
| 5 | Editorias novas, etapa 1: Promoções — jogos grátis da Epic e GamerPower, matéria do grátis da Epic, página /promocoes (migration 006) | ✅ |
| 5 | Etapa 2: IGDB — calendário, fichas (noindex sem matéria), descrições em pt-BR, "Lançamentos do mês" (migration 008) | ✅ |
| 5 | Etapa 3: consenso da crítica — notas do JSON-LD das análises, mínimo de 3 veículos (4 até 2026-11-20), quadro calculado pelo código (migration 007) | ✅ |
| 5 | Etapa 4: compilações — ofertas da Steam (sexta), resumo da semana (domingo), grátis do mês (dia 1º); "lançamentos do mês" espera o IGDB | ✅ |
| 5 | Etapa 5: guias de requisitos de PC (1/dia, Steam) + "Nova matéria" e envio de imagens no painel | ✅ |
| 6 | Arcade (/arcade): 1ª leva com Respawn, Torre e Quebra-Pixel (arcade.md) | ✅ |
| 6 | Arcade, 2ª leva: Chuva de Meteoros, Cabo de Força e Trinca (nova categoria Quebra-cabeça) | ✅ |
| 6 | Arcade, 3ª leva: Mira, Memória, Campo Minado e Paciência + filtro por categoria (10 jogos) | ✅ |
| 6 | Arcade: formato horizontal no PC e vertical no celular (todos os jogos) | ✅ |
| 6 | Arcade na home (módulo "Passe o tempo"), compartilhar resultado, textos legais/Sobre/FAQ citando o Arcade, sem script de anúncios nas páginas dos jogos (2026-11-14) | ✅ |
| 6 | Arcade: Sudoku infinito, 11º jogo (fácil/médio/difícil, anotações, 3 vidas) (2026-11-15) | ✅ |
| 3 | Painel de visitas em /admin/visitas: contagem própria sem cookie, cartões, gráfico de 30 dias, páginas, origem e aparelho (módulo `app/visitas`, migration 009) (2026-11-19) | ✅ |
| 6 | Arcade: Caça-Palavras de games, 12º jogo (rodadas com mais palavras e direções, tempo por rodada) (2026-11-17) | ✅ |
| 6 | Arcade: Pinball, 13º jogo (3 bolas, bumpers, alvos com multiplicador) (2026-11-19) | ✅ |
| 7 | Evergreen semanal (segunda lançamentos da semana, quarta lista de dados, quinta peça para revisar em rascunho) e atualização de guias no sábado, sem Gemini — `crescimento.md` C2 a C7 (2026-11-22) | ✅ |
| 7 | Páginas dos autores `/autores/<slug>` (avatar em pixel art, descrição, assuntos, matérias) e fim do rótulo "autor de IA" nas matérias; `/redacao` explica o uso de IA e a conferência humana depois de publicar (2026-11-22) | ✅ |
| 7 | Instagram automático (módulo `app/social/`: arte por tipo de matéria, legenda, fila, painel `/admin/instagram`, `/links`; migration 012) — `instagram.md` (2026-11-22) | ✅ código pronto e testado; falta o dono conectar a conta (IG0) |
| 8 | Anúncios: espaços prontos e inertes (`<AdSlot>`, modo "ver espaços", card em `/admin/config`, locais por página, banner x aviso europeu do Google) — `anuncios.md` fase A (2026-11-22) | ✅ pedido de revisão feito no AdSense em 2026-11-22; falta, depois da aprovação, criar os 4 blocos e colar os IDs (`anuncios.md`, Fase C) |
| 7 | Crescimento orgânico, frente 1: SEO das páginas do Arcade (A1–A9: títulos/H1 de busca, textos, JSON-LD, imagem de compartilhamento, jogos parecidos, card nas matérias) | ✅ 2026-11-20 (falta você revisar os textos, A10) |
| 7 | Frente 2: fichas de jogos úteis + critério de indexação (migration 010, passos B1–B7) | ⏳ |
| 7 | Frente 3: cardápio evergreen e cadência do robô (passos C1–C6) | ⏳ |
| 7 | Frente 4: Google Discover (auditoria feita; passos D1–D10) | ⏳ |
| 7 | Instagram: **Stories** 1080×1920 junto de cada matéria (ST1–ST11, migration 013) — `instagram-stories-videos.md`, frente A | 🔄 ST1–ST9 feitos e testados (2026-11-23); falta ST10 (testar em produção) e ST11 (1º Story real) |
| 7 | Instagram: **imagens próprias** nos slides da fila (UP1–UP8, migration 014) — frente C | ⏳ plano pronto |
| 7 | **Vídeos curtos** (fase 1 gerar e baixar V1–V12; fase 2 Reels; fase 3 YouTube; fase 4 TikTok manual; migration 015) — frente B | 💤 plano pronto; depende do dono (ElevenLabs Starter, voz) |
| 7 | **Vídeos: melhorias** (etapas 0–12: teste local, métricas, marca única, montagem em partes, pronúncia, roteiro v2, gancho/pergunta, legenda, cartões, efeitos, séries, peso por métricas, módulo copiável; migration 017) — `video-melhorias.md` | 🔄 etapas 0 a 10 e 12 feitas; faltam a 11 e a conferência com vídeo real |

## Próximos passos

- **Vídeos, melhorias (plano `video-melhorias.md`), 2026-11-24: FEITAS as etapas 0 a 10 e 12** (teste local, métricas dos Reels, marca única `app/marca.ts`, montagem ≈ 5× mais rápida, pronúncia e pausas, roteiro v2, escolha do gancho + pergunta no fechamento, legenda com destaque, cartões de dados, efeitos sonoros, séries, módulo copiável: `docs/modulo-video.md`). ADIADAS: etapa 3 S1/O5 (montagem em partes; só se a Hostinger ficar lenta) e etapa 11 (peso por métricas; só com 6+ vídeos medidos). FALTA CONFERIR COM VÍDEO REAL (não testado com a voz/Gemini/Instagram/Hostinger reais): voz animada, pausa antes de números, pronúncias, roteiro v2 do Gemini, volume dos efeitos, tempo de montagem, cada série, e o botão de Reels.
- **Vídeos curtos, fase 1 pronta no código (2026-11-24):** `/admin/videos` (roteiro pelo Gemini → você revisa e aprova → o próprio servidor gera voz + vídeo → você baixa o MP4 e copia as legendas de Instagram, YouTube e TikTok). Escolha automática de 1 matéria por dia (desligada até você ligar), voz por editoria, migration 015. Falta só o que é seu (veja "Pendências suas"). Reels automático, YouTube e TikTok são as fases 2 a 4.
- **Imagens próprias nos slides (2026-11-24, frente C do plano `instagram-stories-videos.md`):** em `/admin/instagram`, cada item da fila do feed tem o bloco "Imagens dos slides": trocar a imagem de um slide (com foco do recorte), acrescentar slides de foto (até 10 no total) e "Gerar de novo com as minhas imagens". Migration 014 (`overrides`). Itens já publicados não aceitam troca.
- **Regras da fila do Instagram (2026-11-23):** só sai sozinho o que entrou sozinho (matéria nova): notícia (vale 48 h desde a publicação), promoções e lançamentos. Carrossel (artigo, review, guia) e tudo que vem do botão "Colocar as 30 últimas" ficam na fila só para "Postar agora" (revisão manual). Stories seguem as mesmas regras (os de carrossel também são manuais).
- **Robô só de games (2026-11-23):** filtro de cinema/TV/quadrinhos no título, no endereço da fonte e no redator. Matérias de filme já publicadas precisam ser despublicadas à mão em `/admin/posts`.
- **Stories no ar em modo de teste:** em `/admin/instagram` → card Stories, ligar "Stories" (o modo de teste do feed vale para eles); conferir as artes na aba Stories, depois "Postar agora" em 1 (ST10/ST11). A conta precisa ser **Empresa**.
- Instagram, plano em `instagram-stories-videos.md` (2026-11-23), na ordem: (1) **Stories** ST1–ST11 (combinado para
  2026-11-24; migration 013, colar o SQL no chat); (2) **imagens próprias nos slides** UP1–UP8 (migration 014);
  (3) **vídeos, fase 1** V1–V12 só depois das respostas do dono (perguntas 1 a 4 do plano); depois fases 2 a 4.

Em ordem (atualizado em 2026-11-22):

00. **Anúncios (`anuncios.md`, 2026-11-22) — antes de qualquer outra demanda:** executar a fase A (AN1 a AN13) na ordem: linha de base do PageSpeed, `ads.ts`/`ads.server.ts`, card "Anúncios" no `/admin/config`, componente `<AdSlot>` + CSS, selo do modo espaços, regra do "meio", matéria, home, listas, ficha/calendário/Arcade, banner x CMP Europa, revisão no modo espaços com capturas. Tudo fica inerte até haver IDs. Depois: fase B (pedido) e fase C (painel, dono) + AN14/AN15.
0. **Plano de crescimento (`crescimento.md`, 2026-11-20):** executar na ordem da seção "Ordem de execução": Arcade (A1–A10), Discover rápidos (D1, D3, D8), fichas (B1–B7), evergreen (C1–C6), resto do Discover. Antes do pedido do AdSense: frente 1 inteira + D1/D3/D8 + C1.
1. Acompanhar a indexação: Search Console (Páginas, Sitemaps) e Bing Webmaster Tools. O robô segue publicando 7 a 8 matérias por dia.
2. Se o "publicar" pular horas de novo, ler os logs do aplicativo (linhas `[cron] publicar recebido`) e o arquivo de log do cron (ver `automacao.md`, "Diagnóstico do cron"). Deploy conferido em 2026-11-14 (commit 23356f4).
3. Pedir o AdSense quando: ≥ 35 a 40 matérias (em 2026-11-19 eram cerca de 55 no sitemap: ~40 notícias, 7 guias, 3 artigos, 3 promoções; o critério de quantidade já está cumprido, falta variedade de peças escritas por você e a idade do site), ≥ 15 a 20 páginas indexadas no Search Console, site com 2 a 3 semanas de vida (domínio de 10/11) e algumas peças de outro tipo (consenso de reviews, artigos ou listas escritas por você pelo painel). Previsão: entre 24/11 e 1/12. Checklist em `adsense.md`.
4. Ao ser aprovado: excluir `/arcade/*` dos anúncios automáticos no painel do AdSense (`arcade.md`) e abrir o console do navegador para checar avisos de hidratação (`adsense.md`).
5. Painel de visitas no ar (2026-11-19); busca por relevância, capa do Arquivo especial e grade de módulos ajustada (2026-11-20). Depois de 2 semanas de dados, trocar o critério de "mais lidas" da home/laterais para visitas dos últimos 7 dias (`visit_pages`). Depois: Arcade com novos jogos (ideias em `arcade.md`), ranking com apelido (precisa de banco) e capturas novas do painel no README.
6. **Mídia kit** dentro de "Anuncie" (`app/routes/advertise.tsx`): público e números reais, formatos e pacotes (incluir o
   Arcade e parcerias com estúdios/lançamentos), regras de conteúdo patrocinado, versão para baixar/imprimir e contato.
   Outra fonte de renda, vale para todos os sites. **Decisão (2026-11-15): só depois do AdSense ligado no respawnou.** Falta planejar (`planejador`, tem parte visual); o piloto é o criasite.
   Cuidado: não misturar com as regras do AdSense (`adsense.md`).

## Pendências suas

- **Vídeos, melhorias (`video-melhorias.md`):** (1) decidir a série "Lançamentos da semana": roteiro criado na segunda e você aprova no mesmo dia (recomendado; exceção à regra qui/sáb/dom) ou série desligada por padrão; (2) depois da etapa 1, se o painel avisar que o token não tem permissão de estatísticas, gerar o token de novo marcando a permissão de insights e colar em `/admin/instagram`.
- **Vídeos (fase 1):** a chave `ELEVENLABS_API_KEY` já está no hPanel. Falta: (1) escolher uma voz por editoria na ElevenLabs e colar os códigos (`voice_id`) em `/admin/videos` → Configuração; (2) gerar o primeiro vídeo (abrir uma matéria → "Fazer vídeo desta matéria" → aprovar) e ver se a montagem funciona na Hostinger (se não funcionar, tentamos outro dia; **sem GitHub Actions**, decisão do dono); (3) ligar "Ligado" quando quiser que o site escolha 1 matéria por dia.

- **Stories e vídeos (2026-11-23, `instagram-stories-videos.md`):** responder as 9 perguntas do fim do plano. Para os
  vídeos começarem: assinar o ElevenLabs **Starter (US$ 5/mês)** e escolher a voz (perguntas 1 a 4). Para os Stories:
  conferir que a conta do Instagram é do tipo **Empresa** (a API pode recusar Story em conta de Criador).
- **Instagram (IG0):** (1) no app do Instagram, mudar `@respawnou.com.br` para conta **profissional**; (2) em developers.facebook.com criar o app e gerar o token (passo a passo em `instagram.md`, seção "Passo a passo na Meta"); (3) no hPanel cadastrar a variável **`SOCIAL_KEY`** (64 caracteres hexadecimais: rode `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` no seu computador e cole só o resultado no hPanel; não mande no chat); (4) em `/admin/instagram` colar o token e clicar em Conectar; (5) deixar o **modo de teste** ligado por uns dias, olhar as artes e legendas na fila e, se gostar, desligar o modo de teste e ligar a automação. Nunca cole o token no chat.
- **Autores de IA (2026-11-22):** o robô passa a assinar cada matéria com o autor da editoria (Nox, Lume, Vero, Atlas, Loot), listados em `/redacao`. A migration 011 roda sozinha no deploy e muda só as matérias do robô que estavam como "Redação Respawnou". Se quiser outros nomes, é só dizer (`AUTHORS` em `app/lib/site.ts` + uma migration nova). Conferir `/redacao` e uma matéria depois do deploy.
- **Peça da semana (C7):** toda quinta o robô cria um **rascunho** em `/admin/materias` ("o que jogar agora" ou "jogos com legendas em português"). Revisar o texto, ajustar e publicar; não sai sozinha. Para testar antes: `/admin/robo` → "Compilação agora" → "Peça da semana" → "Testar (sem gravar)".
- **Anúncios (2026-11-22, `anuncios.md`):** responder as 5 perguntas em aberto do fim do arquivo (âncora no celular, categorias sensíveis além de apostas, 2º anúncio no meio de matérias longas, faixa na lista do Arcade, billboard 970×250 na home). Depois da fase A: abrir `/admin/config` → "Ver espaços no site" e aprovar o layout (capturas em `docs/screenshots/anuncios-*.png`). No pedido: checklist da fase B. Ao aprovar: passo a passo da fase C no painel do AdSense (colar os 4 IDs no `/admin/config`). Nunca clicar nos anúncios do próprio site.
- **Plano de crescimento (2026-11-20):** respondido em parte (ver "Decisões do dono" em `crescimento.md`). **Ajustar "posts por dia" para 6 em `/admin/config`.** Faltam: canal/newsletter e `MIN_CRITICS`. **Revisar os 13 textos do Arcade** (em `app/lib/arcade-seo.server.ts`; pode abrir cada `/arcade/<jogo>` depois do deploy) e dizer o que mudar.
- **Reviews (2026-11-20):** mínimo do consenso baixado de 4 para 3 veículos (`MIN_CRITICS`, texto da página "Como avaliamos" atualizado). Abrir `/admin/robo` em 1 ou 2 dias e olhar o quadro "Consenso da crítica" para ver se algum jogo já chegou a 3 e foi publicado; o botão "Reviews" entra sozinho na home quando houver a primeira.
- **Migration 009 (visitas):** roda sozinha no deploy (o `server.js` aplica as pendentes ao iniciar). Depois do deploy, abrir `/admin/visitas`, navegar em 2 ou 3 páginas do site numa janela anônima e ver em até 10 s se "Hoje" sobe. Se "Agora" ou os visitantes ficarem sempre em 1, o IP atrás da CDN não está chegando (avisar o Claude). O número será menor que o antigo `views` (sem contagem de recarregamento em 30 s).
- Search Console, relatório de 2026-11-20 (dados até 15/11): **52 indexadas** (eram 33 em 12/11) e 50 não indexadas = 31 `noindex` (fichas de jogos/plataformas sem matéria, de propósito), 1 redirecionamento (é o `www` → apex, 301 correto), **14 "detectada, mas não indexada"** (URLs novas ainda na fila de rastreio, normal em site de 10 dias com robô publicando 7 a 8 por dia) e 4 "rastreada, mas não indexada" (validação iniciada). Impressões: 50 → 138 → 245 → 289 por dia. Nenhuma correção de código necessária. Falta: exportar a lista de URLs dos 4 "rastreada" e dos 14 "detectada" (clicar no motivo → exportar) para ver se há um padrão (suspeita: guias "Requisitos de PC", que são parecidos entre si). Reexportar por volta de 27/11. Ver em Sitemaps do Bing se o sitemap foi lido.
- Cron Job de diagnóstico do "publicar" (hPanel → Avançado → Cron Jobs): o Claude não conseguiu criá-lo (o sistema bloqueou a ação). Passo a passo e comando em `automacao.md`, seção "Diagnóstico do cron". Opcional: o site já registra cada chamada nos logs do aplicativo.
- `ADSENSE_CLIENT` cadastrado no hPanel em 2026-11-22 (precisa ser `ca-pub-` + dígitos; com só `pub-` o site ignora). Conferido: `ads.txt` responde, script nas páginas e fora de /arcade/<jogo>.
- Ao aprovar o AdSense: enviar o e-mail ao partner@igdb.com (o Claude redige, você envia).

## Histórico de commits relevantes

- `7fa3e2b` frontend inicial · `8f4b64a` tema Central de Comando · `c82e4d9` auditoria UX
- `c8a719c` páginas institucionais · `a8d6776` textos legais sem CNPJ · `9f484d9` remove login, busca na navbar
- `b1abafc` fase 1: reviews como consenso da crítica, migration 001, camada MySQL com fallback
- `9d16ea6`…`e872c12` deploy na Hostinger (servidor Express, correções de build e do LiteSpeed)
