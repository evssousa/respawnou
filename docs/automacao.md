# Robô de postagem

Status: ✅ **no ar desde 2026-11-10.** Primeira matéria automática publicada em produção
(`/noticias/sony-cancela-fairgame-jogo-como-servico-da-haven-studios`, 454 palavras, fontes IGN +
GameSpot). Cron Jobs criados na conta da Hostinger: coletar `*/30 * * * *` e publicar `5 * * * *`
(comando: `curl -s -m 50 -o /dev/null "https://respawnou.com.br/api/cron/<job>?token=..."`).
O token fica só no painel (variável `CRON_TOKEN`) e nos Cron Jobs, nunca no repositório.

Código: `app/lib/robot/` (text, rss, gemini, robot) e `app/routes/cron.ts`.

## Arquitetura

```
Cron Job da Hostinger (hPanel → Avançado → Cron Jobs)
   │  a cada 30 min:   curl -s -o /dev/null "https://respawnou.com.br/api/cron/coletar?token=..."
   │  de hora em hora: curl -s -o /dev/null "https://respawnou.com.br/api/cron/publicar?token=..."
   │  (o próprio /publicar decide se é hora: janela 8h–22h de Brasília, limite diário
   │   posts_per_day e intervalo mínimo entre posts automáticos)
   ▼
Rotas do próprio site (React Router, resource routes)
   ├─ /api/cron/coletar   lê os feeds RSS ativos → grava itens novos em feed_items (status "new")
   ├─ /api/cron/publicar  escolhe 1 item → Gemini escreve → valida → grava em posts (published)
   └─ /api/cron/status    últimas execuções (cron_runs), com o rascunho dos testes dry=1
   ▼
MySQL local (127.0.0.1:3306)
```

- Token secreto em `CRON_TOKEN` (variável de ambiente). Sem token correto → 404.
- Cada chamada grava uma linha em `cron_runs` (início, fim, status, mensagem, estatísticas).
- Trava: se existir execução `running` há menos de 10 min, a nova chamada sai sem fazer nada.
- **A CDN da Hostinger corta requisições com mais de ~55 s (responde 307).** O Gemini pode levar
  mais que isso, então `coletar` e `publicar` respondem **202 na hora** e rodam em segundo plano;
  o resultado fica em `cron_runs` (consultar com `/api/cron/status?token=...&n=10`).
  `wait=1` faz a rota esperar o fim (só para uso local, sem CDN).
- O Gemini às vezes responde 503 (sobrecarga) ou trava: o cliente tenta de novo após 5 s, tem
  limite de 150 s por chamada e cai para o próximo modelo da lista; se tudo falhar, a pauta volta
  para a fila. A mensagem de erro em `cron_runs` lista o que cada modelo respondeu.
- Nova tentativa rápida: se a última publicação falhou por instabilidade do Gemini ("Gemini
  indisponível") há menos de 45 min, a coleta seguinte (a cada 30 min) já chama `publish()` de novo,
  com as mesmas regras de horário, limite e intervalo. Sem Cron Job extra.
  Validado em 2026-11-12: falha às 18:05 UTC, nova tentativa às 18:30 publicou o 1º guia de requisitos
  (`/guias/requisitos-de-pc-de-rayman-legends-retold-minimo-e-recomendado`).
- Cota grátis: em 2026-11-12 o `gemini-3.5-flash` respondeu 429 com `generate_content_free_tier_requests,
  limit: 20` (20 pedidos/dia por modelo). Os outros modelos da lista têm cota própria e assumem quando
  um esgota. Testes `dry=1` gastam a mesma cota: evitar muitos no mesmo dia.
- `/api/cron/diag?token=...` testa os modelos com um prompt curto (resultado em `/status`, job `diag`).

## Parâmetros de /api/cron/publicar

- `dry=1`: gera a matéria sem gravar post (o rascunho aparece em `/api/cron/status`, job `publicar-teste`).
- `force=1`: ignora janela de horário, limite diário e intervalo (não ignora `robot_enabled`).

## Configurações (tabela `settings`)

`robot_enabled`, `posts_per_day` (4), `robot_sections` (["noticias","promocoes"]),
`robot_min_words` (350 desde a migration 003), `robot_start_hour` (8), `robot_end_hour` (22).

## Fontes e bloqueios

- 11 feeds (migration 002). GameSpot, Gematsu e a rede Push Square/Pure Xbox/Nintendo Life
  **bloqueiam robôs (403) na página da matéria**: o robô usa o texto do próprio RSS e **não**
  se disfarça de navegador para contornar o bloqueio.
- **Polygon** derruba a conexão vinda do servidor da Hostinger (`UND_ERR_SOCKET other side closed`,
  só lá; do PC local funciona): desativado na migration 004. Entraram GamesRadar+, Game Informer,
  Kotaku, Destructoid e Siliconera; Destructoid e Siliconera dão 403 ao servidor e foram desativadas
  na migration 005 (13 fontes ativas). TheGamer ficou de fora (mesmo grupo do Polygon).
- **Ofertas de varejo** (Amazon/Walmart/Best Buy, Black Friday, "% off", "lowest price") são descartadas
  na coleta: preço em dólar de loja americana tem pouco valor para o leitor brasileiro e cara de
  afiliado (ruim para o AdSense). "Deal" sozinho não conta ("Xbox signs deal with Riot" é notícia).
- O prompt proíbe frase só para encaixar link ou falar do próprio site ("na seção PC do site").
- Gematsu e a rede Push Square bloqueiam também as **imagens** (403). Pauta exclusiva deles só
  vira matéria se outra fonte do mesmo assunto tiver imagem (sem capa, a pauta é descartada).
- O robô junta fontes do mesmo assunto (semelhança de título ≥ 0,5) para escrever com mais
  substância; ao publicar, marca como `skipped` tudo da fila que trata do mesmo assunto.
- Descartes automáticos na coleta: reviews/impressões de terceiros, enquetes/quizzes/sorteios,
  listas de ofertas, passatempos, cinema/TV, opinião em primeira pessoa.

## Pipeline de publicação (1 post por chamada)

> Ordem de escolha das pautas de notícia: `rankedQueue` (ver decisoes.md, 2026-11-12). Diagnóstico por
> fonte: `GET /api/cron/fontes?token=...`.

Código: `writer.server.ts` (redator), `quality.ts` (checagem), `assemble.ts` (corpo final),
`media.ts`/`media.server.ts` (imagens e vídeos). Regras baseadas no robô do Anime Profile
(`animeprofile/src/lib/ai-news/worker/`: prompt, quality, html, media, localize).

1. **Escolher**: itens `new` das últimas 48 h, pela pontuação; junta até 2 fontes do mesmo assunto.
2. **Fontes e mídia**: texto da página (ou do RSS) e mídia do RSS (`feed_items.media`, gravada na
   coleta) + da página (`og:image`, imagens do `<article>`, vídeos do YouTube, links oficiais de lojas).
3. **Imagens antes do Gemini** (`chooseMedia`): baixa até 10 candidatas na maior resolução que o CDN
   oferece (`imageCandidates`: gnwcdn/IGN `width=1600`, WordPress sem `-300x169`, Future `-1920-`),
   descarta repetidas (mesmo arquivo). **Nitidez** (desde 2026-11-12): desvio-padrão do laplaciano
   numa cópia de 800 px; ≥ 8 é boa, < 6 é borrada (quadro de vídeo ampliado deu 4,7). **Capa**: horizontal,
   ≥ 1200 px e nítida, na ordem das fontes; senão a nítida maior; senão a mais nítida se ≥ 6 (aceita ≥ 800 px);
   imagem borrada também não entra no corpo;
   **sem capa a pauta é descartada** sem gastar cota. **Corpo**: até 3, ≥ 600 px, diferentes da capa.
4. **Vídeo**: 1º vídeo do YouTube das fontes que o oEmbed confirma (existe e pode ser incorporado).
5. **Escrever** (Gemini, JSON): `focusKeyword`, título 30–70 caracteres com a palavra-chave,
   2 títulos alternativos, `metaDescription` 120–160, linha fina, 3–6 tags, plataformas e corpo em
   blocos (`p`, `h2`, `h3`, `ul`, `quote`) com links `[texto](url)`. Guia editorial no `SYSTEM`:
   lide com a palavra-chave, 2+ h2 informativos, "Para o jogador brasileiro" só com dado das fontes,
   última seção "Mais sobre <palavra-chave>", 450–700 palavras, nada inventado, rumor sinalizado.
6. **Links**: o prompt traz a lista permitida — internos (matérias do site mais parecidas, páginas
   de plataforma, lançamentos) e externos (matérias originais, links oficiais de lojas).
   `sanitizeLinks` tira qualquer link fora da lista (vira texto) e repetido.
7. **Checar** (`autoFix` + `checkDraft`): troca expressões de IA com troca segura, encurta título
   (usa alternativo) e meta description; reprova por: título/meta fora do tamanho, palavra-chave fora
   do título ou do lide, expressões de IA, frase em inglês, < `robot_min_words`, < 2 h2, sem
   "Mais sobre", h2 genérico, parágrafo > 110 palavras, parágrafos quase iguais, rumor da fonte
   apresentado como fato, número que não está nas fontes. **Reprovou → o Gemini refaz com a lista
   de problemas** (até 3 tentativas); reprovou em todas → item `failed` com os motivos.
   Rumor = só "rumor/leak/insider/unconfirmed" na fonte ("reportedly" é reportagem atribuída e
   causava falso positivo). Na 1ª versão o Gemini ficava em 260–310 palavras: o prompt pede 500–700
   (mínimo 400) e a reprovação diz quantas palavras faltam.
8. **Completar mídia** (`enrich.server.ts`, depois da checagem, com a palavra-chave já definida):
   - poucas imagens nas fontes → **capturas oficiais da loja Steam** (API pública, sem chave:
     `storesearch` + `appdetails`), até uma por h2 (máx. 3), crédito "Imagem: divulgação/Steam".
     Só aceita o mesmo jogo (`sameGame`: nome começa pela palavra-chave, tipo "game", sem DLC/trilha/demo);
   - sem vídeo nas fontes → **trailer no YouTube** (API de dados v3, só com `YOUTUBE_API_KEY`; 100 da cota
     grátis de 10.000/dia por busca). Aceita título com o nome do jogo + trailer/gameplay/teaser/reveal
     e recusa reaction/review/leak.
9. **Montar** (`assembleBody`): vídeo depois do lide, uma imagem abaixo de cada h2 (alt =
   "palavra-chave: título da seção", crédito "Imagem: reprodução/<veículo>"), link interno garantido
   (1ª menção de plataforma vira link se o Gemini não pôs nenhum) e "Leia também" depois do 3º parágrafo.
10. **Publicar**: grava as imagens em WebP (sharp, até 1600 px) em `MEDIA_DIR` (padrão
   `~/respawnou-media`, fora da pasta do app, que é trocada a cada deploy), servidas em `/media`
   com cache de 1 ano; grava o post com `meta_description`, `focus_keyword`, `tags`, capa e crédito.
11. **Refazer**: `/api/cron/publicar?token=...&refazer=<id do post>` reescreve um post do robô com
    as regras atuais, no mesmo endereço (`&dry=1` para só ver).

Teste real (2026-11-11): post #1 refeito com 564 palavras, capa própria em WebP (55 KB, cache de
1 ano), links internos e para IGN/GameSpot, tags e meta description. Sem imagem no corpo porque as
pautas antigas não tinham a mídia do RSS gravada (só as coletadas depois da migration 003 têm).

Página do post: `<h1>` = título; meta description; `robots max-image-preview:large` (Discover);
JSON-LD NewsArticle com imagem, `keywords` (tags), `articleSection` e logo; crédito da capa;
tags com link para a busca.

## Promoções: jogos grátis (job `ofertas`)

Código: `app/lib/robot/offers.server.ts`. Roda dentro da coleta, no máximo a cada 3 h (ou pelo botão
"Buscar jogos grátis" no painel / `GET /api/cron/ofertas`).

- **Epic Games Store** (`freeGamesPromotions`, endpoint público da loja, `country=BR`): grátis atual e
  próximos, com datas exatas e preço normal em reais. Ignora free-to-play (preço original 0), DLC e
  "jogo misterioso".
- **GamerPower** (`gamerpower.com/api/giveaways?type=game`, pública, exige crédito): só lojas grandes
  (Steam, GOG, Prime Gaming, Ubisoft, EA, PlayStation, Xbox, Switch, mobile) e só com prazo definido.
  IndieGala, itch.io, Stove, VR e brindes sem prazo ficam de fora. A Epic vem só da própria loja.
- A arte de cada oferta é baixada uma vez e servida em `/media` (WebP). Brinde que some da origem
  antes do prazo é encerrado; se a origem não responder, nada é apagado.
- **Matéria**: o grátis da Epic que já começou, ainda tem 6 h ou mais e não virou post tem
  **prioridade** sobre as notícias na próxima publicação (conta no limite diário). Fontes: dados da
  Epic (datas em horário de Brasília, preço, como resgatar, próximos grátis) + ficha da Steam em
  português do Brasil (`l=brazilian`: descrição, gêneros, idiomas, requisitos mínimos). Passa pelo
  mesmo `writeFromSources` (checagem e até 3 tentativas). Sem material suficiente, o jogo fica só na
  lista (`post_status` = skipped/failed, com o motivo em `post_note`).
- **Site**: `/promocoes` mostra "Grátis agora" (cards com arte, prazo, preço normal, botão para a loja
  com `nofollow` e link para a nossa matéria) e "Próximos grátis já anunciados", com o crédito
  "Dados: Epic Games Store e GamerPower". A editoria entra no menu quando há grátis ativo, mesmo sem
  matéria. A home mostra até 3.
- Ofertas de desconto (Steam etc.) ficam para os artigos de compilação (etapa 4).

## Jogos e lançamentos (IGDB, job `jogos`)

Código: `app/lib/robot/igdb.server.ts`. Chaves `IGDB_CLIENT_ID`/`IGDB_CLIENT_SECRET` (app em dev.twitch.tv,
cadastradas em 2026-11-12). Roda dentro da coleta, no máximo a cada 6 h (ou "Atualizar lançamentos" no
painel / `GET /api/cron/jogos`). O diagnóstico testa o acesso.

- Os **150 mais aguardados** (hypes) com 1º lançamento entre 30 dias atrás e 1 ano à frente, nas plataformas do site
  (PC, PS4/PS5, Xbox One/Series, Switch/Switch 2, Android/iOS). Quem sai da lista e não tem matéria é
  removido. Endereço pelo nome do jogo (corrigido enquanto a ficha não tem matéria).
- Só jogo principal, expansão, expansão independente, remake, remaster e edição expandida; precisa de
  arte ou capa. Data exata (dia) nas nossas plataformas vai para `release_date`; data imprecisa vira
  `release_label` ("4º tri. de 2027") e não entra no calendário.
- Gêneros traduzidos por tabela; arte 1080p, capa, 6 capturas e trailer (YouTube) do próprio IGDB.
- Descrição em português: 1 pedido ao Gemini por execução, até 12 jogos (os mais aguardados), só com o
  que o resumo em inglês diz. Até traduzir, a ficha mostra uma frase montada com os dados.
- Matéria nova é ligada à ficha quando a palavra-chave é o nome do jogo (`posts.game_id`).
- **Fichas sem matéria têm `noindex` e ficam fora do sitemap** (só dados não é conteúdo próprio).
- Crédito "Dados: IGDB.com" na ficha e no calendário. Termos: grátis também para uso comercial; com
  anúncios, pedir a parceria em partner@igdb.com (lembrete em adsense.md).

## Guias de requisitos de PC

Código: `app/lib/robot/guides.server.ts`. Jogo de PC do calendário (IGDB) saindo entre 10 dias atrás e
21 dias à frente, dos mais aguardados, com requisitos **mínimo e recomendado** na Steam (pt-BR). Vira
"Requisitos de PC de X: mínimo e recomendado" na editoria Guias (tag Requisitos), ligado à ficha do
jogo. No máximo 1 por dia; prioridade depois das compilações e antes das notícias. Jogo tentado (com
ou sem sucesso) fica em `settings.guides_tried` e não volta. Só os requisitos da Steam: nada de
benchmark inventado. Teste: `/api/cron/publicar?dry=1&guia=1`.

## Artigos de compilação

Código: `app/lib/robot/compilations.server.ts`. Matérias feitas a partir de dados (não reescrevem
outra matéria), no fuso de Brasília, no máximo uma por período (`settings.compilations`). Prioridade
na publicação: grátis da Epic → consenso → compilação do dia → notícias.

**Fora do dia (2026-11-12):** card "Compilação agora" em `/admin/robo` — escolhe o tipo e testa (sem
gravar) ou publica na hora (`publish({ force, compilation })`, só essa compilação). Publicada à mão,
marca o período (o automático não repete); se falhar, não marca. Sem dados → "Sem dados para a
compilação". Pela rota: `/api/cron/publicar?compilacao=<tipo>&force=1`.

| Tipo | Editoria | Quando | Fontes |
|---|---|---|---|
| `ofertas` | Promoções (tag Ofertas) | sexta | CheapShark (seleção: Steam, ≥ 85% de avaliações positivas, ≥ 2 mil análises, ≥ 50% de desconto) + Steam Brasil (preço em reais, que também precisa ter ≥ 50%; descrição, gêneros, idiomas). 5 a 8 jogos. |
| `resumo` | Artigos (tag Resumo) | domingo | As matérias do próprio site nos últimos 7 dias (mínimo 5), com link interno para cada uma. |
| `lancamentos` | Artigos (tag Lista) | dias 1 a 3 | Os até 12 lançamentos mais aguardados do mês que começa (IGDB), em ordem de data, com link para a ficha de cada jogo. Mínimo 5. |
| `gratis-mes` | Artigos (tag Lista) | dias 1 a 3 | `free_games` do mês anterior, só se o registro cobre o mês inteiro (o primeiro sai em 1º/1/2027, sobre dezembro). Link para a nossa matéria do jogo quando existe. |

Se a geração falhar, o período fica marcado (não insiste a cada hora). Teste sem gravar:
`/api/cron/publicar?dry=1&compilacao=ofertas|resumo|gratis-mes|lancamentos`.

## Consenso da crítica (Reviews)

Código: `app/lib/robot/critics.server.ts` (+ tabelas `critic_reviews` e `critic_consensus`, migration 007).

- **Coleta**: título com "review" (sem "review bomb", "review scores", etc.) não vira notícia; a página
  é lida e a nota vem do **JSON-LD** `Review.reviewRating` do próprio veículo (`bestRating` padrão 5).
  Análises valem por 21 dias na coleta e 30 dias no agrupamento. Até 40 análises lidas por coleta;
  o motivo fica em `feed_items.reason`.
- **Só jogos**: `itemReviewed.@type` = `VideoGame` ou `Game` (IGN); sem tipo (PC Gamer, GamesRadar+), o endereço precisa
  ter `/games/` e não `hardware`. Filmes/séries da IGN e hardware da PC Gamer ficam de fora.
- **Agrupamento**: nome do jogo tirado do título ("X review", "Review: X"); chave sem acento,
  parênteses e ™, com romanos em arábicos ("Diablo IV" = "Diablo 4"). Uma análise por veículo.
- **Veículos que funcionam** (2026-11-11): IGN (+ feed `?tags=review`), Game Informer (+ `reviews.xml`),
  Eurogamer, VG247, PC Gamer, GamesRadar+. GameSpot e Hookshot (Nintendo Life, Push Square, Pure Xbox)
  dão 403 nas páginas; RPS não publica nota.
- **Publicação**: com **4 veículos** ou mais (`MIN_CRITICS`), o consenso entra na fila de publicação
  depois do grátis da Epic e antes das notícias. Média e lista de veículos são **calculadas pelo
  código**; o Gemini escreve o texto e o quadro (veredito, 3–5 elogios, 2–5 críticas) a partir das
  análises, sempre atribuindo a opinião ao veículo e sem citar a média. Tentativa que falha só volta
  com 2 análises novas.
- **Atualização**: análises que chegam depois recalculam a média e a lista do post (o texto fica).

## Gemini

- Plano gratuito (decisão do projeto: sem APIs pagas). Chave em `GEMINI_API_KEY`.
- Modelos (em ordem): `gemini-3.5-flash` → `gemini-3.5-flash-lite` → `gemini-3.8-flash`.
  `GEMINI_MODEL` (opcional) passa na frente. Quando um modelo funciona depois de outro falhar, ele
  vira o primeiro até o app reiniciar.
- **Chaves novas não acessam mais a família 2.5** (404 "no longer available to new users"); o 404
  sugere o substituto e o cliente tenta ele. Se nenhum existir, lista os modelos da chave e escolhe
  o `gemini-N.N-flash` mais novo.
- `gemini-flash-latest` aponta para `gemini-omni-*`, que **não tem cota gratuita** (limit 0): não usar.
- Em 2026-11-10 o `gemini-3.8-flash` travava (sem resposta em 60 s) e o `3.5-flash` respondia em ~1,5 s.
- Raciocínio reduzido (`thinkingLevel: "low"` na 3.x; `thinkingBudget: 512` na 2.x): reescrever
  fontes não precisa de muito raciocínio, e o padrão deixava a resposta lenta.
- Cada fonte entra no prompt com no máximo 1.500 palavras.
- Cota do plano gratuito é **por projeto do Google Cloud**: a chave do Respawnou deve ficar num
  projeto separado do Anime Profile para não dividir limites.
- Erro 429 (limite): a execução termina com erro e a pauta continua na fila.
- Saída estruturada em JSON (response schema).

## Fontes iniciais

Ver migration 002. RAWG (dados de jogos e lançamentos) estava fora do ar em 2026-11-10;
o robô funciona sem ele (posts sem ficha de jogo). Alternativa: IGDB (Twitch).

## Regras de qualidade

Ver [adsense.md](adsense.md) → "Regras do robô".
