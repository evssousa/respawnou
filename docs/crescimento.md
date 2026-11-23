# Plano de crescimento orgânico (custo zero)

Criado em 2026-11-20 pelo planejador. Status: ⏳ aprovado nas 4 frentes, na ordem abaixo. **Frente 1 (Arcade, A1 a A9) no ar em 2026-11-20**; falta o dono revisar os 13 textos (A10). Demais frentes não começaram.

## Objetivo

Fazer o respawnou.com.br ser achado no Google por muitos assuntos de games (jogos do Arcade, dados de
jogos, guias e listas que não envelhecem, Discover) sem gastar nada: sem API paga, Gemini só no plano
gratuito, nada de conteúdo em massa que arrisque o AdSense.

## Contexto (2026-11-20)

- Site com 11 dias, ~100 URLs no sitemap, 52 indexadas, 289 impressões/dia. Pedido do AdSense entre 24/11 e 1/12.
- Robô publica 7 a 8 notícias/dia (efêmeras), 1 guia de requisitos/dia (só jogos saindo de -10 a +21 dias),
  ofertas (sexta), resumo (domingo), lançamentos do mês e grátis do mês (dias 1 a 3).
- **Arcade:** 13 jogos próprios. `/arcade/<slug>` já tem title `"<Nome>: jogo grátis online | Respawnou"`,
  meta description do catálogo, canonical, OG com a imagem padrão (`og-default.png`), JSON-LD `VideoGame`,
  entra no sitemap (`changefreq monthly`, sem `lastmod`). O H1 é só o nome ("Cabo de Força", "Trinca"), que
  ninguém busca. Texto: só "Como jogar" (4 itens) e "Controles". "Mais jogos" é rotação do catálogo, não
  jogos parecidos. O script do AdSense **não carrega** em `/arcade/<jogo>` (`gamePage` em `app/root.tsx`): é regra do projeto, não mexer.
- **Fichas (`/jogos/:slug`):** dados do IGDB (data, plataformas, estúdio, gêneros, arte, 6 capturas, trailer,
  descrição em pt-BR). Sem matéria = `noindex` e fora do sitemap (31 hoje). Title atual promete "review" mesmo
  sem review. O IGDB e a Steam oferecem de graça dados que a ficha não usa: data **por plataforma**, nota da
  crítica agregada, modos de jogo, franquia, jogos parecidos, idiomas (inclusive português do Brasil),
  requisitos de PC e preço em reais.
- **Discover:** já existe `max-image-preview:large` (`app/lib/seo.ts`), capa própria WebP até 1600 px,
  `NewsArticle` com imagem, datas e logo, RSS em `/rss.xml`. Faltam autor com página, imagens em 3 proporções,
  RSS com imagem, fontes locais e `fetchpriority` na capa (auditoria completa na frente 4).

## Arquivos afetados (visão geral)

| Frente | Arquivos |
|---|---|
| 1 Arcade | `app/lib/arcade.ts`, novo `app/lib/arcade-seo.server.ts`, `app/routes/arcade-game.tsx`, `app/routes/arcade.tsx`, `app/components/ArcadeShell.tsx` (texto de compartilhar), nova rota `app/routes/og-arcade.ts` + `app/routes.ts`, `app/routes/sitemap.ts`, `app/routes/post.tsx` (card do Arcade na lateral), `docs/arcade.md` |
| 2 Fichas | `db/migrations/010_fichas.sql` (nova), `app/lib/robot/igdb.server.ts`, `app/lib/robot/enrich.server.ts` (reuso de `steamGame`), novo `app/lib/game-index.ts`, `app/lib/types.ts`, `app/lib/repo/mysql.server.ts`, `app/routes/game.tsx`, `app/routes/sitemap.ts`, `docs/automacao.md`, `docs/banco-de-dados.md` |
| 3 Evergreen | `app/lib/robot/compilations.server.ts`, `app/lib/robot/guides.server.ts`, `app/lib/robot/robot.server.ts` (ordem de prioridade), `app/routes/admin/robot.tsx` (card "Compilação agora" ganha os tipos novos), `docs/automacao.md` |
| 4 Discover | `app/lib/seo.ts`, `app/routes/post.tsx`, `app/components/ui.tsx` (`Art`), `app/routes/rss.ts`, `app/root.tsx` + `app/app.css` (fontes), `app/lib/robot/robot.server.ts`/`media.server.ts` (recortes da capa), nova rota `app/routes/team.tsx` (`/redacao`), `app/lib/site.ts` (`DOC_PAGES`), `app/routes/editorial.tsx` |

## Regras que valem para todos os passos

- Rodar `npm run build` antes de cada push (React Router: loaders usam `routePath`; ver memória/decisoes).
- Commit + push ao fim de cada passo verificado. Um passo = um commit.
- Migration nova: o `server.js` aplica sozinha no deploy, **mas o SQL inteiro vai colado na resposta do chat** para o dono.
- Nada de Gemini a mais por página: textos das fichas e FAQs são montados por código; os textos do Arcade são escritos uma vez e ficam no repositório.
- Não marcar nada como `Review` nem `aggregateRating` no JSON-LD (a nota não é nossa; risco de ação manual).
- Não usar `FAQPage` nas fichas: o Google só mostra esse resultado para sites de governo/saúde, e repetir o mesmo bloco em dezenas de páginas parece modelo em massa. A seção de perguntas aparece **na página**, com texto visível.

---

## Frente 1: SEO das páginas do Arcade

### Direção visual

Mesma "Central de Comando" do site (fundo quase preto, verde-limão de destaque, Anton + JetBrains Mono).
A página continua sendo um jogo primeiro: o olho vê **título → jogo → botão Jogar**; só quem rola encontra
o texto. Nada entre o título e o canvas além da linha de busca no H1 e a frase curta que já existe. Evitar
"parede de texto": o texto vem em blocos curtos com h2, ao lado de uma ficha rápida.

Hierarquia: 1) H1 (nome grande + linha de busca pequena) 2) canvas 3) Como jogar / Controles (já existe)
4) Sobre o jogo + Ficha rápida (novo) 5) Jogos parecidos (refeito).

### Estrutura da página `/arcade/<slug>` (ordem final)

1. Trilha `ARCADE / CATEGORIA` (como hoje).
2. **H1 em duas linhas, num só `<h1>`:**
   ```tsx
   <h1 className="flex flex-col gap-2">
     <span className="font-display text-5xl uppercase leading-none sm:text-6xl">{game.name}</span>
     <span className="font-mono text-xs font-bold uppercase tracking-wide text-acc sm:text-sm">{seo.h1Line}</span>
   </h1>
   ```
   Ex.: "Campo Minado" / "CAMPO MINADO ONLINE GRÁTIS · SEM FIM". Depois, o `<p>` da tagline (como hoje).
   No celular a linha mono quebra em 2 linhas no máximo (até 44 caracteres).
3. `ArcadeShell` (sem mudança).
4. Grade "Como jogar" + "Controles" (sem mudança).
5. **Novo: "Sobre o jogo"** (`<section aria-labelledby="sobre">`):
   - `SectionTitle` com `code="ARQUIVO // SOBRE O JOGO"` e título `Sobre o <acento>{nome}</acento>` (no padrão de "Mais <span acc>jogos</span>").
   - Grade `lg:grid-cols-[minmax(0,720px)_320px] gap-8`; abaixo de `lg`, uma coluna (texto primeiro, ficha depois).
   - Coluna do texto: `<div className="article-body">` (reaproveita a tipografia das matérias: p, h2, ul) com os blocos de `ARCADE_SEO[slug].about`: 1 parágrafo de abertura (com a palavra-chave nas primeiras 15 palavras), h2 "Dicas para …" com `ul` de 3 a 5 dicas, h2 "De onde vem o …" (história/variações) com 1 a 2 parágrafos. Total **150 a 300 palavras** por jogo, sem contar "Como jogar".
   - Coluna da ficha (`<aside className="ch flex flex-col gap-3 bg-ink-2 p-5 sm:p-6">`): título mono `> FICHA RÁPIDA` (`font-mono text-xs font-semibold text-acc`) e um `dl` em `grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm` (mesmo estilo do card "Ficha do jogo" de `post.tsx`):
     Categoria · Jogadores: 1 · Funciona em: PC, celular e tablet · Precisa baixar: Não · Cadastro: Não · Recorde: salvo neste navegador · Atualizado em: `dd/mm/aaaa` (campo `updated`).
6. **"Jogos parecidos"** (substitui "Mais jogos"): título `Jogos <span acc>parecidos</span>`, 3 cards do campo `related` + um 4º card-link "VER OS 13 JOGOS →" (`chs bg-ink-2 hover:bg-ink-3`, mesmo tamanho dos outros, conteúdo centralizado, `font-display text-2xl uppercase`, a seta em `text-acc`; o número vem de `ARCADE_GAMES.length`). Grade `grid-cols-2 lg:grid-cols-4` como hoje. Estados: hover troca fundo para `ink-3` e o nome para `text-acc` (igual ao atual); foco usa o `focus-visible` global.

Tokens (já existem em `app/app.css`, não criar novos): fundo `ink` #060807, cartões `ink-2` #0c110c / hover `ink-3` #111611, texto `paper` #eef3ea / `body` #b4bfb0 / `muted` #8a9787, linhas `line` #1c241a / `line-soft` #243022, destaque `acc` #c8ff2e. Recorte `ch`/`chs`. O site só tem tema escuro.

### Dados por jogo (copiar para `arcade-seo.server.ts`)

`title` vai para `seo()`, que acrescenta " | Respawnou" (11 caracteres): manter `title` com até 50 caracteres.
`description` entre 140 e 158 caracteres, com a palavra-chave no começo (o executor reescreve a atual nessa linha, sem perder o que ela diz).

| slug | Palavra-chave principal | `title` | `h1Line` | Termos que o texto deve cobrir | `related` |
|---|---|---|---|---|---|
| sudoku | sudoku online | Sudoku online grátis: fácil, médio e difícil | SUDOKU ONLINE GRÁTIS · FÁCIL AO DIFÍCIL | sudoku 9x9, anotações/candidatos, técnica do "único possível", origem (Number Place, nome japonês) | campo-minado, caca-palavras, memoria |
| campo-minado | campo minado online | Campo Minado online grátis, sem fim | CAMPO MINADO ONLINE GRÁTIS · SEM FIM | como ler os números, bandeira, abrir em "acorde", padrão 1-2-1, origem (anos 1980/90, vinha no Windows) | sudoku, paciencia, memoria |
| paciencia | paciência online | Paciência online grátis (Klondike) | PACIÊNCIA ONLINE GRÁTIS · KLONDIKE VIRA 1 | jogo de paciência, Klondike, vira 1 vs vira 3, dica de liberar colunas, Rei em coluna vazia, história (popular no Windows) | campo-minado, sudoku, trinca |
| memoria | jogo da memória online | Jogo da memória online grátis, com fases | JOGO DA MEMÓRIA ONLINE · 6 A 36 CARTAS | jogo da memória, pares, fases, dicas de memorizar por posição, bom para crianças e adultos, Concentration | trinca, caca-palavras, sudoku |
| caca-palavras | caça-palavras online | Caça-palavras online grátis de games | CAÇA-PALAVRAS ONLINE · PALAVRAS DE GAMES | caça palavras, direções (diagonal, de trás para frente), dica de procurar a 1ª letra rara, palavras do mundo dos games | memoria, sudoku, trinca |
| pinball | pinball online | Pinball online grátis no navegador | PINBALL ONLINE GRÁTIS · 3 BOLAS | flipper/fliperama, rebatedores, bumpers, multiplicador, dica de segurar a bola, história (fliperamas) | quebra-pixel, meteoros, mira |
| cabo-de-forca | jogo da cobrinha online | Cabo de Força: jogo da cobrinha online | JOGO DA COBRINHA ONLINE · ESTILO SNAKE | jogo da cobrinha, snake, dica de andar pelas bordas, pilha dourada, história (celulares dos anos 1990) | quebra-pixel, respawn, torre |
| quebra-pixel | jogo de quebrar blocos online | Quebra-Pixel: quebrar blocos online grátis | JOGO DE QUEBRAR BLOCOS · FASES INFINITAS | quebra-tijolos, raquete e bolinha, ângulo pela ponta da raquete, blocos de 1 a 3 batidas, história (gênero dos anos 1970) | pinball, cabo-de-forca, meteoros |
| meteoros | jogo de nave online | Chuva de Meteoros: jogo de nave online | JOGO DE NAVE ONLINE · DESVIE E ATIRE | jogo de nave, tiro automático, meteoros que se partem, itens (tiro triplo, escudo), história (jogos de asteroides) | quebra-pixel, respawn, mira |
| trinca | jogo de combinar 3 online | Trinca: jogo de combinar 3 peças online | COMBINE 3 PEÇAS · CONTRA O RELÓGIO | jogo de juntar 3, cascata, linhas de 4 e 5, peças com formato para daltonismo, gênero "match-3" | memoria, caca-palavras, torre |
| mira | teste de reflexo online | Mira: teste de reflexo e treino de mira | TESTE DE REFLEXO · TREINO DE MIRA | treino de mira, tempo de reação, mirar no centro, sequência/multiplicador, por que treinar mira ajuda em jogos de tiro | torre, pinball, meteoros |
| torre | jogo de empilhar blocos online | Torre: jogo de empilhar blocos online | EMPILHE BLOCOS · TORRE SEM LIMITE | jogo de empilhar, encaixe perfeito, ritmo, dica de olhar a borda e não o bloco | mira, respawn, trinca |
| respawn | jogo de corrida infinita online | Respawn: corredor infinito online grátis | CORREDOR INFINITO · PULE E DESVIE | endless runner, pulo curto e longo, drones, de onde vem o nome "respawn" (renascer no jogo) | torre, cabo-de-forca, meteoros |

Regras do texto (o executor escreve os 13; o dono revisa no passo A10):
- Escrito do zero, em pt-BR, tom do site (direto, sem "neste artigo"). Nada de "o melhor do Brasil".
- Marcas de terceiros (Windows, Snake, Breakout, Tetris, Asteroids, Candy Crush) **só como referência histórica no texto**, nunca no `title`, H1, `h1Line` ou meta.
- Dicas devem bater com as regras reais do nosso jogo (conferir `howTo` e o código em `app/arcade/<slug>.ts`).
- Sem frases repetidas entre jogos (abertura e h2 diferentes em cada um).

### Passos

**A1 (P) Catálogo ganha campos leves.** Em `app/lib/arcade.ts`, adicionar a `ArcadeGame`: `related: string[]` (3 slugs da tabela), `updated: string` (`"2026-11-20"` ou a data do commit) e `shareName: string` (nome + termo de busca, ex.: "Sudoku online", "Campo Minado online", "Cabo de Força (jogo da cobrinha)", "Trinca (combinar 3)"). Preencher os 13.
Verificar: `npm run typecheck` (ou `npm run build`) sem erro.

**A2 (M) Textos fora do pacote do navegador.** Criar `app/lib/arcade-seo.server.ts` exportando
`ARCADE_SEO: Record<string, { title: string; description: string; h1Line: string; keyword: string; about: Block[] }>`
(tipo `Block` de `app/lib/types.ts`, só `p`, `h2`, `ul`). Os textos ficam aqui porque `arcade.ts` vai para o bundle do
cliente (home, lista) e 13 × 300 palavras pesariam em todas as páginas.
Verificar: cada jogo com `about` entre 150 e 300 palavras (contar com um script rápido no terminal ou no próprio teste); `title` ≤ 50, `description` 140–158, `h1Line` ≤ 44.

**A3 (M) Página do jogo usa o SEO novo.** Em `app/routes/arcade-game.tsx`: o loader devolve `{ game, seo: ARCADE_SEO[slug] }`; `meta` usa `seo.title`, `seo.description`, `image: "/og/arcade/<slug>.png"` (passo A5) e mantém o canonical; H1 em duas linhas (ver Estrutura); nova seção "Sobre o jogo" + ficha rápida; "Jogos parecidos" com `related`. Renderizar os blocos com o mesmo HTML do `BodyBlock` de `post.tsx` (copiar só p/h2/ul, ou extrair `BodyBlock` para `app/components/BodyBlock.tsx` e usar nos dois; preferir extrair).
Verificar: `npm run dev`, abrir `/arcade/sudoku` em 375 px e 1440 px: o canvas aparece sem rolar no PC; no celular o título + linha mono + tagline não passam de ~170 px de altura; o texto só aparece depois de Controles; nenhuma rolagem lateral; Lighthouse sem queda de CLS.

**A4 (P) JSON-LD mais completo.** Em `meta` da página do jogo, trocar o objeto por um `@graph` com:
- `VideoGame` + `WebApplication` no mesmo nó (`"@type": ["VideoGame", "WebApplication"]`), com `name`, `description` (a nova), `url`, `image` (OG do A5), `genre`, `gamePlatform`, `applicationCategory: "GameApplication"`, `operatingSystem: "Qualquer (navegador)"`, `browserRequirements: "Requer JavaScript e HTML5"`, `playMode: "SinglePlayer"`, `numberOfPlayers: 1`, `isAccessibleForFree: true`, `offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" }`, `inLanguage`, `publisher`, `dateModified: game.updated`. **Sem** `aggregateRating`.
- `BreadcrumbList`: Início → Arcade → <Nome>.
Verificar: colar a URL de produção (depois do deploy) no **Teste de resultados avançados** do Google e no validator.schema.org: 0 erros.

**A5 (M) Imagem de compartilhamento por jogo.** Nova resource route `app/routes/og-arcade.ts` em `/og/arcade/:slug.png` (registrar em `app/routes.ts`; **não** usar o prefixo `/arcade/` para não cair na regra `gamePage`): gera 1200×630 com `sharp` a partir de um SVG montado no servidor: fundo `#060807`, a miniatura do `ArcadeThumb` (renderizar com `renderToStaticMarkup` do `react-dom/server`) ocupando a metade direita (600×338, `shape-rendering: crispEdges`), à esquerda o nome do jogo (o sharp não carrega a Anton do site; usar `font-family="Impact, Arial Black, sans-serif"`, caixa alta, 84 px, `#eef3ea`), a `h1Line` em 26 px `#c8ff2e` monoespaçada, e "RESPAWNOU · ARCADE" no rodapé em 22 px `#8a9787`). Borda inferior de 8 px `#c8ff2e`. Guardar em memória (Map) e responder com `Cache-Control: public, max-age=604800`.
Verificar: abrir `/og/arcade/pinball.png` no navegador (1200×630, nítida); depois do deploy, colar `/arcade/pinball` no depurador de compartilhamento do Facebook ou no WhatsApp e ver a imagem do jogo, não a padrão.

**A6 (P) Texto de compartilhar com a palavra-chave.** Em `ArcadeShell.tsx`, `text = "Fiz ${score} pontos no ${game.shareName} do Respawnou! Tenta bater:"`.
Verificar: terminar uma partida no PC → WhatsApp Web abre com o texto novo e a URL `/arcade/<slug>`.

**A7 (P) Sitemap com data.** Em `app/routes/sitemap.ts`, as entradas do Arcade ganham `lastmod: g.updated`. Manter `changefreq monthly`.
Verificar: `/sitemap.xml` local mostra `<lastmod>` nos 13.

**A8 (P) Lista `/arcade` mais forte.** Em `app/routes/arcade.tsx`: title "Jogos online grátis: sudoku, paciência, campo minado e mais" (≤ 50 + sufixo → ajustar para "Jogos online grátis: sudoku, paciência e mais"); description cita 5 nomes de busca (sudoku, paciência, campo minado, jogo da memória, caça-palavras); JSON-LD `ItemList` com os 13 (`url` e `name` = `title` do jogo, posição na ordem do catálogo); embaixo da grade, um parágrafo de 60–90 palavras (mesmo `text-body`, `max-w-2xl`) explicando que são jogos próprios, sem download, salvos no aparelho. O canonical segue `/arcade` mesmo com `?categoria=`.
Verificar: página sem rolagem lateral em 375 px; `ItemList` válido no validator.

**A9 (P) Links das matérias para o Arcade.** Em `post.tsx`, na lateral, depois de `MostRead`: card "PASSE O TEMPO" com 1 jogo do dia (reusar a mesma escolha diária da home; se a função estiver dentro de `home.tsx`, mover para `app/lib/arcade.ts` como `dailyArcade(n)` e usar nos dois). Visual: `ArcadeCard` existente, sem criar componente novo. O texto do link é o `title` do jogo (palavra-chave), não "clique aqui".
Verificar: abrir 2 matérias no mesmo dia → mesmo jogo; no dia seguinte troca. A lateral não empurra o corpo no celular (fica no fim, como `MostRead`).

**A10 (P) Revisão do dono + docs.** O dono lê os 13 textos (pode ser no PR/commit ou numa prévia local). Atualizar `docs/arcade.md` ("Como funciona" e "Novo jogo (checklist)": novo jogo precisa de entrada em `ARCADE_SEO`, `related`, `updated`, `shareName`).
Verificar: checklist do `arcade.md` cita os campos novos.

---

## Frente 2: Fichas de jogos úteis (e quando tirar o `noindex`)

### O que a ficha passa a responder

Buscas-alvo: "data de lançamento de X", "X requisitos", "X plataformas", "X tem legenda em português",
"X é multiplayer", "X vai sair para PS4". Cada resposta vem de dado (IGDB/Steam), montada por código.

### Dados novos (todos grátis)

| Dado | Fonte | Campo |
|---|---|---|
| Data por plataforma (PS5, PS4, Xbox Series, PC…) | IGDB `release_dates.*` (já baixado, hoje só vira a menor data) | `releases` JSON `[{ "p": "PS5", "date": "2026-12-05", "label": null }]` |
| Nota da crítica agregada | IGDB `aggregated_rating`, `aggregated_rating_count` | `critic_score` (0–100), `critic_count` |
| Modos (um jogador, multijogador, cooperativo) | IGDB `game_modes.name` (traduzir por tabela, como `GENRES_PT`) | `modes` JSON |
| Franquia | IGDB `franchises.name` ou `collections.name` | `franchise` |
| Jogos parecidos | IGDB `similar_games` (ids) → só os que existem na tabela `games` | `similar_igdb` JSON |
| Requisitos de PC, preço em reais, idiomas | Steam `appdetails` com `l=brazilian&cc=br` (já usado por `steamGame` em `enrich.server.ts`) | `steam_appid`, `pc_min`, `pc_rec`, `price_brl`, `languages` JSON `{ "interface": true, "legendas": true, "audio": false }` |
| Idiomas (sem Steam) | IGDB `language_supports.language.locale` = `pt-BR` + `language_support_type.name` | mesmo `languages`, com `"fonte": "igdb"` |

Nomes de campos do IGDB mudam de vez em quando (ex.: `category` → `game_type`): no passo B2, testar a
consulta antes com 1 jogo e ajustar.

### Migration 010 (colar no chat ao implementar)

```sql
-- 010_fichas.sql: dados extras das fichas de jogos e controle de indexação.
ALTER TABLE games
  ADD COLUMN releases        JSON              NULL AFTER release_label,
  ADD COLUMN critic_score    DECIMAL(4,1)      NULL,
  ADD COLUMN critic_count    SMALLINT UNSIGNED NULL,
  ADD COLUMN modes           JSON              NULL,
  ADD COLUMN franchise       VARCHAR(160)      NULL,
  ADD COLUMN similar_igdb    JSON              NULL,
  ADD COLUMN steam_appid     INT UNSIGNED      NULL,
  ADD COLUMN pc_min          TEXT              NULL,
  ADD COLUMN pc_rec          TEXT              NULL,
  ADD COLUMN price_brl       VARCHAR(40)       NULL,
  ADD COLUMN languages       JSON              NULL,
  ADD COLUMN steam_synced_at DATETIME          NULL,
  ADD COLUMN index_from      DATETIME          NULL,   -- quando a ficha passou a ser indexável (nunca volta a NULL sozinho)
  ADD KEY ix_games_index (index_from);
```

### Critério para tirar o `noindex` (função pura `app/lib/game-index.ts`)

```
indexavel(game, postsCount):
  se postsCount >= 1                      → indexa (regra de hoje, continua)
  senão exige TUDO:
    descrição em pt-BR do IGDB (game.description, ≥ 120 caracteres; a frase montada por describe() não conta)
    data exata OU rótulo diferente de "sem data"
    trailer OU ≥ 4 capturas
    e pelo menos 3 destes 5 blocos "fortes":
      1. requisitos mínimo E recomendado (pc_min e pc_rec)
      2. idiomas com informação de português (languages != null)
      3. nota da crítica com critic_count ≥ 3
      4. datas de ≥ 2 plataformas em releases
      5. ≥ 3 jogos parecidos que existem no site
```

- **Ritmo:** quando uma ficha passa no critério pela 1ª vez, o job `jogos` grava `index_from = agora`, no máximo
  **5 por semana** (as de maior `hypes` primeiro) até o AdSense responder; depois 10 por semana. Só fichas com
  `index_from` preenchido perdem o `noindex` e entram no sitemap. Assim não aparecem 30 páginas novas de uma vez.
- **Nunca apagar ficha indexada:** em `syncGames`, o `DELETE` dos que saíram dos 150 ganha `AND index_from IS NULL`
  (hoje ele só protege fichas com matéria). Ficha indexada que saiu da lista fica com os dados da última atualização.
- Ficha que deixa de cumprir o critério (ex.: Steam tirou os requisitos) **continua** indexada; o critério é só de entrada.

### Estrutura visual da ficha (ordem)

Mantém o topo atual (arte + H1 + descrição + `dl` + plataformas). Abaixo, na ordem, só as seções com dado
(seção sem dado não aparece, nem o título dela):

1. **Data de lançamento** (`SectionTitle code="CALENDÁRIO" accent="por plataforma"`: "Lançamento"). Tabela simples em `ch bg-ink-2 p-5`: linhas com `min-h-11`, `border-b border-line`, plataforma à esquerda (`font-mono text-xs font-bold uppercase text-acc`), data à direita (`text-paper`). Jogo futuro: na 1ª linha, ao lado da data, a contagem "faltam N dias" em `text-muted` (reusar o cálculo do calendário). Celular: a mesma tabela, 1 coluna.
2. **Requisitos de PC** (`code="HARDWARE"`: "Requisitos de PC"). Dois cartões lado a lado em `lg:grid-cols-2` (um embaixo do outro no celular), `ch bg-ink-2 p-5`, título mono `> MÍNIMO` / `> RECOMENDADO`, `dl grid-cols-[auto_1fr]` com Sistema, Processador, Memória, Placa de vídeo, DirectX, Armazenamento (parsear o texto da Steam por `Rótulo: valor`; se não der, mostrar o texto em `p`). Rodapé `text-sm text-muted`: "Fonte: página do jogo na Steam, consultada em dd/mm/aaaa." Se existir guia nosso do jogo, botão-link "LER O GUIA COMPLETO →" (`font-mono text-xs font-semibold text-acc`).
3. **Em português?** (`code="IDIOMA"`: "Português"). Três "chips" em linha: INTERFACE · LEGENDAS · ÁUDIO, cada um `chs border px-3 min-h-9 font-mono text-xs`: com suporte = `border-acc text-acc` + "✓", sem = `border-line text-muted` + "—". Frase abaixo montada por código ("Tem interface e legendas em português do Brasil; o áudio é em inglês."). Fonte em `text-muted`.
4. **Nota da crítica** (só com `critic_count ≥ 3`): `ScoreBadge` (já existe em `cards.tsx`) com `critic_score/10`, texto "Média de N análises da imprensa, segundo o IGDB." Se houver consenso nosso publicado, link "VER O CONSENSO DA CRÍTICA →" para a matéria.
5. **Trailer e imagens** (como hoje).
6. **Perguntas frequentes** (`code="FAQ"`: "Perguntas"). Lista de `h3` (`font-display text-2xl uppercase`) + `p text-body`, de 3 a 6 perguntas, **só as que têm dado**. Modelos (escolher a variante pelo id do jogo `% 2`, para não ficar idêntico em todas):
   - "Quando lança {X}?" / "Qual a data de lançamento de {X}?" → data(s) e plataformas.
   - "{X} vai sair para {plataforma ausente mais pedida}?" só se a ficha tem PS5 e não PS4 (ou Switch 2 e não Switch): "Até agora, {X} foi anunciado só para …".
   - "Quais são os requisitos mínimos de {X}?" → processador, memória e placa de vídeo do mínimo.
   - "{X} tem legenda em português?" → a frase do bloco 3.
   - "{X} é multiplayer?" → a partir de `modes`.
   - "Quem desenvolve {X}?" → estúdio e distribuidora, e a franquia se houver.
7. **Jogos parecidos** (`code="RADAR"`): até 4 cards das fichas de `similar_igdb` que existem no site (cair para mesmo gênero + plataforma se faltarem), mesmo card do calendário/`releases.tsx` se houver; senão um card simples com capa (`cover`), nome e data.
8. **Matérias** (como hoje). Sem matéria: trocar "Ainda não publicamos nada sobre este jogo." por um link para `/lancamentos` ("Veja o calendário completo").
9. Crédito "DADOS: IGDB.COM · STEAM" (como hoje, mais Steam quando houver dado dela).

Title/meta (`game.tsx`):
- Futuro: `"{X}: data de lançamento, plataformas e requisitos"` (tirar "requisitos" se não houver; cortar para caber em 60 com o sufixo, sem quebrar palavra).
- Lançado: `"{X}: plataformas, requisitos de PC e nota da crítica"` (mesma regra).
- **Nunca** "review" no title se não houver post de review ligado.
- Meta description por código: "{X} sai em {data} para {plataformas}. Veja requisitos de PC, idiomas, trailer e o que já se sabe." (variar a ordem conforme os dados; 120–158 caracteres).

### Passos

**B1 (P) Migration 010.** Criar `db/migrations/010_fichas.sql` com o SQL acima; atualizar `docs/banco-de-dados.md`.
Verificar: local com MySQL (ou no deploy) `SHOW COLUMNS FROM games` mostra as colunas; **colar o SQL no chat**.

**B2 (M) IGDB traz os campos novos.** Em `igdb.server.ts`: ampliar `FIELDS` (`aggregated_rating, aggregated_rating_count, game_modes.name, franchises.name, collections.name, similar_games, language_supports.language.locale, language_supports.language_support_type.name`), montar `releases` com nomes por plataforma (mapa novo `PLATFORM_NAMES`: 6 PC, 48 PS4, 167 PS5, 49 Xbox One, 169 Xbox Series X|S, 130 Switch, 508 Switch 2, 34 Android, 39 iOS), traduzir modos (`Single player` → Um jogador, `Multiplayer` → Multijogador, `Co-operative` → Cooperativo, `Split screen` → Tela dividida, `Battle Royale` → Battle royale, `Massively Multiplayer Online (MMO)` → MMO) e gravar no `UPDATE/INSERT`. Proteger o `DELETE` com `AND index_from IS NULL`.
Verificar: `GET /api/cron/jogos?token=...` (ou botão "Atualizar lançamentos" no painel) → `SELECT name, critic_count, JSON_LENGTH(releases), modes FROM games ORDER BY hypes DESC LIMIT 10` com dados preenchidos.

**B3 (M) Steam completa as fichas de PC.** Nova função `enrichGamesFromSteam(limit = 15)` (em `igdb.server.ts` ou arquivo novo `app/lib/robot/fichas.server.ts`), chamada no fim do job `jogos`: fichas com `pc` nas plataformas e `steam_synced_at` nulo ou com mais de 7 dias, ordem `hypes DESC`. Usa `steamGame(name)` (com a checagem `sameGame` que já existe) e grava `steam_appid`, `pc_min`, `pc_rec`, `price_brl`, `languages` (ler "Português do Brasil" em `supported_languages`; o asterisco marca áudio). Sem jogo na Steam: grava só `steam_synced_at` (não tenta de novo por 7 dias). 1 requisição por segundo.
Verificar: depois de 1 execução, ≥ 5 fichas de PC com `pc_min`; nenhuma ficha de console recebe requisitos.

**B4 (P) Critério de indexação.** Criar `app/lib/game-index.ts` com `strongBlocks(game)` e `isIndexable(game, postsCount)` (puras, testáveis). No job `jogos`, depois de B3: para as fichas com `index_from IS NULL` que passam no critério, gravar `index_from = UTC_TIMESTAMP()` respeitando o teto semanal (contar `index_from` dos últimos 7 dias; teto em `settings.games_index_per_week`, padrão 5).
Verificar: log do job mostra "fichas liberadas: N"; nunca mais que o teto por semana.

**B5 (G) Ficha nova na tela.** `types.ts` (campos novos em `Game`), `mysql.server.ts` (`GAME_COLS` e leitura dos JSON), `game.tsx` (seções 1 a 9 acima, title/meta novos, `noindex: posts.length === 0 && !game.indexFrom`). JSON-LD `VideoGame`: acrescentar `gamePlatform` por plataforma exata (dos `releases`), `playMode` (dos modos), `inLanguage` se houver PT, `trailer` (`VideoObject` com `embedUrl` do YouTube, `name`, `thumbnailUrl` `https://i.ytimg.com/vi/<id>/hqdefault.jpg` e `uploadDate` = data de sincronização), `BreadcrumbList` (Início → Lançamentos → X). Sem `aggregateRating`.
Verificar: `npm run dev` com dados reais (ou mock com campos novos em `mock-data.ts`) em 375/768/1440: seções sem dado somem; tabela de datas e requisitos sem rolagem lateral em 375 px; FAQ com 3 a 6 perguntas; title muda entre futuro/lançado.

**B6 (P) Sitemap.** `getAllGames` (em `mysql.server.ts`) passa a trazer fichas com matéria **ou** `index_from` preenchido; `lastmod` = `steam_synced_at`/`synced_at`.
Verificar: `/sitemap.xml` mostra só as fichas liberadas; uma ficha sem `index_from` e sem matéria continua com `noindex` no HTML.

**B7 (P) Docs.** `automacao.md` (seção IGDB: campos novos, Steam nas fichas, critério e teto), `banco-de-dados.md`, `decisoes.md` se algo mudar no caminho.
Verificar: docs citam `index_from` e o teto.

---

## Frente 3: Conteúdo evergreen consistente

### Cardápio e cadência (por semana)

| Peça | Quem | Quantas/semana | Dia | Situação |
|---|---|---|---|---|
| Notícias | robô | ~42 (6/dia) | todos | hoje 7–8/dia; reduzir 1–2/dia (pergunta em aberto) para sobrar cota do Gemini |
| Requisitos de PC (jogo saindo) | robô | até 4 | seg–qui | hoje 1/dia; baixar para 4/semana até sair a lista das "rastreadas, mas não indexadas" (suspeita: guias parecidos) |
| Ofertas da semana na Steam | robô | 1 | sexta | já existe |
| Resumo da semana | robô | 1 | domingo | já existe |
| **Lançamentos da semana** (novo) | robô | 1 | segunda | IGDB: jogos com data entre segunda e domingo, com link para cada ficha; mínimo 4 |
| **Lista de dados** (novo, alterna) | robô | 1 | quarta | semana A: "Jogos de {gênero} mais aguardados" (IGDB, hypes, 6–10 jogos, gêneros em rodízio); semana B: "Jogos leves: lançamentos que rodam em PC fraco" (das fichas com `pc_min`, memória ≤ 8 GB e placa de entrada; só quando houver ≥ 5) |
| Consenso da crítica | robô | 0–2 | quando houver | depende de `MIN_CRITICS` (pendência do dono) |
| **Peça com assinatura humana** | dono | 1 | livre | lista comentada, "vale a pena?", opinião, guia de iniciante. Pelo painel ("Nova matéria"), com o nome do autor (ver frente 4) |
| Lançamentos do mês / grátis do mês | robô | mensal | dias 1–3 | já existem |
| **Atualização de peça antiga** (novo) | robô | até 3 | sábado | ver passo C4 |

Total evergreen: ~9 a 11 por semana (contra ~5 hoje), sem aumentar o volume diário total.

**Cota do Gemini (grátis, ~20 pedidos/dia por modelo, 3 modelos):** 6 notícias + 1 peça extra/dia, com até 3 tentativas
cada, cabem em ~25 pedidos/dia no pior caso, mais 1 de traduções do IGDB. Atualizações (C4) não usam o Gemini.

### Riscos de conteúdo em massa (e as travas)

- **"Scaled content abuse"** (spam do Google) e "conteúdo de baixo valor" (AdSense): muitas páginas parecidas
  feitas por modelo. Travas: listas só a partir de dados reais com mínimo de itens; no máximo 1 lista/semana;
  guias limitados a 4/semana até sabermos se o Google aceita os atuais; sem páginas de "tag" ou combinações
  automáticas (gênero × plataforma × ano) indexadas.
- **Repetição de estrutura:** os guias de requisitos têm o mesmo esqueleto. Cada guia precisa de pelo menos 2
  elementos próprios do jogo além das listas: preço em reais, idiomas, comparação mínimo → recomendado com os
  números do jogo, link para a ficha e para guias de jogos do mesmo gênero.
- **Assinatura humana:** ao menos 1 peça por semana assinada por pessoa (frente 4, autor), mostrando que há
  editor. A política editorial já explica o uso de IA; ela passa a citar o que é revisado por humano.
- **Atualizar ≠ mudar a data:** `updated_at` só muda quando um dado muda de fato (data adiada, preço, requisitos).
  Mudar a data sem mudar o texto é manipulação de frescor.

### Passos

**C1 (P) Guias: teto semanal e mais assunto próprio.** Em `guides.server.ts`: trocar "1 por dia" por "1 por dia, máximo `settings.guides_per_week` (padrão 4) nos últimos 7 dias"; no `brief`, exigir um h2 "Roda no seu PC?" que compara os números do mínimo e do recomendado do próprio jogo (sem citar peças que não estão na fonte) e o link para a ficha.
Verificar: `/api/cron/publicar?dry=1&guia=1` mostra o h2 novo; com 4 guias na semana, `guideCandidate()` devolve `null`.

**C2 (M) Compilação "lançamentos da semana".** Em `compilations.server.ts`: novo `CompilationKind` `"lancamentos-semana"` (editoria Artigos, tag Lista), período = semana ISO, dia = segunda (`weekday === 1`), fonte = `games` com `release_date` na semana, mínimo 4, até 12, em ordem de data, com link para a ficha de cada um e as plataformas. Título no padrão "Lançamentos de jogos da semana: {dd} a {dd} de {mês}". Incluir no card "Compilação agora" do `/admin/robo`.
Verificar: `/api/cron/publicar?dry=1&compilacao=lancamentos-semana` gera rascunho com links `/jogos/...` válidos.

**C3 (M) Compilação "lista de dados" (quarta, alterna).** Novo kind `"lista"`: semana ISO par = gênero (rodízio por `settings.lists_genre_index` entre RPG, Tiro, Aventura, Estratégia, Corrida, Luta, Plataforma, Simulação; precisa de ≥ 6 jogos do gênero no banco), ímpar = PC fraco (precisa de B3 e ≥ 5 jogos; senão cai para gênero). Mesmo `COMMON_BRIEF`.
Verificar: `dry=1&compilacao=lista` nas duas variantes (forçar com parâmetro `variante=genero|pcfraco` só no teste).

**C4 (M) Atualização de peças antigas (sem Gemini).** Novo job no sábado dentro da coleta (`settings.compilations.atualizar`): para guias de requisitos e "lançamentos do mês"/"da semana" com mais de 14 dias, comparar com a ficha atual: data mudou, preço mudou, requisitos mudaram. Se mudou: acrescentar no fim do corpo um bloco `p` "Atualização em dd/mm/aaaa: …" (montado por código) e gravar `updated_at`. Máximo 3 por semana. Sem mudança, nada é gravado.
Verificar: forçar com um guia de teste no banco local (mudar o preço da ficha) → bloco de atualização aparece e `ATUALIZADO EM` surge no rodapé do post.

**C5 (P) Prioridade na fila.** Em `robot.server.ts`, a ordem continua: grátis da Epic → consenso → compilação do dia → guia → notícias. As compilações novas entram em "compilação do dia". Ajustar `posts_per_day` só se o dono aprovar (pergunta em aberto); é configuração do painel, não código.
Verificar: em `/api/cron/status`, numa segunda, a 1ª publicação do dia é a lista da semana.

**C6 (P) Docs.** `automacao.md`: tabela de compilações com os tipos novos, teto dos guias, job de atualização; `adsense.md`: regra "peça humana por semana" no checklist.

---

## Frente 4: Google Discover

### Auditoria do que já existe

| Requisito do Discover | Situação | Onde |
|---|---|---|
| `max-image-preview:large` | ✅ em todas as páginas indexáveis | `app/lib/seo.ts` |
| Imagem grande (≥ 1200 px de largura) | ⚠️ capa preferida ≥ 1200, mas o robô aceita até 800 px quando não há melhor | `robot` `chooseMedia` (automacao.md, passo 3) |
| `og:image` com largura/altura/alt nas matérias | ❌ só a imagem padrão tem `og:image:width/height/alt` | `seo.ts` |
| `NewsArticle` com `headline`, `image`, datas, `publisher.logo` | ✅ | `post.tsx` |
| Imagem em 3 proporções (16:9, 4:3, 1:1) no JSON-LD | ❌ uma só | `post.tsx` |
| Autor com página (E-E-A-T) | ❌ `author` é `Organization` "Redação Respawnou", sem `url`, sem página | `post.tsx`, sem rota |
| Política editorial, Sobre, Contato | ✅ | `editorial.tsx`, `about.tsx`, `contact.tsx` |
| Títulos sem isca | ✅ regras do robô (palavra-chave, 30–70 caracteres); falta lista de expressões de isca na checagem | `quality.ts` |
| Velocidade: capa da matéria | ⚠️ `loading="eager"` mas sem `fetchpriority="high"` | `app/components/ui.tsx` (`Art`) |
| Velocidade: fontes | ⚠️ 3 famílias do Google Fonts por CSS externo (bloqueia a 1ª pintura) | `app/root.tsx` |
| Frescor (`datePublished`/`dateModified`, `article:*_time`) | ✅ | `seo.ts`, `post.tsx` |
| Feed RSS | ⚠️ existe, 30 itens, sem imagem nem autor | `app/routes/rss.ts` |
| Assuntos do momento | ✅ o robô já pontua pautas recentes (`rankedQueue`) | `robot.server.ts` |
| Mesma capa em várias matérias | ❓ não há trava | `chooseMedia` |

### Passos

**D1 (P) Capa com prioridade.** Em `Art` (`ui.tsx`), quando `eager`, pôr `fetchPriority="high"` e `decoding="async"`.
Verificar: no HTML de uma matéria, `<img ... fetchpriority="high">` na capa; PageSpeed Insights (celular) com LCP igual ou menor que antes.

**D2 (M) Fontes locais.** Baixar Anton, Inter (400–700) e JetBrains Mono (400, 600, 700) em woff2, só subconjunto latino, para `public/fonts/`; `@font-face` em `app/app.css` com `font-display: swap`; `<link rel="preload" as="font" type="font/woff2" crossorigin>` só da Anton (títulos) no `root.tsx`; tirar os `preconnect` e o CSS do Google Fonts. Licença: as três são OFL (pode hospedar).
Verificar: aba Rede sem `fonts.googleapis.com`; visual idêntico em 375 e 1440 (comparar capturas); PageSpeed antes/depois anotado no `docs/crescimento.md` (seção "Como medir").

**D3 (P) `og:image` completo nas matérias.** `seo()` aceita `imageWidth`, `imageHeight`, `imageAlt`; `post.tsx` passa o alt da capa. Largura/altura: ler com `sharp` só na publicação e gravar (ver D4) ou, sem colunas, omitir largura/altura e só pôr `og:image:alt`. Também `article:section` e `article:tag` (uma tag por item).
Verificar: HTML de uma matéria com `og:image:alt` e `article:section`.

**D4 (M) Capa em 3 proporções.** Na publicação (onde as imagens viram WebP), gerar além da capa dois recortes centrados: `-4x3.webp` (1200×900) e `-1x1.webp` (1200×1200) quando a capa tiver ≥ 1200 px; o JSON-LD `image` passa a ser a lista `[16:9, 4:3, 1:1]`. Script único `scripts/capas-recortes.mjs` para as capas já publicadas (lê `MEDIA_DIR`; roda no servidor pelo SSH ou na próxima inicialização, decidir no passo). Capas < 1200 px: sem recortes.
Verificar: JSON-LD de uma matéria nova com 3 URLs que abrem; Teste de resultados avançados sem aviso de imagem.

**D5 (P) Robô prefere capa grande e única.** Em `chooseMedia`: se a capa escolhida tem < 1200 px e existe nas Steam/IGDB uma imagem ≥ 1200 px do mesmo jogo (o `enrich` já busca), usar a maior; recusar capa cujo arquivo (hash) já foi capa de outro post nos últimos 30 dias. No `/admin/posts`, selo "CAPA < 1200" na lista.
Verificar: `dry=1` numa pauta com imagem pequena mostra a troca; lista do painel com o selo.

**D6 (M) Autor e página da redação.** Nova página `/redacao` (`app/routes/team.tsx`, entra em `DOC_PAGES`, rodapé e sitemap): quem faz o site, como o robô trabalha e o que é revisado por pessoa, contato, e um perfil para cada autor humano (nome ou pseudônimo, 2–3 frases, jogos que acompanha, link opcional para rede social). JSON-LD `AboutPage` + `Organization` com `sameAs` (quando houver redes). Nas matérias: `author` vira `Person` com `url: /redacao#<slug>` quando `posts.author` for um autor humano cadastrado em `site.ts` (`AUTHORS`), e `Organization` com `url: /redacao` nas do robô. O nome do autor no cabeçalho da matéria vira link para `/redacao`. Visual: mesma página dos textos institucionais (`about.tsx`), cada perfil num `ch bg-ink-2 p-5` com nome em `font-display text-3xl uppercase` e função em `font-mono text-xs text-acc`. "Nova matéria" no painel ganha um seletor de autor.
Verificar: matéria manual com autor humano → JSON-LD `Person` com `url`; `/redacao` sem rolagem lateral em 375 px.

**D7 (P) RSS para o "Seguir" do Chrome.** `rss.ts`: 50 itens, `xmlns:media`, `<media:content url="…" medium="image" width="…"/>` da capa e `<dc:creator>` com o autor; `<description>` = `metaDescription ?? excerpt`.
Verificar: `/rss.xml` válido no validator.w3.org/feed.

**D8 (P) Checagem anti-isca nos títulos.** Em `quality.ts`, reprovar título com: "você não vai acreditar", "chocante", "inacreditável", "ninguém esperava", "isso muda tudo", "confira", ponto de exclamação, mais de uma palavra toda em maiúsculas (fora siglas da lista: PC, PS5, RPG, GTA etc.).
Verificar: teste unitário/rápido da função com 3 títulos ruins e 3 bons.

**D9 (P) Política editorial.** `editorial.tsx`: seção curta "Quem revisa" (o que o dono revisa, como pedir correção, prazo) e link para `/redacao`; atualizar a data em `DOC_PAGES`.
Verificar: página com a seção e data nova.

**D10 (dono, opcional) Google Publisher Center** (grátis): cadastrar o site com logo e RSS. Não é obrigatório para o Discover; ajuda a aparecer no Google Notícias.

---

## Ordem de execução sugerida (com tamanhos)

1. A1 P → A2 M → A3 M → A4 P → A5 M → A6 P → A7 P → A8 P → A9 P → A10 P (Arcade inteiro: ~1 dia)
2. D1 P → D3 P → D8 P (Discover rápidos; não dependem de nada)
3. B1 P → B2 M → B3 M → B4 P → B5 G → B6 P → B7 P (fichas)
4. C1 P → C2 M → C3 M → C4 M → C5 P → C6 P (evergreen; C3 depende de B3)
5. D2 M → D4 M → D5 P → D6 M → D7 P → D9 P (Discover restante; D6 depende da pergunta do autor)

Antes do pedido do AdSense (24/11 a 1/12), o ideal é ter pronto: frente 1 inteira, D1/D3/D8 e C1.

## Riscos e cuidados

- **React Router:** loaders usam `routePath`; ao navegar por clique a página pede `<rota>.data`. Testar cada página nova clicando a partir de outra, não só abrindo direto. `npm run build` antes de todo push.
- **Bundle do cliente:** textos do Arcade só em `*.server.ts` (A2). `arcade.ts` continua leve.
- **AdSense no Arcade:** a rota da imagem (A5) fica em `/og/arcade/`, fora do `/arcade/`; a regra `gamePage` não muda.
- **CLS no Arcade:** nada novo acima do canvas além da linha mono do H1 (altura fixa, sem fonte que mude depois do carregamento).
- **Fichas:** teto semanal e `index_from` que não volta; nunca apagar ficha indexada (404 em página indexada é sinal ruim).
- **Dados de terceiros:** requisitos e idiomas sempre com "Fonte: Steam"/"IGDB" e data da consulta; nada inventado. Crédito visível ao IGDB continua (exigência para a parceria).
- **Steam:** 1 requisição por segundo e cache de 7 dias; a API pública pode responder 429: parar a rodada e tentar na próxima.
- **Gemini:** nenhuma frente aumenta pedidos por página; se a cota apertar, o 1º corte é o número de notícias.
- **Migration 010:** colar o SQL no chat; conferir no deploy que o `server.js` aplicou (log de inicialização).
- **Fontes locais (D2):** conferir acentos (subconjunto latino estendido) e que o visual não mudou.

## Como medir

Ritual semanal (segunda, ~10 min), anotar aqui embaixo numa tabela "Semana · indexadas · impressões/dia · cliques/dia · Discover":

- **Search Console → Desempenho → Resultados da pesquisa:** filtro "Página contém `/arcade/`" (consultas "online"); "Página contém `/jogos/`" (consultas "requisitos", "lançamento", "plataformas"); "Página contém `/guias/`". Olhar impressões, posição média e CTR por consulta.
- **Search Console → Páginas:** indexadas x "rastreada, mas não indexada" por tipo de URL (guias e fichas são o termômetro de conteúdo fino). Exportar as listas por volta de 27/11 (pendência já anotada).
- **Search Console → Desempenho → Discover:** o relatório só aparece depois de um mínimo de impressões no Discover; até lá, não existe. Quando aparecer, ver quais matérias e quais capas entram.
- **Search Console → Melhorias / Dados estruturados:** `Breadcrumb` e `VideoGame`/`SoftwareApplication` sem erro.
- **PageSpeed Insights** (grátis) em 3 URLs (home, uma matéria, `/arcade/sudoku`), celular: anotar LCP, CLS, INP antes de D1/D2 e depois.
- **`/admin/visitas`:** origem "Busca" (deve subir semana a semana), páginas mais vistas filtradas por `/arcade/` e `/jogos/`, aparelho (celular x PC). Visita do Discover costuma chegar como `google.com` ou sem referência: não dá para separar aqui; usar o Search Console para isso. Para divulgação, usar UTM (`?utm_source=reddit&utm_campaign=arcade`), que o painel já lê.

## Depois (divulgação gratuita, quando as frentes 1 e 2 estiverem no ar)

- **Reddit:** participar antes de postar; 1 post por jogo do Arcade em **r/WebGames** (regras: jogo jogável no navegador, sem cadastro; título descritivo, link direto para `/arcade/<jogo>`, com UTM). Em subs brasileiros (r/gamesEcultura, r/brasil quando couber) só conteúdo que se sustenta sozinho (guia, lista), nunca notícia reescrita. Nunca mais que 1 post por semana no total.
- **Instagram / YouTube Shorts / TikTok:** vídeos de 15–30 s de partidas do Arcade (gravação da tela) e "data de lançamento da semana" com a arte do IGDB citando a fonte. Vídeos gerados automaticamente estão engavetados (decisão de 2026-11-01): só se o dono quiser gravar à mão.
- **Canal no WhatsApp e/ou Telegram:** 1 a 2 mensagens por dia (grátis da Epic, lançamento da semana, jogo do Arcade do dia). Link no rodapé e no fim das matérias de promoções.
- **Newsletter grátis semanal:** o "resumo da semana" de domingo já é o conteúdo; ferramenta de plano gratuito (decisão do dono) e formulário simples no rodapé (atualizar Privacidade se coletar e-mail).
- **E-mail ao IGDB** (partner@igdb.com) quando o AdSense for aprovado: já anotado em `adsense.md`.

## Decisões do dono (2026-11-20)

1. **Autor:** pseudônimo por tipo de matéria/artigo, como no animeprofile (um autor fixo por editoria, com perfil em `/redacao`). Vale para o D6: em vez de "nome real", a lista `AUTHORS` de `site.ts` tem um pseudônimo por editoria (Notícias, Guias, Artigos, Reviews, Promoções) e o `post.author` do robô passa a ser o da editoria. **Cuidado combinado:** `/redacao` e a política editorial dizem com clareza que os textos são feitos com IA e revisados por pessoa, e que os nomes são pseudônimos da redação; sem credenciais ou histórias inventadas nos perfis (o Google trata autor falso como problema de confiança).
2. **Notícias:** reduzir de 7–8 para **6 por dia**. É configuração do painel (`/admin/config`, "posts por dia"), não código: o dono ajusta.
3. **Fichas:** podem entrar **já** (frente 2 segue com o teto de 5 por semana e os 3 de 5 blocos de dados).
4. **Peça semanal:** a IA escreve e o dono **só revisa**, como no animeprofile-old: nasce como **rascunho** (nunca publica sozinha) e o dono revisa/edita e publica pelo painel. Vira o passo **C7** abaixo; o "dono escreve" da tabela da frente 3 passa a ser "IA escreve, dono revisa".
5. **Marcas no texto do Arcade:** sim, só como história (já feito).
6. **Divulgação:** sem canal de WhatsApp/Telegram nem newsletter por enquanto (frente "Depois" fica só com Reddit, Instagram/Shorts à mão e o e-mail ao IGDB).
7. **`MIN_CRITICS` = 3** (era 4), feito em 2026-11-20. O ritmo de reviews passa a depender de quantos jogos juntam 3 análises em 30 dias.

**C7 (M) Peça semanal em rascunho para revisão.** Em `compilations.server.ts`/`robot.server.ts`: um tipo `"pauta-semana"` (1 por semana, sexta, junto das ofertas ou em dia livre) que escreve pelo Gemini uma lista comentada, "vale a pena?" ou guia de iniciante a partir de dados reais do banco (jogos com nota da crítica, lançamentos, grátis do mês), grava com `status = 'draft'`, `origin = 'auto'` e o autor pseudônimo da editoria. Não entra no limite diário de publicadas. Aparece no painel em "rascunhos esperando revisão". Verificar: `dry=1` gera o texto; sem `dry`, o post fica em rascunho e `/admin/materias?status=draft` o lista.

## Status dos passos

| Passo | Situação |
|---|---|
| A1–A9 (Arcade) | ✅ 2026-11-20 (A10: o dono revisa os 13 textos) |
| D1 capa com prioridade, D3 `og:image:alt`/`article:section`/`article:tag`, D8 título anti-isca | ✅ 2026-11-20 |
| C1 teto de guias (4 por semana, `settings.guides_per_week`) e h2 "Roda no seu PC?" | ✅ 2026-11-20 |
| B1 a B6 (fichas: migration 010, dados extras do IGDB, Steam, critério `index_from`, página nova, sitemap) | ✅ 2026-11-22 (testado local; falta ver com dados reais depois do deploy) |
| B7 docs das fichas | ⏳ |
| C2 lançamentos da semana, C3 lista de dados, C4 atualização sem Gemini, C5 prioridade, C6 docs, C7 peça semanal em rascunho | ✅ 2026-11-22 (testados local com MySQL; o texto do Gemini só dá para ver depois do deploy) |
| D2, D4–D7, D9 (resto do Discover) | ⏳ |
