# Instagram automático (módulo `app/social`, copiável entre os sites)

Status: 📝 plano (2026-11-22). Nada implementado. Executor: seguir os passos IG1 a IG16 na ordem.

> **Status (2026-11-22):** módulo `app/social/` implementado e testado local (MySQL real + API do Instagram simulada): arte de todos os modelos (N, carrossel de artigo/review/guia, P1, P2, S), legendas com até 3 hashtags, fila com prioridade, modo de teste, painel `/admin/instagram`, prévia, `/links`, cron `/api/cron/social` e migration 012. **Falta o IG0 (dono): conta profissional, app da Meta, token e `SOCIAL_KEY`**; depois, IG13 (modo de teste em produção) e IG14 (primeiro post real). O @ da conta é **@respawnou.com.br** (decisão do dono). Por padrão tudo nasce **desligado e em modo de teste**.

## Objetivo

Quando uma matéria for publicada no site, gerar no próprio servidor uma arte no visual do Respawnou (ou um carrossel,
conforme o tipo) e uma legenda curta, e publicar na conta do Instagram do site pela API oficial, grátis e sem navegador.
Tudo num **módulo copiável** (`app/social/`, como o `app/visitas/`), com um `config.ts` por site, para o animeprofile,
o vibecoin, o criasite e os próximos usarem o mesmo código.

## Contexto

### O que existe hoje no Respawnou
- O robô (`app/lib/robot/robot.server.ts`) publica de 6 a 8 matérias por dia. Toda matéria do robô passa por
  `insertPost()` (linha ~764): notícias, grátis da Epic, consenso da crítica, compilações e guias de requisitos. A
  "peça da semana" nasce como rascunho (`draft: true`) e quem publica é o dono, em `/admin/materias/:id`
  (`intent === "publicar"` em `app/routes/admin/post-edit.tsx`, que chama `setPostStatus`).
- As imagens ficam em `MEDIA_DIR` (`server-paths.mjs`, padrão `~/respawnou-media`), servidas em `/media` pelo Express
  com cache de 1 ano (`server-app.js`, linha 50). Endereço público: `https://respawnou.com.br/media/...`.
- O `sharp` já está instalado. `app/routes/og-arcade.ts` monta um SVG à mão e usa **Impact e Courier New** em vez de
  Anton e JetBrains Mono: o librsvg do servidor (usado pelo sharp) não enxerga as fontes do site (são WOFF2 em
  `public/fonts/`, só para o navegador) e **ignora `@font-face`**, inclusive com data URI. Por isso texto em SVG puro
  não sai com a fonte do site.
- O animeprofile novo já decidiu (`animeprofile/docs/arquitetura.md`, "Imagens das redes") gerar as imagens com
  **`satori` + `sharp`** no servidor, com as fontes embutidas no projeto. Este plano segue essa decisão: o `satori`
  transforma cada letra em caminho (`<path>`) dentro do SVG, então o librsvg não precisa de fonte nenhuma.
- O módulo `app/visitas/` é o modelo de módulo copiável: `config.ts`, `db.ts`, `site.server.ts` e o CSS mudam por
  site; `core/`, `server/` e `ui/` são genéricos.
- Dados prontos para os layouts, sem Gemini: `posts.review` (nota, veículos, prós, contras e veredito),
  `games.pc_min`/`pc_rec` (requisitos), `free_games` (`post_id`, loja, `worth`, `ends_at`, arte em `/media`),
  `games` (`release_date`, `image_url` 16:9, `cover_url` 3:4, `hypes`) e o corpo em blocos (`h2`, `p`, `ul`, `img`).

### O que o site antigo (animeprofile-old) fazia
Arquivos: `src/lib/social/` (`cards.ts`, `caption.ts`, `autopost.ts`, `instagram.server.ts`),
`src/routes/api/public/hooks/social-autopost.ts`, `scripts/social-worker.ts`, `.github/workflows/social-post.yml`,
migration `20261012170000_social_instagram_publishing.sql`, `docs/redes-sociais.md`.

- **Gatilho:** não era na hora de publicar. Um `pg_cron` chamava `/api/public/hooks/social-autopost` a cada 15 min; o
  hook renovava o token, destravava envios presos há mais de 30 min e escolhia a notícia mais nova ainda não enviada
  (só notícias, com capa, publicada há no máximo N horas, respeitando o máximo por dia e o intervalo mínimo). Registrava
  o envio e disparava um workflow do GitHub Actions.
- **Imagem:** desenhada em `<canvas>` no navegador. Na automação, o GitHub Actions abria `/social-render/<slug>` num
  Chrome sem tela, tirava os JPEGs e mandava em base64 para `/api/public/social/instagram-publish`, que subia no Storage
  do Supabase. Carrossel 1080×1350 (capa com imagem, categoria, título e resumo inteiro; slides "Na matéria" com as
  imagens do corpo; slide "link na bio") e uma vertical 1080×1920 para story. Fonte Exo 2, logo redonda.
- **Legenda:** título + resumo inteiro (até 1.200 caracteres) + "Matéria completa no link da bio" + "Conta nos
  comentários" + até 8 hashtags tiradas das tags.
- **API:** Instagram API com login do Instagram (`graph.instagram.com/v23.0`): um contêiner por imagem, contêiner do
  carrossel, espera `status_code = FINISHED`, `media_publish`, busca o `permalink`. Story opcional.
- **Token:** colado no painel, guardado em `social_accounts` (tabela sem acesso público), renovado a cada 7 dias com
  `refresh_access_token`. App da Meta em modo de desenvolvimento, conta como testadora, sem análise da Meta.
- **Sem duplicar:** índice único `(post_id, network)` nos estados vivos; falha podia ser repetida pelo botão.
- **Falhas e problemas registrados:** dependia de navegador, então de GitHub Actions (consumo de minutos, robôs parados
  por `bun.lock` desatualizado, fonte de emoji faltando no runner); capas de outros sites bloqueavam o canvas (CORS) e
  exigiram uma rota repassadora; a agenda saiu sem capa porque a imagem remota falhou na hora; artigos e Reels foram
  testados e retirados ("não ficaram bons"); a API não põe música nem adesivo de link em story; risco de direito
  autoral nas capas de terceiros.

### O que NÃO repetir
1. Navegador e GitHub Actions para desenhar: aqui a arte sai no próprio servidor (`satori` + `sharp`), dentro do cron
   que já existe.
2. Imagem enviada do navegador em base64: o servidor gera, grava em `MEDIA_DIR` e passa a URL pública.
3. Buscar imagem remota na hora de postar: usar só imagens já copiadas para `/media` (capas das matérias e artes de
   ofertas já são locais); as capas do IGDB da semana são baixadas e redimensionadas na hora de gerar, com plano B.
4. Legenda longa e 8 hashtags: legenda curta e no máximo 3 hashtags.
5. O mesmo layout para tudo: cada tipo tem o seu.
6. Story automático: fica de fora (a API não põe link nem música). Pode voltar depois, à mão.
7. Slides "Na matéria" com imagens de terceiros sem contexto: no carrossel, imagem só como apoio de um ponto do texto.

## Arquivos afetados

### Módulo novo `app/social/` (G = genérico, copia igual; E = específico do site)

| Arquivo | Tipo | Conteúdo |
|---|---|---|
| `app/social/config.ts` | E | Nome, @, URLs, logo, fontes, cores, rótulos, CTAs, hashtags-base, perguntas, janela e limites padrão, tipos ligados |
| `app/social/db.ts` | E | Ponte com o banco (igual a `app/visitas/db.ts`: `query`, `exec`, `hasDatabase`) |
| `app/social/site.server.ts` | E | Lê a matéria do banco do site e devolve a `EntradaSocial`; escolhe o modelo; dados extras (review, requisitos, grátis, semana); plano B do Gemini |
| `app/social/fonts/*.ttf` + `OFL.txt` | E | Fontes TTF estáticas (o satori não lê WOFF2 nem fonte variável) |
| `app/social/tipos.ts` | G | Tipos: `EntradaSocial`, `Modelo`, `DicaSocial`, `Ponto`, `LinhaSemana`, `Oferta` |
| `app/social/core/texto.ts` | G | `limparLinks`, `frases`, `frasesInteiras`, `cortar`, `paraHashtag`, `maiusculasBR` (funções puras) |
| `app/social/core/legenda.ts` | G | `montarLegenda(entrada, modelo, cfg)` e `hashtags(...)` |
| `app/social/core/pontos.ts` | G | `extrairPontos(blocos)`, `lerRequisitos(texto)`, `ordenarNotas(review)` |
| `app/social/core/agenda.ts` | G | Decisão pura do envio: janela, limite do dia, intervalo, prioridade, validade |
| `app/social/render/fontes.server.ts` | G | Lê os TTF uma vez (cache em memória) |
| `app/social/render/imagem.server.ts` | G | Imagem local/remota → `sharp` (recorte, tamanho exato, desfoque) → data URI; logo |
| `app/social/render/render.server.ts` | G | JSX → `satori` → SVG → `sharp` → JPEG; grava em `MEDIA_DIR/social/` |
| `app/social/render/ui.tsx` | G | Peças comuns: `Topo`, `Rodape`, `Faixa`, `Chip`, `Chanfro`, `Grade`, `Contador` |
| `app/social/render/modelos/noticia.tsx` | G | Modelo N (notícia, 1 imagem) |
| `app/social/render/modelos/carrossel.tsx` | G | Modelo C: capa, ponto, notas, prós/contras, veredito, requisitos, CTA |
| `app/social/render/modelos/promo.tsx` | G | Modelos P1 (grátis) e P2 (ofertas da semana) |
| `app/social/render/modelos/semana.tsx` | G | Modelo S (lançamentos da semana, 1 imagem) |
| `app/social/server/cripto.server.ts` | G | AES-256-GCM com a chave `SOCIAL_KEY` |
| `app/social/server/instagram.server.ts` | G | Cliente da API (`graph.instagram.com`): perfil, cota, contêiner, carrossel, publicar, permalink, renovar token |
| `app/social/server/conta.server.ts` | G | Ler/gravar conta e configurações; renovação do token |
| `app/social/server/fila.server.ts` | G | `enfileirar`, `tick`, `postarAgora`, `pular`, `gerarDeNovo`, `limparArquivos` |
| `app/social/ui/Painel.tsx` | G | Tela do painel (conta, automação, fila, prévias) |
| `app/social/ui/social.css` | E | Cores do painel (como `ui/visitas.css`) |
| `app/social/sql/social.sql` | G | SQL das tabelas (base da migration de cada site) |

### Arquivos do Respawnou que mudam

| Arquivo | O quê |
|---|---|
| `package.json` | dependência `satori` |
| `db/migrations/012_instagram.sql` | tabelas `social_accounts` e `social_posts` (número: o próximo livre na hora; hoje 012) |
| `app/lib/robot/robot.server.ts` | `insertPost` enfileira (só publicada); `collect()` e o fim de `publish()` chamam o `tick` |
| `app/lib/robot/compilations.server.ts` | campo opcional `social` em `Compilation` (dados da semana e das ofertas) |
| `app/routes/admin/post-edit.tsx` | ao publicar um rascunho pela 1ª vez, enfileira; cartão "Instagram" com botões |
| `app/routes/admin/instagram.tsx` | página `/admin/instagram` (usa `requireAdmin` e o `Painel` do módulo) |
| `app/routes/admin/instagram-previa.ts` | `GET /admin/instagram/previa/:id?s=1&modelo=...` devolve o JPEG (só admin) |
| `app/routes/links.tsx` | página "link na bio" (`/links`, `noindex`) |
| `app/routes.ts` | rotas novas acima |
| `app/routes/cron.ts` | job `social` (`/api/cron/social?token=...`, roda o `tick` na hora) |
| `app/components/admin-ui.tsx` | item "Instagram" no menu do painel, depois de "Visitas" |
| `docs/README.md`, `docs/decisoes.md`, `docs/banco-de-dados.md`, `docs/arquitetura.md`, `docs/admin.md` | atualizados pelo executor no fim (não por este plano) |

## Direção visual

**Clima:** a "Central de Comando" do site levada para o feed: preto tático, verde-limão como luz de painel, títulos
enormes em Anton maiúsculo, detalhes em JetBrains Mono como texto de terminal (`> SIGA @RESPAWNOU`, `02/06`), cantos
chanfrados como o ícone do logo e a grade fina do `og-default.png`. Referência: o próprio `public/og-default.png`.
**Evitar:** gradientes coloridos genéricos, sombra suave de app, emoji na arte, texto pequeno (no celular a arte aparece
com ~36% do tamanho: nada abaixo de 22 px no canvas, corpo de texto a partir de 32 px), logo grande demais competindo com
o título e qualquer coisa que pareça "template de Canva".

**Hierarquia em toda arte:** 1º a imagem do jogo e o título (ou "GRÁTIS", ou a nota); 2º a linha fina/dado principal;
3º a marca (logo pequeno no topo, faixa verde embaixo) e o convite para seguir e acessar.

### Tokens (iguais a `app/app.css`; o site só tem tema escuro)

| Token | Hex | Uso |
|---|---|---|
| `fundo` | `#060807` | fundo de tudo |
| `painel` | `#0c110c` | cartões, cupom |
| `painel2` | `#111611` | trilho das barras, blocos de dia |
| `linha` | `#1c241a` | grade (opacidade 60%) e trilhos |
| `linhaSuave` | `#243022` | divisórias 2 px, bordas de cartão |
| `texto` | `#eef3ea` | títulos |
| `corpo` | `#b4bfb0` | linha fina e textos de apoio |
| `apagado` | `#8a9787` | créditos, legendas pequenas, preço riscado |
| `destaque` | `#c8ff2e` | palavra-chave no título, chips, faixa inferior, números |
| `destaqueSuave` | `#dcff7a` | brilho e segundo tom |
| `destaqueFundo` | `#3d5200` | sombra dura do "GRÁTIS", contorno do número vazado |
| `alerta` | `#ffb020` | prazo de promoção, selo "RUMOR", contras ("−") |
| `sobreDestaque` | `#060807` | texto em cima do verde |

**Fontes** (TTF estáticas em `app/social/fonts/`, licença OFL, baixadas do Google Fonts / repositórios oficiais):
`Anton-Regular.ttf` (títulos, sempre maiúsculo), `Inter-Regular.ttf` (400), `Inter-SemiBold.ttf` (600),
`Inter-ExtraBold.ttf` (800), `JetBrainsMono-Bold.ttf` (700). Fonte variável não serve no satori: usar os arquivos
estáticos de cada peso. Conferir que os TTF têm acentos do português (os completos têm; não usar subconjunto).

**Medidas:** canvas **1080×1350** (retrato 4:5) em todos os modelos (ocupa mais tela no feed que o quadrado; o carrossel
inteiro tem de ter a mesma proporção). Margem lateral 64 px (a grade do perfil corta para 3:4, ou ~34 px de cada lado:
nada importante fora de x 64–1016). Espaçamento em múltiplos de 8. Chanfro: canto cortado de 28 px (cartões) ou 40 px
(imagem principal), sempre no canto superior esquerdo e inferior direito, como o ícone. Sem raio arredondado. Sem
sombra suave; a única "sombra" é dura (deslocamento de 8 px, sem desfoque) em `destaqueFundo`.

**Peças comuns (`render/ui.tsx`):**
- `Topo` (y 48–112): logo 64×64 (de `public/logo-512.png`) + "RESPAWNOU" em Anton 40 `texto` com o ponto final em
  `destaque` (igual ao `og-default`); à direita, texto mono 22 `destaque` (rótulo ou contador `02/06`).
- `Grade`: linhas de 1 px `#1c241a` a cada 54 px sobre o fundo, opacidade 60%. Gerada uma vez como PNG 1080×1350 pelo
  `sharp` a partir de um SVG só de linhas (sem texto) e reaproveitada como data URI.
- `Faixa`: barra de 8 px em `destaque` no pé (y 1342–1350), como no `og-arcade`.
- `Chip`: fundo `destaque`, texto mono 700 24 `sobreDestaque`, altura 48, padding 0 20, cantos chanfrados de 12 px.
  Variante contorno: borda 2 px `texto`, texto `texto`. Variante alerta: fundo `alerta`.
- `Rodape` (y 1176–1342): divisória 2 px `linhaSuave` em y 1176; à esquerda, "> SIGA @RESPAWNOU" mono 700 28 `destaque`
  e embaixo a frase do CTA em Inter 600 26 `corpo`; à direita, chip grande "RESPAWNOU.COM.BR →" (altura 64, mono 700 28).
- `Contador`: "02/06" mono 700 22; nos slides de ponto, o número grande vazado (Anton 260, `WebkitTextStroke` 3 px
  `destaque`, preenchimento transparente).

## Modelos (mockups com medidas)

Coordenadas em px no canvas 1080×1350. "Anton 84" = Anton, 84 px. Título sempre em maiúsculas (`maiusculasBR`).

### Modelo N — Notícia (1 imagem)

```
y    0 ┌──────────────────────────────────────────────────────────┐ x 1080
       │ gradiente do topo: #060807 85% (y 0) → 0% (y 220)        │
   48  │ [logo64] RESPAWNOU.                       NOTÍCIAS //    │ Topo
       │                                                          │
       │          CAPA DA MATÉRIA, recorte 1080×760 (3:2→)        │ object-fit cover, foco no centro
       │                                                          │
  700  │                               IMAGEM: REPRODUÇÃO/IGN     │ mono 18 #eef3ea 60%, alinhado à direita
       │ gradiente da base: 0% (y 460) → #060807 100% (y 760)     │
  700  │ ◤NOTÍCIA · PS5 · XBOX◢   [RUMOR] [▶ TRAILER NA MATÉRIA]   │ Chips (y 700–748); selos só quando valem
  772  │ TÍTULO EM ANTON, 64–96 PX, ATÉ 3 LINHAS,                 │ #eef3ea; palavra-chave em #c8ff2e
       │ ENTRELINHA 1,02                                          │
       │ Linha fina em Inter 400 34/46, #b4bfb0, até 3 linhas,    │ até 165 caracteres, frase inteira
       │ terminando em frase completa.                            │
 1176  ├──────────────────────────────────────────────────────────┤ divisória
       │ > SIGA @RESPAWNOU               ┌──────────────────────┐ │
       │ Mais notícias de games todo dia │ RESPAWNOU.COM.BR  →  │ │ Rodape
       │                                 └──────────────────────┘ │
 1342  │██████████████████████ faixa #c8ff2e █████████████████████│
 1350  └──────────────────────────────────────────────────────────┘
```
- Tamanho do título: escolher o maior de [96, 84, 72, 64] em que `ceil(caracteres / (952 / (tam × 0,46))) ≤ 3`
  (Anton maiúsculo ≈ 0,46 em por letra). Títulos do robô têm 30–70 caracteres, então cabe. Acima de 100 caracteres,
  cortar na palavra com "…". Usar `lineClamp: 3` como trava.
- Destaque da palavra-chave: se `focus_keyword` aparece no título (sem diferenciar acento/caixa), essas palavras saem
  em `destaque`; senão, nada colorido.
- Selos: "RUMOR" (chip alerta) se título ou tags têm "rumor"/"vazamento"; "▶ TRAILER NA MATÉRIA" (chip contorno) se o
  corpo tem bloco `video`. O "▶" é caractere da JetBrains Mono (conferir; se faltar, usar triângulo em SVG).
- Plataformas no chip: `short` de `PLATFORMS` (`site.ts`), no máximo 3; com 4 ou mais, "MULTIPLATAFORMA".
- Sem capa local utilizável: não gera (status `skipped`, "sem capa").

### Modelo C — Carrossel (artigos, reviews, guias), 5 a 7 slides

Todos os slides: fundo `fundo` + `Grade`, `Topo` com o contador `NN/TT` à direita, `Faixa` no pé.

**C1 Capa**
```
y   48  │ [logo64] RESPAWNOU.                          01/06 ▸   │
   150  │ ◤┌────────────────────────────────────────────────┐    │ capa 952×536 (16:9, sem corte), chanfro 40,
        │  │                CAPA DA MATÉRIA                 │░   │ retângulo #c8ff2e deslocado +14/+14 atrás
        │  │                                                │░   │ (efeito "cartucho")
   686  │  └────────────────────────────────────────────────┘◢░  │
   740  │ ◤GUIA // REQUISITOS◢                                    │ Chip
   804  │ TÍTULO ANTON 64–88, ATÉ 3 LINHAS                       │
        │ Linha fina Inter 34/46, até 2 linhas                    │
  1200  │ [■ 4 PONTOS NESTE POST]          ARRASTA PRO LADO  →    │ mono 700 26: chip contorno + texto destaque
  1342  │██████████████████████ faixa ████████████████████████████│
```
- Review: no canto inferior direito da capa, sobrepondo a imagem (x 760–1000, y 520–760), selo 240×240 chanfrado com
  fundo na cor da nota (faixas de cor iguais às do `ScoreBadge` em `app/components/cards.tsx`), nota em Anton 140
  `sobreDestaque` com vírgula ("8,4") e "MÉDIA DE 7 VEÍCULOS" em mono 700 20. O chip de pontos vira
  "■ O QUE A CRÍTICA ACHOU".

**C2…Cn Ponto (artigos e listas)**
```
y   48  │ [logo48] RESPAWNOU.                 ARTIGO · 02/06     │
   150  │ 01                                                     │ Anton 260 vazado (contorno 3 px #c8ff2e)
   430  │ TÍTULO DO PONTO EM ANTON 72, ATÉ 3 LINHAS              │ texto = h2 da matéria
        │ Texto de apoio em Inter 400 36/50, #b4bfb0, até 5      │ 1ª ou 2 primeiras frases do parágrafo
        │ linhas (≤ 220 caracteres), frase inteira.              │ seguinte ao h2
   820  │ ◤┌───────────────────────────────────────────────┐     │ imagem do trecho (bloco img depois do h2)
        │  │          952×400, chanfro 28                  │     │ recorte cover; crédito mono 18 por cima,
  1220  │  └───────────────────────────────────────────────┘◢    │ canto inferior direito
  1270  │ RESPAWNOU.COM.BR                     ARRASTA  →         │ mono 700 22 apagado / destaque
```
- Sem imagem no trecho: o texto de apoio desce para começar em y 700 com Inter 40/56 e até 7 linhas; o número grande
  continua. Nunca repetir a capa nos slides de ponto.

**Review — C2 Notas** ("O QUE CADA VEÍCULO DEU", Anton 72): até 6 linhas, maior nota primeiro. Cada linha (altura 120):
nome do veículo Inter 600 34 `texto` à esquerda; barra de 520×20 (trilho `painel2`, preenchimento na cor da nota,
proporcional a nota/10) começando em x 440; nota mono 700 40 à direita ("8,0"). Mais de 6: última linha
"+ 3 VEÍCULOS NA MATÉRIA" mono 26 `apagado`.
**Review — C3 Elogios e C4 Críticas**: título Anton 72 ("O QUE ELOGIARAM" / "O QUE CRITICARAM"); até 4 itens; cada
item com um quadrado 56×56 chanfrado (`destaque` com "+" / `alerta` com "−", Anton 48 `sobreDestaque`) e o texto em
Inter 600 36/48 `texto`, até 3 linhas por item (cortar em frase inteira, ≤ 120 caracteres).
**Review — C5 Veredito**: aspas gigantes Anton 300 `destaque` em y 140; veredito em Inter 800 52/66 `texto`, até 6
linhas; embaixo, "NOTA MÉDIA 8,4 · 7 VEÍCULOS" chip.
**Guia — C2 Mínimo e C3 Recomendado**: título Anton 96 ("MÍNIMO" / "RECOMENDADO", este com chip "PRA JOGAR BEM");
tabela de até 5 linhas (SO, PROCESSADOR, MEMÓRIA, PLACA DE VÍDEO, ARMAZENAMENTO): rótulo mono 700 24 `apagado` em cima,
valor Inter 600 38/48 `texto` embaixo (até 2 linhas, ≤ 70 caracteres), separadas por linha 2 px `linhaSuave`; altura
total ≤ 900 px. **Guia — C4 Lado a lado** ("MÍNIMO X RECOMENDADO", Anton 72): duas colunas (468 px cada, 16 de
espaço) só com PLACA DE VÍDEO e MEMÓRIA, coluna da direita com borda 2 px `destaque`; embaixo, se houver,
"LANÇAMENTO 28/11 · R$ 199,90 NA STEAM" mono 700 26.

**Cn CTA final (todos os carrosséis)**
```
        │ fundo + Grade + brilho radial #c8ff2e 18% → 0 (raio 520, centro 540/560)
   220  │                    [logo 200×200]                       │
   500  │                      CURTIU?                            │ Anton 120 #eef3ea, centralizado
   630  │                  SIGA @RESPAWNOU                        │ Anton 120 #c8ff2e
   800  │      Notícias, reviews, guias e lançamentos todo dia.   │ Inter 400 36 #b4bfb0
   920  │        ┌─────────────────────────────────────┐          │
        │        │  MATÉRIA COMPLETA: LINK NA BIO  →   │          │ chip 760×88, mono 700 32
        │        └─────────────────────────────────────┘          │
  1120  │   SALVE PRA CONSULTAR DEPOIS · RESPAWNOU.COM.BR          │ mono 700 24 apagado
```

### Modelo P1 — Promoção: jogo grátis (1 imagem)

```
y    0 │ fundo: arte do jogo desfocada (sharp blur 30) + #060807 75% por cima + Grade │
   48  │ [logo64] RESPAWNOU.                         ◤PROMOÇÃO◢    │
  120  │ GRÁTIS                                                    │ Anton 250 #c8ff2e, girado −4°, sombra
       │                                                           │ dura #3d5200 (+8/+8); x 56
  400  │ ◤┌────────────────────────────────────────────────────┐   │ "cupom": 952×700, fundo #0c110c,
       │  │ arte do jogo 952×476 (recorte cover)               │   │ borda 2 px #243022, chanfro 28
  876  │ (●- - - - - - - - - perfuração tracejada - - - - - - -●)  │ furos: círculos r 22 na cor do fundo nas
       │  │ NOME DO JOGO EM ANTON 64, ATÉ 2 LINHAS             │   │ bordas, linha tracejada 2 px #243022
       │  │ DE R$ 89,99 (mono 30 #8a9787 riscado)  →  R$ 0      │   │ "R$ 0" Anton 64 #c8ff2e
       │  │ [EPIC GAMES STORE]      [ATÉ QUI, 27/11 · 13H]      │   │ chip contorno + chip alerta
 1100  │  └────────────────────────────────────────────────────┘◢  │
 1176  ├───────────────────────────────────────────────────────────┤
       │ > SIGA @RESPAWNOU          ┌─────────────────────────┐   │ CTA: "Avisamos todo jogo grátis"
       │ Avisamos todo jogo grátis  │ COMO RESGATAR: LINK NA BIO│  │
 1342  │███████████████████████ faixa ███████████████████████████│
```
- Dados de `free_games WHERE post_id = ?`: `name`, `store`, `worth` (preço normal; sem ele, a linha do preço some),
  `ends_at` (em Brasília, "QUI, 27/11 · 13H") e `image_url` (já em `/media`).
- Sem registro em `free_games` (promoção escrita à mão): cai no Modelo N.

### Modelo P2 — Ofertas da semana (compilação de sexta, 1 imagem)

```
   48  │ [logo64] RESPAWNOU.                       ◤OFERTAS◢       │
  130  │ PROMOÇÕES DA STEAM (Anton 96 #eef3ea)                     │
  240  │ DA SEMANA (Anton 96 #c8ff2e)    > PREÇOS EM REAIS, 28/11  │ mono 700 24 #8a9787
  380  │ ┌──────────┐ NOME DO JOGO (Anton 40, 1 linha)   [−75%]     │ 4 linhas de 180 px, espaço 16:
       │ │ 300×140  │ R$ 19,99 (Anton 48)  de R$ 79,99 (riscado)  │ imagem do cabeçalho Steam (2,14:1),
       │ └──────────┘                                             │ chip desconto à direita
       │ ... (4 jogos, maior desconto primeiro)                    │
 1130  │ + 4 OFERTAS NA MATÉRIA                                    │ mono 700 26 #c8ff2e
 1176  ├ Rodape ("Preço muda rápido: confira na loja")             │
```
- Dados vêm da própria compilação (`Compilation.social`, passo IG10). Sem esses dados: Modelo N.

### Modelo S — Lançamentos da semana (compilação de segunda, 1 imagem)

```
   48  │ [logo64] RESPAWNOU.                        DADOS: IGDB    │
  130  │ LANÇAMENTOS (Anton 110 #eef3ea)                           │
  250  │ DA SEMANA (Anton 110 #c8ff2e)                             │
  330  │ > 24 A 30 DE NOVEMBRO // 9 JOGOS (mono 700 28 #b4bfb0)    │
  390  ├───────────────────────────────────────────────────────────┤
  406  │ ┌──────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │ uma linha por dia com jogo
       │ │ SEG  │ │arte 16:9│ │        │ │        │ │   +2   │      │ coluna do dia 132×(altura): fundo
       │ │24/11 │ │192×108  │ │        │ │        │ │        │      │ #111611, "SEG" Anton 52, "24/11" mono 24
       │ └──────┘ │Nome em 2│ │        │ │        │ └────────┘      │ #c8ff2e; quadros de jogo 192 de largura,
       │          │linhas   │ │        │ │        │                 │ espaço 12; nome Inter 600 22/25, 2 linhas
       │ ... até 5 linhas (dias); a linha cresce até 200 px        │
 1176  ├ Rodape: "> SIGA @RESPAWNOU" / chip                         │
       │ "CALENDÁRIO COMPLETO: LINK NA BIO"                         │
```
- Altura da linha = `min(200, (770 − 12 × (n − 1)) / n)`, com n dias (máximo 5). Arte 192×108 (`games.image_url`,
  16:9) no topo do quadro; sem arte, `cover_url` recortada; sem nenhuma, quadro `painel` com o nome em Anton 28.
- Mais de 4 jogos no dia: 3 quadros + quadro "+N" (Anton 64 `destaque` sobre `painel`).
- Mais de 5 dias com jogo: juntar sábado e domingo em "FIM DE SEMANA"; se ainda passar de 5, juntar segunda e terça.
- O jogo com mais `hypes` da semana ganha borda 3 px `destaque` e um triângulo `destaque` de 28 px no canto superior
  direito do quadro.
- Dados: `Compilation.social` (passo IG10) ou, se faltar, `games` com `release_date` entre a segunda e o domingo da
  semana do `published_at` (Brasília), `ORDER BY release_date, hypes DESC LIMIT 12`.

## Que modelo cada matéria usa (`site.server.ts`, `escolherModelo`)

| Matéria | Modelo | Prioridade na fila | Validade (some da fila depois) |
|---|---|---|---|
| Compilação `lancamentos-semana` | S | 40 | 48 h |
| `promocoes` com linha em `free_games` | P1 | 50 | até 6 h antes de `ends_at` (máx. 48 h) |
| Compilação `ofertas` (tag Ofertas) | P2 | 35 | 48 h |
| `reviews` com `review` preenchido | C (review) | 30 | 48 h |
| `guias` com tag Requisitos e `pc_min` e `pc_rec` lidos | C (guia) | 20 | 48 h |
| `artigos`, outros `guias`, peça da semana | C (artigo) se `extrairPontos` der ≥ 3 pontos; senão N | 20 | 48 h |
| `noticias` e demais `promocoes` | N | 10 | 12 h |

Na fila, sai primeiro a maior prioridade e, empatado, a mais nova. Notícia velha expira em vez de sair atrasada.

## Como extrair os pontos (sem Gemini)

`core/pontos.ts`, tudo puro:
1. `limparLinks`: `[texto](url)` vira `texto`; tirar espaços duplos.
2. **Artigos:** candidatos = blocos `h2`, exceto os que começam com "Mais sobre", "Leia também", "Perguntas" ou
   "Como a lista foi feita". Para cada um: `titulo` = o h2 (≤ 70 caracteres, senão `cortar`), `texto` =
   `frasesInteiras(primeiro p depois do h2, 220)`, `imagem` = o primeiro bloco `img` antes do próximo h2 (ou nada).
3. Menos de 3 h2 válidos: usar itens de `ul` (até 5). Item no formato "Nome: descrição" vira título + texto; sem ":",
   tudo vira texto e o título é "DESTAQUE 1", "DESTAQUE 2"…
4. Ficar com no máximo 5 pontos (os primeiros, na ordem do texto). Slides = capa + pontos + CTA (5 a 7).
5. **Review:** `posts.review` (`critics`, `pros`, `cons`, `verdict`, `score`). Nada a extrair: só ordenar e cortar.
6. **Guia de requisitos:** `lerRequisitos(games.pc_min)` e `pc_rec`: separar por linha (ou por "  " / "•"), achar
   "Rótulo: valor" e mapear rótulos parecidos (`SO`/`Sistema operacional` → SO; `Processador`; `Memória`;
   `Placa de vídeo`/`Vídeo`/`Gráficos` → PLACA DE VÍDEO; `Armazenamento`/`Espaço` → ARMAZENAMENTO). Precisa de pelo
   menos PROCESSADOR, MEMÓRIA e PLACA DE VÍDEO nas duas colunas; senão, tratar como artigo (passo 2).
7. **Plano B (no máximo 1 pedido ao Gemini por post):** só se o passo 2/3 der menos de 3 pontos **e** a configuração
   `pontosComGemini` estiver ligada. `site.server.ts` expõe `resumirEmPontos(titulo, texto)` que usa o
   `generateJson` do robô com esquema `{ pontos: [{ titulo ≤ 60, texto ≤ 200 }] }` (3 a 5 itens), com o mesmo
   "não invente nada além do texto". Falhou, deu 429 ou veio fora do tamanho: Modelo N (uma imagem), sem nova tentativa.
   No respawnou, ligado por padrão só para `artigos`; cota grátis é de ~20 pedidos/dia por modelo, então isto não pode
   virar rotina (registrar no `error`/nota quando usar).

## Legenda

Regras (`core/legenda.ts`):
- Curta: alvo de 250 a 450 caracteres no total (máximo duro de 700). Em pt-BR, sem emoji por padrão
  (`config.legenda.emoji = false`), sem link (no Instagram não é clicável: sempre "link na bio").
- Estrutura: **gancho** (1 linha) / **contexto** (1 a 2 frases inteiras, ≤ 220 caracteres) / **pergunta** opcional
  (uma lista por tipo em `config.ts`, escolhida por `postId % tamanho`, para variar sem sorteio) / **CTA** fixo do site /
  **hashtags** (no máximo 3, na última linha).
- Gancho: o título da matéria (já tem 30–70 caracteres e a palavra-chave). Notícia com "rumor": começa com "RUMOR: ".
- Contexto: `frasesInteiras(excerpt, 220)`; se o excerpt repetir o título (≥ 70% das palavras), usar a
  `meta_description`.
- CTA (config): "Matéria completa no link da bio. Siga @respawnou pra não perder nenhuma."
- Hashtags (`hashtags()`): (1) o jogo: nome da ficha (`games.name` via `game_id`) ou a `focus_keyword` se tiver até
  24 caracteres, em CamelCase sem acento (`paraHashtag`, mesma regra do `toHashtag` do site antigo); (2) a plataforma,
  só se a matéria tem 1 ou 2 plataformas (`pc` → `PCGamer`, `playstation` → `PS5`, `xbox` → `Xbox`, `switch` →
  `NintendoSwitch`, `mobile` → `JogosMobile`); (3) a base do tipo (`noticia` → `games`, `promo` → `jogosgratis`,
  `semana` → `lancamentosdejogos`, `review` → `games`, `guia` → `pcgamer`, `artigo` → `games`). Sem repetir (comparar
  sem caixa); faltando, completa com a base. Nunca mais de 3.

**Legendas por tipo (formato):**
- Carrossel artigo: gancho + "Arrasta pro lado: os {N} pontos principais." + pergunta + CTA + hashtags.
- Review: gancho + "Média da crítica: {8,4} em {7} veículos. Arrasta pra ver o que elogiaram e o que criticaram." + CTA.
- Guia: gancho + "Mínimo e recomendado pra rodar no PC, direto da Steam. Salva pra conferir antes de comprar." + CTA.
- Grátis: "GRÁTIS: {Nome} de graça na {loja} até {qui, 27/11, às 13h}." + "Depois volta a custar {R$ 89,99}." +
  "Como resgatar: link na bio. Siga @respawnou que a gente avisa todo jogo grátis." + `#jogosgratis #{Loja} #{Jogo}`.
- Semana: "Lançamentos da semana ({24 a 30/11}): {3 nomes mais aguardados} e mais {N}." + "Qual você vai jogar
  primeiro?" + "Calendário completo no link da bio." + `#lancamentosdejogos #games #{MaisAguardado}`.

**5 exemplos de legenda de notícia** (formato que o código gera; jogos reais, fatos ilustrativos):

```
Hollow Knight: Silksong ganha expansão gratuita em dezembro
A Team Cherry confirmou novas áreas e chefes sem custo extra, em todas as plataformas em que o jogo já saiu.
Vai voltar pra Pharloom?
Matéria completa no link da bio. Siga @respawnou pra não perder nenhuma.
#HollowKnightSilksong #NintendoSwitch #games
```
```
GTA 6 tem novo trailer com mapa de Leonida e data mantida
A Rockstar mostrou cidades novas e reforçou o lançamento para 2026 no PlayStation 5 e no Xbox Series.
O que mais chamou sua atenção?
Matéria completa no link da bio. Siga @respawnou pra não perder nenhuma.
#GTA6 #games
```
```
RUMOR: remake de Resident Evil Code Veronica estaria em produção
Insiders citam a Capcom, mas nada foi anunciado oficialmente; tratamos como rumor até a confirmação.
Matéria completa no link da bio. Siga @respawnou pra não perder nenhuma.
#ResidentEvil #games
```
```
Elden Ring Nightreign recebe modo para dois jogadores
A FromSoftware liberou a atualização hoje; antes, o modo cooperativo só aceitava trios.
Vai jogar em dupla?
Matéria completa no link da bio. Siga @respawnou pra não perder nenhuma.
#EldenRingNightreign #games
```
```
Hades 2 chega ao celular pela Netflix Games
O roguelike da Supergiant entra no catálogo de quem assina a Netflix, sem anúncios nem compras dentro do jogo.
Matéria completa no link da bio. Siga @respawnou pra não perder nenhuma.
#Hades2 #JogosMobile #games
```

## Parte técnica

### Geração da imagem (sem navegador)
- `satori` (MIT, JS puro + WebAssembly do Yoga; sem binário nativo) recebe JSX (elementos React simples, sem hooks)
  com estilos inline em flexbox e as fontes como `ArrayBuffer`, e devolve um SVG em que **o texto já vem em caminhos**.
  Depois `sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" })`.
- Limitações do satori a respeitar nos modelos: todo `div` com mais de um filho precisa de `display: "flex"`; sem CSS
  grid; sem `z-index` (vale a ordem dos elementos; usar `position: "absolute"` para sobrepor); suporta
  `linear-gradient`/`radial-gradient`, `transform` (rotate), `WebkitTextStroke`, `lineClamp`, `objectFit`,
  `textDecoration: line-through` e `<svg>` embutido (usar para chanfros e furos do cupom).
- Imagens entram como **data URI** já no tamanho final (o `sharp` recorta com `fit: "cover"` antes; isso evita JPEG
  de 4 MB dentro do SVG). Capas e artes locais: ler de `MEDIA_DIR` a partir do caminho `/media/...`. Capas do IGDB
  (semana): baixar com `fetch` (timeout 15 s); falhou, quadro sem imagem.
- Fontes: ler `app/social/fonts/*.ttf` com `readFile(join(process.cwd(), "app/social/fonts", arquivo))` uma vez (cache).
  O deploy da Hostinger roda o build dentro da pasta do repositório (o `server.js` já lê `db/migrations` assim), então
  a pasta existe em produção. Se um dia não existir, `render/fontes.server.ts` deve dar erro claro
  ("fonte não encontrada: ...") e o passo IG3 testa isso em produção.
- Renderizar **um slide por vez** (memória compartilhada do plano Business) e nunca em paralelo com outro post.
- Saída: `MEDIA_DIR/social/AAAA/MM/s{socialId}-{n}-{hash8}.jpg`, URL pública
  `https://respawnou.com.br/media/social/AAAA/MM/...` (já servida pelo Express, cache de 1 ano; o nome muda a cada
  geração). Instagram só aceita **JPEG** (por isso não é `/social/<id>.png`), até 8 MB, largura 320–1440, proporção
  entre 4:5 e 1,91:1. Arquivos de posts publicados há mais de 30 dias são apagados (`limparArquivos`, no `tick`).
- Plano B se o satori não rodar no servidor: `opentype.js` para transformar o texto em caminhos e montar o SVG à mão,
  como no `og-arcade.ts`. Só se o teste do IG3 falhar.

### API do Instagram (oficial, grátis)
- Produto: **Instagram API com login do Instagram** (`https://graph.instagram.com/v23.0`, conferir a versão atual).
  Não precisa de Página do Facebook. Permissões: `instagram_business_basic` e `instagram_business_content_publish`.
- Conta do Instagram **Profissional** (Empresa ou Criador de conteúdo).
- Fluxo de uma imagem: `POST /{ig-id}/media` (`image_url`, `caption`) → `id` do contêiner → `GET /{id}?fields=status_code`
  a cada 3 s até `FINISHED` (máx. 20 vezes; `ERROR`/`EXPIRED` = falha) → `POST /{ig-id}/media_publish`
  (`creation_id`) → `id` da mídia → `GET /{media-id}?fields=permalink`.
- Carrossel (2 a 10 itens, todos 1080×1350): um `POST /{ig-id}/media` com `is_carousel_item=true` por slide → esperar
  todos `FINISHED` → `POST /{ig-id}/media` com `media_type=CAROUSEL`, `children=id1,id2,...`, `caption` → esperar →
  `media_publish`.
- Antes de enviar: `GET /{ig-id}/content_publishing_limit?fields=quota_usage,config`. **Limite: 100 posts pela API por
  24 h corridas** (carrossel conta 1). Com `quota_usage ≥ 90`, não envia e tenta em 6 h. Nosso limite diário padrão
  é 4, bem abaixo.
- `{ig-id}` = `user_id` de `GET /me?fields=user_id,username`, gravado ao conectar.
- Token no corpo do POST ou no cabeçalho `Authorization: Bearer`; **nunca** logar a URL com `access_token`.
- Um post leva de 15 s (imagem) a 60 s (carrossel de 7): sempre em segundo plano (a CDN corta pedidos com mais de
  ~55 s; ver `automacao.md`).
- **Contra post duplicado:** gravar `container_id` antes do `media_publish`. Se o processo cair no meio (deploy) e a
  linha ficar `sending`, na retomada: `GET /{container_id}?fields=status_code`; se `PUBLISHED`, buscar
  `GET /me/media?fields=id,caption,permalink,timestamp&limit=5`, achar a mídia cuja legenda começa igual e marcar
  `published` sem reenviar.
- Erros (códigos de referência; conferir na documentação de erros da API de publicação ao implementar):

| Erro | O que fazer |
|---|---|
| `190` (token inválido/expirado) | `token_status = 'invalid'`, para tudo, aviso vermelho no painel; não gasta tentativa |
| `4`, `17`, `32`, `613` (limite de chamadas) | `next_try_at` + 60 min; não gasta tentativa |
| `9` ou subcódigo de limite de publicação | `paused_until` + 6 h |
| mídia não baixada / tempo esgotado (ex.: `2207052`, `2207003`) | tentativa normal: +15 min, +60 min, +4 h; depois `failed` |
| formato/proporção da imagem | `failed` na hora (é erro de render; ver no painel) |
| `368` (bloqueio temporário por comportamento) | `paused_until` + 24 h e aviso no painel |

### Token: onde guardar e como renovar
- **Tabela `social_accounts`, token criptografado** (AES-256-GCM, IV aleatório, `iv.tag.cifra` em base64) com a chave
  da variável de ambiente **`SOCIAL_KEY`** (64 caracteres hex = 32 bytes; gerar com
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e cadastrar no hPanel).
  Por quê não só variável de ambiente: o token muda a cada renovação (60 dias) e o app não consegue reescrever as
  variáveis do hPanel. Por quê não a tabela `settings` em texto puro: o painel e os backups leem `settings`.
- Sem `SOCIAL_KEY` (ou com menos de 64 hex), o painel não aceita token e mostra o motivo.
- Renovação: no `tick`, se `token_refreshed_at` tem mais de 7 dias (e o token mais de 24 h), chamar
  `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=...`, gravar o token
  novo, `token_expires_at = agora + expires_in`. Falhou com `190`: `invalid`. Outras falhas: tenta no próximo `tick`.
- Painel mostra "Token vence em N dias"; com menos de 10 dias ou `invalid`, aviso em `alerta`.
- **Quando o token expirar ou for invalidado** (troca de senha do Instagram, app removido em "Apps e sites", 60 dias
  sem o site renovar): repetir os passos 5 e 6 do "Passo a passo na Meta" (gerar token e colar em `/admin/instagram`).
  Os posts da fila esperam; notícia que passar da validade expira.

### Migration (colar no chat ao implementar; o `server.js` aplica no deploy)

```sql
-- 012: postagem automática no Instagram (docs/instagram.md, módulo app/social).
SET NAMES utf8mb4;

-- Uma linha por rede. O token fica criptografado (AES-256-GCM, chave em SOCIAL_KEY): nunca em texto puro.
CREATE TABLE IF NOT EXISTS social_accounts (
  network            VARCHAR(20)  NOT NULL PRIMARY KEY,            -- 'instagram'
  account_id         VARCHAR(40)  NULL,                            -- user_id da conta profissional
  username           VARCHAR(80)  NULL,
  token_enc          TEXT         NULL,
  token_status       VARCHAR(20)  NOT NULL DEFAULT 'none',         -- none|ok|invalid
  token_expires_at   DATETIME     NULL,                            -- UTC
  token_refreshed_at DATETIME     NULL,                            -- UTC
  enabled            TINYINT(1)   NOT NULL DEFAULT 0,              -- interruptor geral (desligado)
  test_mode          TINYINT(1)   NOT NULL DEFAULT 1,              -- gera e mostra no painel, não envia
  daily_limit        TINYINT UNSIGNED  NOT NULL DEFAULT 4,
  min_gap_minutes    SMALLINT UNSIGNED NOT NULL DEFAULT 90,
  start_hour         TINYINT UNSIGNED  NOT NULL DEFAULT 9,         -- horário de Brasília
  end_hour           TINYINT UNSIGNED  NOT NULL DEFAULT 22,
  models             JSON         NULL,                            -- modelos ligados: {"N":true,"C":true,"P":true,"S":true}
  paused_until       DATETIME     NULL,                            -- UTC
  note               VARCHAR(500) NULL,                            -- último aviso (bloqueio, cota)
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO social_accounts (network) VALUES ('instagram');

-- Fila e registro: uma linha por matéria e rede (o índice único impede postar duas vezes).
CREATE TABLE IF NOT EXISTS social_posts (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id       INT UNSIGNED NOT NULL,
  network       VARCHAR(20)  NOT NULL DEFAULT 'instagram',
  model         VARCHAR(20)  NOT NULL,                             -- N|C-artigo|C-review|C-guia|P1|P2|S
  status        ENUM('pending','preview','sending','published','failed','skipped','expired') NOT NULL DEFAULT 'pending',
  origin        ENUM('auto','manual') NOT NULL DEFAULT 'auto',
  priority      TINYINT UNSIGNED NOT NULL DEFAULT 10,
  payload       JSON         NULL,                                 -- dados extras (semana, ofertas)
  caption       TEXT         NULL,
  images        JSON         NULL,                                 -- ["/media/social/2026/11/s12-1-ab12cd34.jpg", ...]
  container_id  VARCHAR(40)  NULL,
  media_id      VARCHAR(40)  NULL,
  permalink     VARCHAR(300) NULL,
  error         VARCHAR(1000) NULL,
  attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  next_try_at   DATETIME     NULL,                                 -- UTC
  locked_at     DATETIME     NULL,                                 -- UTC
  expires_at    DATETIME     NULL,                                 -- UTC
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rendered_at   DATETIME     NULL,
  published_at  DATETIME     NULL,                                 -- UTC
  UNIQUE KEY uq_social_posts_post (post_id, network),
  KEY ix_social_posts_queue (network, status, priority, created_at),
  KEY ix_social_posts_published (network, published_at),
  CONSTRAINT fk_social_posts_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version) VALUES ('012_instagram');
```
Datas gravadas sempre com `UTC_TIMESTAMP()` no código (convenção do site), nunca `NOW()`.

### Fila e gatilho (`server/fila.server.ts`)
- `enfileirar(postId, dica?, origem = "auto")`: `INSERT IGNORE` (o índice único barra repetição) com `model`,
  `priority`, `expires_at` e `payload` da dica. Não gera imagem aqui (rápido; não atrasa o robô).
- Chamado em: (1) `insertPost` do robô, **só quando `status = 'published'`**, passando `extra.social` das
  compilações; (2) `post-edit.tsx`, `intent === "publicar"`, só se a matéria nunca tinha sido publicada
  (`published_at` nulo antes); (3) botão "Postar no Instagram" do painel (origem `manual`, envia na hora).
- `tick()`: roda no fim de `collect()` (a cada 30 min) e logo depois de um `publish()` que publicou (assim o post sai
  "assim que publicada", se o intervalo deixar). Também em `/api/cron/social`. Passos, nesta ordem:
  1. Trava: `SELECT GET_LOCK('social_tick', 0)`; sem trava, sai. Liberar com `RELEASE_LOCK` no `finally`.
  2. `sending` com `locked_at` de mais de 15 min: verificar o contêiner (anti-duplicado acima) e voltar para `pending`.
  3. Expirar: `pending`/`failed` com `expires_at < UTC_TIMESTAMP()` → `expired`.
  4. Renovar token se preciso; apagar arquivos antigos (1 vez por dia).
  5. `enabled = 0` e `test_mode = 0`: sai. `test_mode = 1`: gera imagens e legenda de até 2 `pending` → `preview`
     (não envia) e sai.
  6. Sem token `ok`, `paused_until` no futuro, fora de `start_hour`–`end_hour` (Brasília), `published` hoje (dia de
     Brasília) ≥ `daily_limit` ou último `published_at` há menos de `min_gap_minutes`: sai (o motivo vai para o painel
     como "Próximo envio").
  7. Pega 1 linha: `status = 'pending'` (ou `failed` com `next_try_at <= agora` e `attempts < 3`), maior
     `priority`, mais nova. `UPDATE ... SET status='sending', locked_at=UTC_TIMESTAMP() WHERE id=? AND status IN (...)`
     (se afetou 0 linhas, outro pegou). Gera imagens se ainda não há, envia, grava `published` + `media_id` +
     `permalink` ou o erro (tabela de erros).
- A decisão do passo 6/7 fica em `core/agenda.ts` como função pura (mesmo espírito do `autopost.ts` antigo) para ser
  testada sem banco.
- "Postar agora" ignora janela, limite e intervalo, mas não ignora a cota de 100/24 h nem a falta de token.
- "Repostar" (linha `published`) pede confirmação ("Já está no Instagram; postar de novo cria outro post") e volta a
  linha para `pending` com origem `manual`. "Pular" → `skipped`. "Gerar de novo" apaga `images` e `caption` e gera.
- Alternar o modo de teste para desligado **não** envia as prévias acumuladas; cada uma tem "Postar agora".

### Tela do painel `/admin/instagram`
Reusar `app/components/admin-ui.tsx` (`PageTitle`, `Card`, `Stat`, `Pill`, `Button`, `Field`, `inputCls`, `Notice`,
`when`) na página do site; o `Painel.tsx` genérico recebe os dados e os botões como props (como `app/visitas/ui`).
1. `PageTitle` "Instagram" com chip de estado à direita: "DESLIGADO" (`apagado`), "MODO DE TESTE" (`alerta`),
   "LIGADO" (`destaque`), "TOKEN INVÁLIDO" (vermelho do site / `alerta`).
2. Linha de 3 `Stat`: "Hoje" (`2/4`), "Próximo envio" (hora prevista ou motivo: "fora do horário", "aguardando
   intervalo", "fila vazia"), "Token" ("vence em 52 dias"; `tone="warn"` abaixo de 10).
3. `Card` "Conta": @ conectado, data de renovação, cota usada (`quota_usage/100`); campo de token (password) +
   "Conectar"; "Testar conexão"; "Desconectar". Sem `SOCIAL_KEY`: `Notice tone="warn"` explicando.
4. `Card` "Automação": interruptor geral, modo de teste, posts por dia (1–10), intervalo (30–720 min), janela
   (início/fim), modelos ligados (N, C, P, S), "Gemini como plano B dos pontos". Botão "Salvar".
5. `Card` "Fila" (últimas 30): cada linha com miniatura 64×80 do slide 1 (a própria URL `/media/social/...`), título
   (2 linhas), `Pill` do modelo e do estado, hora, tentativas, erro em `alerta` (1 linha, completo no `title`). À
   direita: "Ver", "Postar agora", "Pular", "Gerar de novo", "Repostar" (conforme o estado) e link "Abrir no Instagram"
   (`permalink`). "Ver" abre um `<details>` com todos os slides em 216×270 lado a lado (rolagem horizontal), a legenda
   em `<pre>` com botão "Copiar legenda" e o tamanho de cada JPEG.
   - Vazio: "Nada na fila. Assim que uma matéria for publicada, ela aparece aqui."
   - Carregando: botões desabilitados com "Enviando…" (estado de navegação do React Router).
   - Ações de envio rodam em segundo plano: mostrar `Notice` "Enviando em segundo plano; recarregue em 1 minuto".
6. Em `/admin/materias/:id`, `Card` "Instagram" pequeno: estado da linha da matéria (ou "Ainda não está na fila"),
   miniatura, "Ver prévia" (abre `/admin/instagram/previa/:id`) e "Postar no Instagram".

`/admin/instagram/previa/:postId?s=1&modelo=N` gera na hora, sem gravar, o slide `s` do modelo indicado (ou o
escolhido) e devolve `image/jpeg` com `Cache-Control: no-store`. É a ferramenta para conferir os layouts.

### Página "link na bio" `/links`
Layout do site (Header/Footer), `noindex`, fora do sitemap e dos menus. Topo: logo, "RESPAWNOU." e
"Matérias citadas no Instagram". Lista com as 20 últimas matérias que têm `social_posts.status = 'published'` (mais
novas primeiro) usando `PostRow` de `app/components/cards.tsx`; depois, "Mais recentes do site" com as 10 últimas
publicadas. Links com `?utm_source=instagram&utm_medium=social` (o painel de visitas já separa origem social).
Endereço para a bio: `respawnou.com.br/links`.

## Passos

Tamanhos: P (até ~1 h), M (meio dia), G (um dia). Cada passo termina com `npm run typecheck` e, antes de qualquer
push, `npm run build`.

**IG0 (dono, P) Meta e conta.** Seguir o "Passo a passo na Meta" (abaixo) até ter o token guardado (não colar no chat).
Pode ser feito em paralelo com IG1 a IG8.

**IG1 (P) Dependência e fontes.** `npm i satori`. Baixar os TTF estáticos listados em "Tokens" para
`app/social/fonts/` com o `OFL.txt` de cada família. Criar `app/social/config.ts` (estrutura abaixo, em "Como copiar")
e `app/social/db.ts` (cópia do `app/visitas/db.ts`).
Verificar: `ls app/social/fonts` mostra os 5 TTF; typecheck passa.

**IG2 (M) Núcleo puro.** `tipos.ts`, `core/texto.ts`, `core/legenda.ts`, `core/pontos.ts`, `core/agenda.ts`.
Verificar: um script temporário (`node --experimental-strip-types`, apagado depois) imprime a legenda e os pontos de
3 matérias de exemplo (notícia, artigo de lista, review); legenda ≤ 700 caracteres e ≤ 3 hashtags.

**IG3 (M) Render base + prova em produção.** `render/fontes.server.ts`, `render/imagem.server.ts`,
`render/render.server.ts`, `render/ui.tsx` e um slide de teste (Topo + título "TESTE ÁÇÃO" + Rodape). Rota
`app/routes/admin/instagram-previa.ts` (só admin) e registro em `app/routes.ts`. **Fazer deploy só com isso** e abrir
`/admin/instagram/previa/<id>` em produção: o título tem de sair em Anton com acentos. Falhou: anotar o erro e
aplicar o plano B (opentype.js) antes de seguir.

**IG4 (M) Modelo N.** `render/modelos/noticia.tsx` exatamente como o mockup (tamanho de título por comprimento,
palavra-chave em destaque, selos, crédito). `site.server.ts` com `carregarEntrada(postId)` e `escolherModelo`.
Verificar: prévia de 5 notícias reais com títulos curto e longo, com e sem vídeo, uma com "rumor".

**IG5 (M) Modelos P1 e P2.** `render/modelos/promo.tsx`. P1 com dados de `free_games`. P2 com dados de exemplo até o
IG10. Verificar: prévia de uma promoção da Epic publicada.

**IG6 (M) Modelo S.** `render/modelos/semana.tsx` com a regra de linhas/dias e o "+N". Verificar: prévia com 4, 9 e 12
jogos (forçar com `?modelo=S` em uma matéria de lançamentos da semana).

**IG7 (G) Carrossel.** `render/modelos/carrossel.tsx` (capa, ponto, notas, elogios/críticas, veredito, mínimo,
recomendado, lado a lado, CTA) e a montagem dos slides por subtipo. Plano B `resumirEmPontos` em `site.server.ts`.
Verificar: prévia `?s=1..N` de um artigo de lista, um consenso da crítica e um guia de requisitos; 5 a 7 slides; texto
nunca cortado no meio da frase.

**IG8 (M) Migration e fila.** `db/migrations/012_instagram.sql` (SQL acima; colar no chat). `server/fila.server.ts`
(`enfileirar`, `tick` até o passo 5 do tick: modo de teste) e `server/conta.server.ts` (ler/salvar configurações).
Verificar local: enfileirar 3 matérias, rodar o tick com `test_mode = 1`, ver 2 `preview` com `images` e `caption`;
rodar de novo, ver a 3ª.

**IG9 (M) API e token.** `server/cripto.server.ts`, `server/instagram.server.ts`, renovação em `conta.server.ts`,
passos 6 e 7 do tick, anti-duplicado e tabela de erros. Nunca logar token nem URL com token.
Verificar: com o token do dono (IG0), "Testar conexão" mostra o @ e a cota (só leitura, nada publicado).

**IG10 (M) Ganchos no site.**
- `compilations.server.ts`: `Compilation.social?: DicaSocial`; `weekReleases` preenche
  `{ modelo: "S", semana: { inicio, fim, jogos: [{ nome, slug, data, imagem, capa, hypes }] } }`; `steamDeals`
  preenche `{ modelo: "P2", ofertas: [{ nome, imagem (screenshots[0] ou cabeçalho), normal, agora, desconto }] }`.
- `robot.server.ts`: `insertPost(..., extra.social)` chama `enfileirar` (try/catch, só `published`); no ramo da
  compilação, passar `comp.social`; no fim de `collect()`, `await tickSocial()` com try/catch e log curto (como
  `limparVisitasDoDia`); em `publish()`, depois do `runJob`, se `status === "ok"` e houve `postId`, `tickSocial()`.
- `post-edit.tsx`: enfileirar ao publicar pela 1ª vez; cartão "Instagram".
- `cron.ts`: job `social` → `tickSocial` (responde 202 como os outros).
Verificar: `/api/cron/publicar?dry=1` não enfileira nada; uma publicação real cria a linha `pending`.

**IG11 (G) Painel.** `app/social/ui/Painel.tsx`, `ui/social.css`, `app/routes/admin/instagram.tsx` (loader com
`requireAdmin`; actions: conectar, testar, desconectar, salvar, postar agora, pular, gerar de novo, repostar) e o item
"Instagram" em `admin-ui.tsx`. Verificar em 1440 e 375 px: todos os estados (vazio, prévia, falha com erro, publicado).

**IG12 (P) `/links`.** Página do link na bio (descrita acima) e rota. Verificar: `noindex`, fora do sitemap, links com
UTM.

**IG13 (P) Produção em modo de teste.** Deploy; dono cadastra `SOCIAL_KEY` no hPanel, cola o token em
`/admin/instagram` e liga **só o modo de teste**. Por 1 a 2 dias as prévias se acumulam. Conferir:
`curl -sI -A "facebookexternalhit/1.1" https://respawnou.com.br/media/social/<arquivo>.jpg` responde `200` e
`image/jpeg` (se a CDN bloquear o robô da Meta, o envio falha com "mídia não baixada").

**IG14 (P) Primeiro envio de verdade.** Dono aprova as prévias. "Postar agora" em 1 notícia; conferir no app do
Instagram (imagem nítida, legenda, hashtags) e no painel (`published` + link). Depois, 1 carrossel. Então desligar o
modo de teste e ligar o interruptor geral (padrão: 4 por dia, intervalo 90 min, 9h–22h).

**IG15 (P) Docs.** Atualizar `docs/README.md` (status, documentos, Próximos passos, Pendências suas),
`docs/decisoes.md` (seção "Decisões deste plano" abaixo), `docs/banco-de-dados.md` (migration 012),
`docs/arquitetura.md` (`SOCIAL_KEY`, módulo `app/social`), `docs/admin.md` (página Instagram), este arquivo (status).

**IG16 (M, depois de 1 semana estável) Levar ao animeprofile.** Seguir "Como copiar para outro site". Vibecoin e
criasite depois.

## Passo a passo na Meta (para quem nunca fez)

O mínimo para publicar **só na própria conta**, sem análise da Meta, sem verificação de empresa e sem Página do
Facebook.

1. **Conta profissional.** No app do Instagram, entrar em @respawnou → menu (☰) → "Configurações e privacidade" →
   "Tipo de conta e ferramentas" → "Mudar para conta profissional" → categoria (ex.: "Site de notícias e mídia" ou
   "Jogos") → "Empresa" (ou "Criador de conteúdo"; os dois servem). Não precisa ligar a uma Página do Facebook.
   Ligar a verificação em duas etapas da conta.
2. **Conta de desenvolvedor.** Em developers.facebook.com, entrar com o seu Facebook pessoal → "Começar" → aceitar os
   termos e confirmar telefone/e-mail.
3. **Criar o app.** "Meus apps" → "Criar app" → nome (ex.: "Respawnou Social") e e-mail → caso de uso **"Gerenciar
   mensagens e conteúdo no Instagram"** → portfólio empresarial: "Não quero conectar agora" → "Criar app".
4. **Permissões.** No app → "Casos de uso" → "Personalizar" no caso do Instagram → conferir que
   `instagram_business_basic` e `instagram_business_content_publish` estão adicionadas (botão "Adicionar" se não).
5. **Gerar o token.** Ainda no caso de uso → "Configuração da API com login do Instagram" → "Gerar tokens de acesso" →
   "Adicionar conta" → entrar com @respawnou → "Permitir". Clicar em "Gerar token" ao lado da conta e copiar.
   Se aparecer erro de "função de desenvolvedor"/"tester": "Funções do app" → "Funções" → "Adicionar pessoas" →
   "Testador do Instagram" → @respawnou; depois, em instagram.com (navegador) → Configurações → "Apps e sites" →
   "Convites de testador" → "Aceitar"; voltar ao passo 5.
6. **Colar no site.** `/admin/instagram` → campo do token → "Conectar". O painel mostra @respawnou e "vence em ~60
   dias". O site renova sozinho a cada 7 dias. **Nunca** colar o token no chat, no GitHub ou num arquivo.
7. **Não fazer:** não precisa mandar o app para análise, não precisa mudar para o modo "Ao vivo", não precisa da chave
   secreta do app nem de webhooks. Em modo de desenvolvimento o app publica nas contas que têm função nele (a sua).
8. **Uma vez por ano** a Meta pode pedir a "Verificação de uso de dados" do app no painel de desenvolvedor: responder,
   senão o app é restringido e o token para.
9. **Um app para todos os sites** serve: cada site conecta a própria conta do Instagram (testadora do mesmo app) e
   guarda o próprio token. Ou um app por site, se preferir separar (pergunta em aberto).

## Caminho B: login do Facebook (se o painel da Meta só oferecer esse)

Em 2026-11-23 o painel do dono só mostrava "Configuração da API com login do Facebook" (a Meta avisa que o "login unificado" é o
recomendado e que o do Facebook está obsoleto, mas ainda funciona e publica imagem e carrossel). O site aceita os dois tipos de token:
`IG…` (login do Instagram, `graph.instagram.com`) e `EAA…` (login do Facebook, `graph.facebook.com`). Passos:

1. **Página do Facebook ligada à conta.** Criar (ou usar) uma Página do Facebook do Respawnou e ligar à conta profissional do Instagram
   (Instagram → Editar perfil → "Página", ou na Página → Configurações → "Contas vinculadas" → Instagram).
2. **Permissões** no app, no caso de uso do Instagram: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`.
3. **Gerar o token:** developers.facebook.com/tools/explorer → escolher o app → "Token de usuário" → adicionar as 4 permissões → "Gerar token de
   acesso" → autorizar escolhendo a Página e a conta do Instagram.
4. **Estender:** developers.facebook.com/tools/debug/accesstoken → colar o token → "Estender token de acesso" → copiar o novo (vale 60 dias).
5. **Colar em `/admin/instagram` → Conectar.** O site acha a Página e a conta do Instagram sozinho e guarda o **token da Página** (que, vindo de
   um token de longa duração, não vence). Sem renovação automática nesse caminho; se parar de funcionar, repetir os passos 3 a 5.

## Regras da Meta e boas práticas (para não perder a conta)
- Postar pela API oficial é permitido. Não automatizar curtidas, comentários, seguir/deixar de seguir nem mensagens.
- Não comprar seguidores, curtidas ou "engajamento"; não participar de grupos de troca de curtidas.
- Uma conta por site; o perfil diz o que é (bio com o site e "notícias de games todo dia").
- Nada de isca: a arte e a legenda prometem só o que a matéria entrega; rumor sempre marcado como rumor.
- Sem legendas iguais em sequência e sem excesso de hashtags (máx. 3); intervalo mínimo de 90 min; no máximo 4 a 6 por
  dia; nada de madrugada (janela 9h–22h).
- Imagens de terceiros ("reprodução") têm o mesmo risco de direito autoral do site: crédito na arte, e se chegar
  pedido de remoção, apagar o post no app. Preferir arte oficial (IGDB/Steam) quando a matéria tem ficha de jogo
  (pergunta em aberto).

## Como copiar para outro site

Ordem: **respawnou e animeprofile primeiro** (o animeprofile já previa `app/social` com satori + sharp), **vibecoin e
criasite depois**, quando tiverem conta no Instagram e conteúdo suficiente.

1. Copiar a pasta `app/social/` inteira.
2. Reescrever os arquivos específicos:
   - `config.ts`:
     ```ts
     export const SOCIAL = {
       site: "Respawnou",
       handle: "@respawnou",
       url: "https://respawnou.com.br",
       urlCurta: "RESPAWNOU.COM.BR",
       linkNaBio: "respawnou.com.br/links",
       logo: "public/logo-512.png",
       fontes: {
         display: { nome: "Anton", arquivo: "Anton-Regular.ttf", peso: 400 },
         texto: [ { nome: "Inter", arquivo: "Inter-Regular.ttf", peso: 400 }, { nome: "Inter", arquivo: "Inter-SemiBold.ttf", peso: 600 }, { nome: "Inter", arquivo: "Inter-ExtraBold.ttf", peso: 800 } ],
         mono: { nome: "JetBrains Mono", arquivo: "JetBrainsMono-Bold.ttf", peso: 700 },
       },
       cores: { fundo: "#060807", painel: "#0c110c", painel2: "#111611", linha: "#1c241a", linhaSuave: "#243022", texto: "#eef3ea", corpo: "#b4bfb0", apagado: "#8a9787", destaque: "#c8ff2e", destaqueSuave: "#dcff7a", destaqueFundo: "#3d5200", alerta: "#ffb020", sobreDestaque: "#060807" },
       estilo: { chanfro: 28, chanfroImagem: 40, grade: true, maiusculas: true, faixa: 8, pontoNoNome: true },
       rotulos: { noticias: "NOTÍCIA", artigos: "ARTIGO", reviews: "REVIEW", guias: "GUIA", promocoes: "PROMOÇÃO" },
       cta: { seguir: "SIGA @RESPAWNOU", rodapeNoticia: "Mais notícias de games todo dia", final: "Notícias, reviews, guias e lançamentos todo dia.", legenda: "Matéria completa no link da bio. Siga @respawnou pra não perder nenhuma." },
       legenda: { emoji: false, perguntas: { noticia: ["O que achou?", "Vai jogar?", "Animado?"], artigo: ["Faltou algum?", "Qual é o seu favorito?"], review: ["Concorda com a crítica?"], guia: ["Seu PC aguenta?"], promo: [], semana: ["Qual você vai jogar primeiro?"] } },
       hashtags: { base: { noticia: "games", artigo: "games", review: "games", guia: "pcgamer", promo: "jogosgratis", semana: "lancamentosdejogos" }, plataforma: { pc: "PCGamer", playstation: "PS5", xbox: "Xbox", switch: "NintendoSwitch", mobile: "JogosMobile" }, max: 3 },
       padroes: { porDia: 4, intervaloMin: 90, inicio: 9, fim: 22, fuso: "America/Sao_Paulo", validadeHoras: { N: 12, outros: 48 } },
       pontosComGemini: ["artigos"],
     } as const;
     ```
   - `db.ts`: as 3 funções da ponte com o banco do site.
   - `site.server.ts`: `carregarEntrada(postId)` (mapeia a tabela de matérias do site para `EntradaSocial`),
     `escolherModelo(entrada, dica)` (tabela "Que modelo cada matéria usa" do site), dados extras e
     `resumirEmPontos` (opcional; sem Gemini, devolve `null`).
   - `fonts/`: os TTF da identidade do site.
   - `ui/social.css`: cores do painel do site.
3. Migration nova a partir de `app/social/sql/social.sql` (ajustar o nome da tabela de matérias na `FOREIGN KEY`).
4. Rotas: página do painel, rota de prévia, job `social` no cron, `/links`.
5. Ganchos: `enfileirar` depois de gravar uma matéria publicada e ao publicar um rascunho; `tick` no cron que já
   existe.
6. Variável `SOCIAL_KEY` no hPanel do site (uma chave diferente por site).
7. Meta: conta profissional do site + token (mesmo app ou app próprio).
8. Modo de teste 1 a 2 dias, aprovar as prévias, ligar.

O que muda de um site para outro é a identidade (cores, fontes, logo, rótulos, chanfro ou não) e a escolha de modelo;
os esqueletos dos layouts são os mesmos. Se um site quiser um modelo totalmente próprio, `config.ts` pode apontar um
componente alternativo para um modelo (`modelos: { N: MinhaNoticia }`), sem mexer no resto.

## Riscos e cuidados
- **Fontes no servidor:** o satori não lê WOFF2 nem fonte variável; usar TTF estáticos. Testar em produção no IG3
  antes de construir o resto.
- **Imagem pública:** o Instagram baixa a imagem da nossa URL; confirmar que a CDN da Hostinger não bloqueia o robô da
  Meta (IG13). Só JPEG, 4:5, até 8 MB.
- **Pedidos longos:** envio sempre em segundo plano; a CDN corta em ~55 s.
- **Deploy no meio de um envio:** trava de 15 min + checagem do contêiner antes de reenviar (anti-duplicado).
- **Memória:** um slide por vez; imagens redimensionadas antes de entrar no SVG.
- **Cota do Gemini:** o plano B dos pontos é exceção; não usar Gemini para legenda.
- **Segredos:** token criptografado, `SOCIAL_KEY` só no hPanel; nunca logar token ou URL com token; nunca colar no chat.
- **React Router:** loaders e actions em rotas novas usam `routePath` (cliques internos pedem `.data`); `npm run build`
  antes do push.
- **Migration nova** (012 ou o próximo número livre): colar o SQL no chat ao implementar; o `server.js` aplica no
  deploy.
- **Robô intacto:** `enfileirar` e `tick` sempre em try/catch; falha no Instagram nunca pode derrubar coleta ou
  publicação. Testes `dry=1` não enfileiram.
- **AdSense:** `/links` é página leve do site, sem nada que pareça isca; não mexe nos espaços de anúncio.
- **Direito autoral** das capas de terceiros (ver "Regras da Meta").

## Como verificar
- `npm run typecheck` e `npm run build` sem erro.
- Prévias (`/admin/instagram/previa/:id?s=N`) abertas lado a lado com os mockups: posições, tamanhos de fonte, cores
  hex (conferir com conta-gotas), chanfros, faixa verde de 8 px no pé, nada importante fora de x 64–1016.
- Ver a prévia reduzida a 390 px de largura (zoom do navegador): título, "GRÁTIS", nota e datas legíveis.
- JPEG de cada slide entre 150 KB e 1,5 MB.
- Legendas: ≤ 700 caracteres, ≤ 3 hashtags, sem link, frase inteira.
- `social_posts`: nenhuma matéria com duas linhas; rascunho não gera linha; teste `dry=1` não gera linha.
- Com o interruptor desligado e o modo de teste desligado, o `tick` não faz nada (ver `/api/cron/social?wait=1` local).
- Primeiro post real conferido no app (IG14); `permalink` abre o post.
- Uma semana depois: posts por dia ≤ limite, nenhum entre 22h e 9h, visitas com origem `instagram` em
  `/admin/visitas`.

## Depois: vídeos (não planejar agora)
- Geração de vídeo foi **construída e engavetada em 2026-11-01** no animeprofile (voz paga, ElevenLabs); ver memória
  "Vídeos YouTube engavetados" e os commits citados lá antes de recomeçar.
- Reaproveitar as mesmas artes deste módulo como quadros: capa, pontos do carrossel e CTA viram cenas.
- Vídeo gerado por código a partir das imagens (zoom lento + cortes, ffmpeg no servidor ou no Actions), vertical
  1080×1920 para Reels/Shorts/TikTok e horizontal para o YouTube.
- Voz: só se houver opção grátis aceitável; sem voz, legenda palavra a palavra com destaque (preferência anotada).
- Ordem provável: Reels a partir do carrossel → Shorts → TikTok (exige app e auditoria próprios, plano no
  `animeprofile-old/docs/redes-sociais.md`, "Fase 3").

## Decisões deste plano (o executor copia para `decisoes.md` no IG15)
- 2026-11-22: imagens geradas no servidor com `satori` + `sharp` (texto vira caminho; o librsvg não carrega
  `@font-face`), seguindo o animeprofile novo; sem navegador nem GitHub Actions, ao contrário do site antigo.
- 2026-11-22: formato único 1080×1350 (4:5) em JPEG, servido de `/media/social/...` (o Instagram não aceita PNG).
- 2026-11-22: um modelo por tipo (N notícia, C carrossel para artigo/review/guia, P1 grátis, P2 ofertas, S semana),
  todos com a identidade "Central de Comando".
- 2026-11-22: legenda montada por código (sem Gemini), máx. 3 hashtags; pontos do carrossel extraídos por código, com
  no máximo 1 pedido ao Gemini como plano B.
- 2026-11-22: token em `social_accounts`, criptografado com `SOCIAL_KEY`; renovação a cada 7 dias.
- 2026-11-22: interruptor geral desligado e modo de teste ligado por padrão; 4 posts/dia, 90 min, 9h–22h.
- 2026-11-22: módulo copiável `app/social/` (padrão `app/visitas/`); animeprofile e respawnou primeiro.

## Perguntas em aberto (para o dono)
1. **Conta:** o @ do Instagram do Respawnou já existe? Qual é exatamente (o plano assume `@respawnou`)?
2. **Volume:** 4 posts por dia está bom para começar, ou prefere 3 (só os melhores) ou 6?
3. **Capa das notícias:** usar a mesma capa da matéria (imagem da fonte, "reprodução") ou, quando a notícia tem ficha
   de jogo, a arte oficial do IGDB/Steam (menos risco de direito autoral, às vezes menos ligada ao fato)?
4. **Emoji na legenda:** sem emoji (padrão do plano) ou 1 emoji no CTA?
5. **Gancho com IA sem custo extra:** quer que o redator do robô devolva, no mesmo pedido que já faz ao Gemini, um
   "gancho para o Instagram" (≤ 90 caracteres) e 3–5 pontos para carrossel? Não gasta pedido a mais, mas mexe no
   prompt do redator; o plano deixa como melhoria depois do IG14.
6. **App da Meta:** um app para todos os sites (menos trabalho) ou um app por site (separa riscos)?
7. **Link na bio:** usar a página nova `/links` (recomendado: mostra as matérias citadas) ou só a home?
