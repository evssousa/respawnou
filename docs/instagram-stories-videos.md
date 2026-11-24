# Stories, vídeos curtos e imagens próprias nos slides (extensão do módulo `app/social`)

Status: 📝 plano (2026-11-23). Nada implementado. Executor: seguir as frentes na **ordem recomendada** (abaixo), passo a
passo, sem pular a verificação de cada passo. Base obrigatória: `docs/instagram.md` (módulo `app/social`, já pronto).

## Objetivo

1. **Stories (prioridade 1):** cada matéria publicada ganha também um Story 1080×1920 gerado no servidor e publicado pela
   API oficial, com fila, limites e interruptor próprios.
2. **Vídeos curtos (prioridade 2):** a partir de uma matéria, gerar um vídeo vertical narrado (voz ElevenLabs, sem rosto),
   aprovado em 2 minutos no painel e publicado em fases: baixar → Reels → YouTube Shorts → TikTok.
3. **Imagens próprias nos slides (prioridade 3):** no `/admin/instagram`, trocar a imagem de um slide ou acrescentar
   imagens a um item da fila, ver o resultado e gerar de novo.

## Decisão do dono (2026-11-24): sem GitHub Actions
Os vídeos são montados só no servidor do site (ffmpeg-static). Se na Hostinger não der certo, tenta-se outro dia ou outra hora; não haverá GitHub Actions. (Trechos abaixo que falam de GitHub Actions, `VIDEO_WORKER_SECRET` e disparo de workflow ficaram sem uso.)

## Decisões do dono (2026-11-23)

1. ElevenLabs: o dono já tem o plano pago.
2. Voz: uma por editoria (notícias, artigos, reviews, guias, promoções), escolhidas pelo conector.
3. Vídeos: só quinta, sábado e domingo.
4. Roteiro: o dono revisa antes da voz; o que não ficar bom é descartado e passa para o próximo (sem editar).
5. Stories: mesma quantidade diária dos posts de notícias do feed; notícias com "rumor" também ganham Story.
6. Música: nenhuma por padrão; se der para colocar pela API, trilha própria livre de direitos.
7. Canais do YouTube e TikTok ainda não existem: serão criados na fase 3/4.
8. Frase de fechamento falada: aprovada.
9. Ordem: Stories, depois imagens próprias nos slides, depois vídeos (confirmada).
Conta do Instagram: profissional, mudando para o tipo **Empresa** (em português o app chama "Empresa"; a outra opção é "Criador de conteúdo").
Artigos do feed: desligados até a frente C (imagens próprias nos slides) ficar pronta.

## Ordem recomendada de execução

| Ordem | Frente | Tamanho | Por quê nesta ordem |
|---|---|---|---|
| 1 | **A. Stories** (ST1–ST11) | G (≈ 1,5 dia) | Prioridade do dono, combinado para 2026-11-24; reaproveita quase tudo. |
| 2 | **C. Imagens próprias** (UP1–UP8) | M (≈ 1 dia) | Pequena, independente, e os vídeos usam o mesmo esquema de "imagem própria + foco" nas cenas. Também salva notícias que hoje são puladas por "sem capa". |
| 3 | **B. Vídeos, fase 1** (V1–V12) | G (2 a 3 dias) | Maior e com dependências externas (ElevenLabs pago, GitHub Actions). Começa só com o dono tendo respondido as perguntas 1 a 4. |
| 4 | B, fase 2 (Reels automático, V13–V16) | M | Depois de 1 semana de vídeos aprovados à mão. |
| 5 | B, fase 3 (YouTube, V17–V21) | M + dono | Depende da conta Google e da auditoria da API. |
| 6 | B, fase 4 (TikTok) | P (manual) / G (API) | Manual por padrão; API só se o volume justificar. |

Se o dono preferir manter a ordem 1-2-3 literal (vídeos antes das imagens próprias), nada quebra: a frente C não depende
da B, e a B funciona sem a C (só perde a opção de trocar a imagem de uma cena por upload).

---

# Contexto geral

## O que já existe (conferido no código em 2026-11-23)

- `app/social/` completo: `config.ts` (SOCIAL, FONTES, TITULO, COR), `tipos.ts`, `core/*` (texto, legenda, pontos,
  agenda), `render/` (`fontes.server.ts`, `imagem.server.ts`, `render.server.ts`, `slides.server.ts`, `ui.tsx`,
  `modelos/noticia|carrossel|promo|semana.tsx`), `server/` (`cripto`, `conta`, `fila`, `instagram`), `sql/social.sql`.
- Painel `app/routes/admin/instagram.tsx` (conta, automação, fila com miniaturas, `Visualizador` em tela cheia,
  postados) e prévia `app/routes/admin/instagram-previa.ts` (gera na hora, cache de 5 min em memória).
- Migration `db/migrations/012_instagram.sql`: `social_accounts` (uma linha por rede) e `social_posts`
  (`UNIQUE (post_id, network)`, `payload JSON` com a `DicaSocial` das compilações).
- `db/migrate.mjs` aplica as migrations pendentes no início do servidor, com `multipleStatements: true` (um arquivo pode
  ter vários comandos). Próximo número livre hoje: **013**.
- Envio de imagem do painel: `app/routes/admin/upload.ts` + `storeUpload()` em `app/lib/robot/media.server.ts`
  (WebP até 1600 px) e o componente `UploadButton` em `app/routes/admin/post-edit.tsx` (modelo para o botão novo).
- Configurações livres: tabela `settings (name, value JSON)` (ver `app/lib/ads.server.ts`).
- Repositório do respawnou é **público** (portfólio): GitHub Actions em repositório público não gasta minutos pagos.
- Vídeos engavetados (2026-11-01, no animeprofile antigo `animeprofile-old`): commits `dd584c699` (base), `b62aa84d1`
  (voz), `c200329cd` (cartão/destaques), `996367cd3` (último antes do rollback). Desenho aproveitado: tabela
  `video_jobs`, worker no GitHub Actions falando só com a API do site, roteiro com cartão de título + destaques,
  MP4 9:16. Motivo do rollback: ElevenLabs grátis não deixa a API usar vozes da biblioteca (precisava de US$ 5); não foi
  problema de código. Preferências de estilo do dono: **fala compassada e clara**, imagens automáticas da matéria com
  **zoom**, **logo do site**, **legenda palavra por palavra com destaque** (lá era amarelo; aqui vira o verde-limão
  `#c8ff2e` da identidade, configurável).
- Tempo do dono: seg/qua/sex 30 min, ter 60 min, qui/sáb/dom até 3 h. Não aparece com rosto; voz gerada pode.

## Três problemas no código atual que estas frentes precisam corrigir (bugs latentes)

1. `render/imagem.server.ts`, `logoDataUri(tamanho)`: o cache (`logoCache`) ignora o tamanho; depois da primeira
   chamada, `logoDataUri(256)` devolve a logo de 128. Trocar por `Map<number, string>`.
2. `gradeDataUri(w, h)`: o cache ignora `w`/`h`. O Story precisa da grade 1080×1920. Trocar por `Map<string, string>`
   com chave `${w}x${h}`.
3. `server/fila.server.ts`, `limparArquivos()`: percorre `social/<ano>/<mês>/<arquivo>` e chama `rm` sem `recursive`;
   uma pasta que não seja ano (ex.: `social/uploads`) faz o `rm` de uma pasta falhar e **aborta a limpeza inteira**.
   Passar a considerar só pastas `^\d{4}$` e `^\d{2}$`.

---

# Frente A — Stories do Instagram

## Contexto

O `instagram.md` deixou o Story de fora ("a API não põe link nem música"). Continua verdade: **pela API não existe
figurinha de link, enquete, música nem menção clicável**; só a imagem (ou vídeo). Mesmo assim o Story vale: aparece no
topo do app para quem já segue, sem disputar o algoritmo do feed, e mantém a conta "viva" 7 a 8 vezes por dia sem
poluir a grade. O CTA é **"link na bio"** (página `/links`, que já existe) com uma seta apontando para o nome da conta
no topo do Story (tocar no nome abre o perfil).

Para os dias com tempo (qui/sáb/dom), o painel oferece **"Baixar JPEG" + "Copiar link da matéria" + "Marcar como
postado à mão"**: o dono posta pelo celular com a figurinha de link (que gera clique de verdade) e o robô não posta o
mesmo Story de novo.

## Regras da API para Story (conferir na documentação de publicação de conteúdo ao implementar)

- `POST /{ig-id}/media` com `media_type=STORIES` e `image_url` (JPEG público) → contêiner → esperar `FINISHED` →
  `POST /{ig-id}/media_publish` (`creation_id`). Igual ao post de imagem, **sem `caption`** (Story não tem legenda).
- Funciona nos dois caminhos já aceitos pelo módulo (token `IG…` em `graph.instagram.com` e `EAA…` em
  `graph.facebook.com`).
- Só **conta profissional**; a documentação da Meta já restringiu Story pela API a contas **Empresa** em algumas
  versões. Se o envio falhar com erro de permissão/tipo de conta, o dono muda para "Empresa" no app (pendência).
- Conta na **mesma cota de 100 publicações por 24 h** da API (conferir; carrossel conta 1). Com feed 4/dia + stories
  6/dia, ficamos em 10/100.
- Imagem: JPEG, 9:16 recomendado (1080×1920), até 8 MB. O Story some do perfil em 24 h (o arquivo pode ser apagado
  depois de 30 dias, como os do feed).

## Decisões de modelagem (fila)

- **Coluna `kind` em `social_posts`** (`feed | story | reel`), com o índice único passando para
  `(post_id, network, kind)`. Por quê: mesma fila, mesmas ações do painel, mesmo `tick`, mesmo anti-duplicado; `network`
  continua significando a rede (Instagram, depois YouTube/TikTok). Já inclui `reel` para a frente B não precisar de
  outro `ALTER` de enum. Descartado: tabela nova (duplicaria fila/ações) e `network = 'instagram_story'` (mistura rede
  com formato e complica YouTube/TikTok).
- **Configuração dos stories em colunas novas de `social_accounts`** (`story_enabled`, `story_daily_limit`,
  `story_min_gap_minutes`). Janela de horário e **modo de teste são os mesmos do feed** (um só interruptor de teste,
  menos coisa para o dono lembrar).
- **Validade curta:** Story de notícia expira da fila 6 h depois de enfileirado; os demais, 24 h. Story atrasado não
  serve para nada.
- **Independente do feed:** o Story tem a própria prioridade e o próprio limite; os interruptores de modelos (N, C, P,
  S) continuam valendo **só para o feed**. Se o post de feed da mesma matéria já foi publicado quando o Story é gerado,
  a arte ganha o selo "NOVO NO FEED".
- **Sem enfileirar matérias antigas:** o botão "Colocar as 30 últimas matérias na fila" continua só para o feed.

### Migration (colar no chat ao implementar; o `server.js` aplica no deploy)

```sql
-- 013: Stories do Instagram (docs/instagram-stories-videos.md, frente A).
SET NAMES utf8mb4;

-- Formato da publicação: feed (imagem/carrossel), story (9:16, 24 h) ou reel (vídeo, frente B).
ALTER TABLE social_posts
  ADD COLUMN kind ENUM('feed','story','reel') NOT NULL DEFAULT 'feed' AFTER network;

-- O índice único passa a incluir o formato. Criar o novo ANTES de apagar o antigo: a chave estrangeira de post_id
-- precisa de um índice que comece por post_id o tempo todo.
ALTER TABLE social_posts ADD UNIQUE KEY uq_social_posts_kind (post_id, network, kind);
ALTER TABLE social_posts DROP INDEX uq_social_posts_post;

ALTER TABLE social_posts
  DROP INDEX ix_social_posts_queue,
  ADD KEY ix_social_posts_queue (network, kind, status, priority, created_at),
  DROP INDEX ix_social_posts_published,
  ADD KEY ix_social_posts_published (network, kind, published_at);

-- Configuração dos stories (janela de horário e modo de teste são os mesmos do feed).
ALTER TABLE social_accounts
  ADD COLUMN story_enabled         TINYINT(1)        NOT NULL DEFAULT 0  AFTER models,
  ADD COLUMN story_daily_limit     TINYINT UNSIGNED  NOT NULL DEFAULT 6  AFTER story_enabled,
  ADD COLUMN story_min_gap_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 45 AFTER story_daily_limit;

INSERT INTO schema_migrations (version) VALUES ('013_stories');
```

Atualizar também `app/social/sql/social.sql` (base para os outros sites) com o estado final das duas tabelas (o
`CREATE TABLE` já com `kind`, o índice novo e as colunas `story_*`).

## Direção visual dos Stories

**Clima:** o mesmo "Central de Comando" do feed, esticado para a tela inteira do celular: imagem grande em cima, título
enorme em Anton, um único botão verde no fim. **Referência:** o Modelo N do feed (`render/modelos/noticia.tsx`).
**Evitar:** texto nas zonas cobertas pelo app (topo e base), mais de um CTA, letra abaixo de 26 px, "figurinha falsa"
desenhada que pareça clicável sem ser (o botão diz "LINK NA BIO", nunca "TOQUE AQUI").

**Hierarquia:** 1º imagem + título (ou a arte do post, no modelo moldura); 2º chips/linha fina; 3º o CTA verde e a seta
para o perfil.

**Zonas seguras (canvas 1080×1920):**
- y 0–250: barra de progresso, foto e nome da conta (o app desenha por cima). Só imagem e gradiente.
- y 1580–1920: campo "Enviar mensagem" e reações. Só fundo, grade e a faixa.
- Conteúdo importante entre **y 250 e y 1580**, **x 64 a 1016**.

**Tokens:** os mesmos `COR` de `app/social/config.ts` (o site só tem tema escuro): `fundo #060807`, `painel #0c110c`,
`linhaSuave #243022`, `texto #eef3ea`, `corpo #b4bfb0`, `apagado #8a9787`, `destaque #c8ff2e`, `destaqueFundo #3d5200`,
`alerta #ffb020`, `sobreDestaque #060807`. Fontes iguais (Anton, Inter 400/600/800, JetBrains Mono 700). Espaçamento em
múltiplos de 8, sem raio arredondado, sem sombra suave (só sombra dura sem desfoque em `destaqueFundo`).

### Modelo ST-N — Story de notícia (para matérias cujo feed é o modelo N)

```
y    0 ┌──────────────────────────────────────────────────────────┐ x 1080
       │ CAPA 1080×1000 (cover, sharp position "attention")       │
       │ gradiente topo: #060807 90% (y 0) → 0% (y 360)           │
  272  │ [logo56] RESPAWNOU.                       NOTÍCIAS //    │ Topo(y=272, tam=56): marca Anton 32
       │                                                          │
  944  │                               IMAGEM: REPRODUÇÃO/IGN     │ crédito mono 700 18, #eef3ea 60%, à direita
       │ gradiente base: 0% (y 640) → #060807 100% (y 1000)       │
  988  │ [NOTÍCIA · PS5 · XBOX] [RUMOR] [▶ TRAILER NA MATÉRIA]    │ Chips (altura 48), espaço 12
 1060  │ TÍTULO EM ANTON 104/92/80/72, ATÉ 3 LINHAS,              │ #eef3ea; palavra-chave em #c8ff2e
       │ ENTRELINHA 1,02                                          │ (mesma regra do Modelo N)
       │ Linha fina Inter 400 36/48, #b4bfb0, até 3 linhas,       │ frase inteira
       │ frase inteira.                                           │
 1428  │ (fim do bloco de texto)                                  │
 1448  │ ↖ TOQUE NO @ LÁ EM CIMA                                  │ seta SVG 28 + mono 700 26 #b4bfb0
 1496  │ ┌──────────────────────────────────────────────────────┐ │ Chip cheio 952×84, mono 700 32,
       │ │        MATÉRIA COMPLETA: LINK NA BIO  →              │ │ texto centralizado, Seta 32
 1580  │ └──────────────────────────────────────────────────────┘ │
       │ fundo + grade (zona do campo de mensagem)                │
 1912  │███████████████████ faixa 8 px #c8ff2e ███████████████████│
 1920  └──────────────────────────────────────────────────────────┘
```

- **Ajuste do texto** (função `planejarStory(e)` no próprio modelo, no espírito de `planejar()` de `noticia.tsx`):
  orçamento = 1428 − 1060 = 368 px. Para `maxChars` em [150, 100, 60]: `fina = frasesInteiras(excerpt ||
  metaDescription, maxChars)`, `linhasFina = ceil(fina.length / 46)`; para `tam` em [104, 92, 80, 72]:
  `linhas = linhasDoTitulo(titulo, tam)`; aceita o primeiro com `linhas ≤ 3` e
  `ceil(linhas × tam × 1,02) + 20 + linhasFina × 48 ≤ 368`. Nada serviu: `ajustarTitulo(titulo, 952, 2, [72])` e
  `frasesInteiras(base, 60)`.
- Chips, selo RUMOR e TRAILER: mesmas regras do Modelo N (copiar a lógica, não reinventar).
- Seta "↖": novo ícone `SetaDiagonal` em `ui.tsx` (SVG 24×24, `path d="M5 5h11v2.5H9.3l9.9 9.9-1.8 1.8-9.9-9.9V16H5z"`,
  cor `corpo`), porque a JetBrains Mono latina não tem setas.
- Sem capa utilizável: não gera (status `skipped`, "sem capa"), igual ao feed. A frente C permite salvar com upload.

### Modelo ST-M — Story "moldura" (todos os outros modelos: C-artigo, C-review, C-guia, P1, P2, S)

Reaproveita o **slide 1 do feed** (a arte já aprovada) dentro de um quadro 9:16. Um modelo só, bem resolvido, em vez de
seis layouts novos.

```
y    0 ┌──────────────────────────────────────────────────────────┐
       │ fundo: o próprio slide 1, 1080×1920 cover, blur 40,      │
       │ + #060807 82% por cima + Grade 1080×1920                 │
  272  │ [logo56] RESPAWNOU.                    ◤NOVO NO FEED◢    │ Topo(y=272, tam=56); Chip à direita
       │                                                          │ (cheio se "NOVO NO FEED"; senão contorno
  344  │      ┌────────────────────────────────────────┐          │  com o rótulo da seção)
       │      │                                        │░         │ arte do feed 864×1080 (escala 0,8),
       │      │       SLIDE 1 DO FEED (4:5)            │░         │ x 108; borda 2 px #243022;
       │      │                                        │░         │ sombra dura: retângulo #3d5200
       │      │                                        │░         │ deslocado +12/+12 atrás
 1424  │      └────────────────────────────────────────┘░         │
 1448  │ ↖ TOQUE NO @ LÁ EM CIMA                                  │ igual ao ST-N
 1496  │ ┌──────────────── CTA DO MODELO  → ────────────────────┐ │ Chip cheio 952×84, mono 700 32
 1580  │ └──────────────────────────────────────────────────────┘ │
 1912  │███████████████████ faixa 8 px #c8ff2e ███████████████████│
```

- Origem do slide 1: se a linha `kind='feed'` da mesma matéria já tem `images`, usar o primeiro arquivo
  (`imagemDataUri(images[0], 864, 1080)` lê do `MEDIA_DIR`); senão gerar na hora com `gerarSlides(modelo, e)` e usar o
  `jpegs[0]` (convertido para data URI; sem gravar).
- Chip do topo: "NOVO NO FEED" (cheio) se a linha de feed da matéria está `published`; senão o rótulo da seção
  (`SOCIAL.rotuloSecao`), variante contorno.
- **Texto do CTA por modelo** (em `config.ts`, `SOCIAL.story.cta`), todos com até 40 caracteres:

| Modelo do feed | CTA do Story |
|---|---|
| N | MATÉRIA COMPLETA: LINK NA BIO |
| C-artigo | LISTA COMPLETA: LINK NA BIO |
| C-review | TODAS AS NOTAS: LINK NA BIO |
| C-guia | REQUISITOS COMPLETOS: LINK NA BIO |
| P1 | COMO RESGATAR: LINK NA BIO |
| P2 | TODAS AS OFERTAS: LINK NA BIO |
| S | CALENDÁRIO COMPLETO: LINK NA BIO |

### Prioridade e validade dos Stories (`SOCIAL.story.fila`)

| Modelo do feed | Story | Prioridade | Validade |
|---|---|---|---|
| P1 | ST-M | 50 | 24 h |
| S | ST-M | 40 | 24 h |
| P2 | ST-M | 35 | 24 h |
| C-review | ST-M | 30 | 24 h |
| C-guia, C-artigo | ST-M | 20 | 24 h |
| N | ST-N | 10 | **6 h** |

Padrões: **desligado**, 6 por dia, intervalo de 45 min, janela e modo de teste do feed.

## Arquivos afetados (frente A)

| Arquivo | O quê |
|---|---|
| `db/migrations/013_stories.sql` | SQL acima |
| `app/social/sql/social.sql` | estado final das tabelas (base dos outros sites) |
| `app/social/config.ts` | bloco `story` (padrões, fila, cta, textos "NOVO NO FEED" e "TOQUE NO @ LÁ EM CIMA") |
| `app/social/tipos.ts` | `type Formato = "feed" \| "story" \| "reel"`; `type ModeloStory = "ST-N" \| "ST-M"` |
| `app/social/render/imagem.server.ts` | caches de logo e grade por tamanho (bugs 1 e 2) |
| `app/social/render/render.server.ts` | `renderizar(elemento, { largura = 1080, altura = 1350 } = {})`; `salvar(jpeg, socialId, n, prefixo = "s")` (story usa prefixo `st`) |
| `app/social/render/ui.tsx` | `Tela` com props `largura`/`altura` (padrão 1080×1350) e grade do tamanho certo; ícone `SetaDiagonal`; peça `CtaStory` (seta + chip 952×84) |
| `app/social/render/modelos/story.tsx` (novo) | `ModeloStoryNoticia` (ST-N) e `ModeloStoryMoldura` (ST-M) |
| `app/social/render/slides.server.ts` | `gerarStory(modeloFeed, e, opts: { slide1?: string \| null; noFeed: boolean })` → `Buffer` |
| `app/social/server/instagram.server.ts` | `publicarStory({ contaId, token, imagem, aoCriarContainer })`; `esperar()` com intervalo/tentativas configuráveis |
| `app/social/server/fila.server.ts` | `kind` em todas as consultas; `enfileirar` cria feed **e** story; passo de story no `tick`; ações com `kind`; `limparArquivos` só em pastas de ano/mês (bug 3); `marcarPostadoAMao(id)` |
| `app/social/server/conta.server.ts` | `Conta` com `story_enabled`, `story_daily_limit`, `story_min_gap_minutes`; `salvarConfigStory()` |
| `app/routes/admin/instagram.tsx` | abas Feed/Stories, card "Stories", contadores, ações novas |
| `app/routes/admin/instagram-previa.ts` | `?formato=story` |

## Passos (frente A)

Cada passo termina com `npm run typecheck`; antes de qualquer push, `npm run build`.

**ST1 (P) Corrigir os três bugs latentes.** Caches por tamanho em `logoDataUri`/`gradeDataUri`; `limparArquivos`
ignorando pastas que não são `^\d{4}$`/`^\d{2}$`. Pronto quando: um script temporário chama `logoDataUri(128)` e depois
`logoDataUri(256)` e os data URIs têm tamanhos diferentes; `gradeDataUri(1080, 1920)` gera PNG 1080×1920 (conferir com
`sharp(...).metadata()`).

**ST2 (P) Migration 013.** Criar `db/migrations/013_stories.sql` (SQL acima) e atualizar `app/social/sql/social.sql`.
Colar o SQL no chat. Pronto quando: `npm run db:migrate` local aplica sem erro, `SHOW INDEX FROM social_posts` mostra
`uq_social_posts_kind` e não mostra `uq_social_posts_post`, e as linhas antigas ficaram com `kind = 'feed'`.

**ST3 (M) `kind` na fila do feed, sem mudar comportamento.** Em `fila.server.ts`, acrescentar `AND kind = 'feed'` em:
contagem de publicados hoje, último `published_at`, seleção do próximo, modo de teste, `enfileirarRecentes` (no
`NOT EXISTS`), `zerarFila`, `listarFila`, `listarPostados`, `resumo`, `recuperarPresas` (separar por kind). O
`INSERT IGNORE` de `enfileirar` grava `kind = 'feed'`. Pronto quando: `grep -n "network = 'instagram'"
app/social/server/fila.server.ts` só mostra linhas que também filtram `kind`; o painel continua igual.

**ST4 (M) Render 9:16.** `renderizar` com tamanho; `Tela` com `largura`/`altura`; `SetaDiagonal` e `CtaStory` em
`ui.tsx`; `modelos/story.tsx` com ST-N e ST-M exatamente como os mockups; `gerarStory` em `slides.server.ts`.
Pronto quando: a prévia do passo ST5 mostra as duas artes com o texto dentro de y 250–1580 e x 64–1016.

**ST5 (P) Prévia.** `instagram-previa.ts` aceita `?formato=story` (chave do cache inclui o formato) e devolve o JPEG
1080×1920. Pronto quando: `/admin/instagram/previa/<id>?formato=story` abre a arte de 5 matérias reais: notícia com
título curto, notícia com título de 100 caracteres, notícia com "rumor", uma review e uma promoção grátis.

**ST6 (M) Enfileirar e gerar.** `enfileirar(postId, dica, origem)` passa a inserir também a linha `kind='story'`
(`model` = modelo do feed, prioridade/validade de `SOCIAL.story.fila`), **se** `story_enabled = 1` ou `test_mode = 1`,
independente dos modelos ligados do feed. Cada inserção em seu próprio try/catch. `gerar(l)` decide pelo `kind`: story
chama `gerarStory` e grava `images = ["/media/social/AAAA/MM/st{id}-1-{hash}.jpg"]` e `caption = NULL`. Pronto quando:
publicar uma matéria local cria 2 linhas (`feed` e `story`) e `dry=1` não cria nenhuma.

**ST7 (M) Envio e `tick`.** `publicarStory` em `instagram.server.ts`. No `tick`, depois do passo do feed (mesma trava
`GET_LOCK`), um passo de story: modo de teste gera até 2 prévias de story; com `story_enabled`, usa `podeEnviar` (já é
pura) com `{ limiteDia: story_daily_limit, intervaloMin: story_min_gap_minutes, inicioHora/fimHora do feed }` e os
contadores só de `kind='story'`; envia 1 por `tick`. Erros com a mesma `classificar()`. Anti-duplicado: Story não tem
legenda, então em `recuperarPresas` um Story com contêiner `PUBLISHED` vira `published` sem `media_id` (não dá para
achar pela legenda). O `tick` devolve `{ acao: "feed: …; story: …" }`. Pronto quando: com a API simulada (como no
teste do módulo), 3 stories na fila e limite 2 resultam em 2 `published` e 1 `pending`, com intervalo respeitado.

**ST8 (P) Expiração e "no ar".** O `UPDATE ... SET status='expired'` já vale para os dois tipos (pela `expires_at`).
No painel, Story `published` mostra "NO AR ATÉ HH:MM" (`published_at + 24 h`, horário de Brasília) ou "SAIU DO AR".
Pronto quando: um Story publicado há 25 h aparece como "SAIU DO AR".

**ST9 (G) Painel.** Em `/admin/instagram`:
1. **Stats:** a linha de 3 vira 4 em `md` (`grid-cols-2 md:grid-cols-4`): "Hoje (feed)" `2/4`, "Stories hoje" `3/6`,
   "Na fila", "Token".
2. **Card "Stories"** (ao lado de "Automação"; em `lg` a grade passa a 3 colunas: Conta, Automação, Stories): checkbox
   "Stories ligados (1 story por matéria publicada)", campos "Stories por dia" (1–15) e "Intervalo (min)" (15–360),
   botão "Salvar" (`intent=salvar_story`). Texto de ajuda em `text-xs text-muted`: "Usam a mesma janela de horário e o
   mesmo modo de teste do feed. Pela API não dá para pôr figurinha de link: o Story manda para o link da bio."
3. **Abas da fila:** dois links no topo do card "Fila": `Feed (n)` e `Stories (n)` (`/admin/instagram?aba=stories`),
   estilo do site: mono 700 12 maiúsculo, aba ativa com `border-b-2 border-acc text-paper`, inativa `text-muted
   hover:text-paper`. O loader lê `aba` e lista o `kind` certo.
4. **Linha de Story:** miniatura **108×192** (9:16, `object-cover`, borda `border-line`, hover `border-acc`; clique
   abre o `Visualizador`, que já usa `max-h-[88vh]`), título, `Pill` de estado, modelo (`ST-N`/`ST-M`), validade
   ("expira 15:40") ou "NO AR ATÉ 14:32" (mono 700 12 `text-acc`) / "SAIU DO AR" (`text-muted`). Botões: "Postar
   agora", "Pular", "Gerar de novo", **"Baixar JPEG"** (`<a download>` para a imagem gerada; sem imagem ainda, para a
   prévia), **"Copiar link da matéria"** (copia `https://respawnou.com.br/<seção>/<slug>?utm_source=instagram&
   utm_medium=story`; o rótulo vira "COPIADO" por 2 s) e **"Marcar como postado à mão"** (com `confirm`: "Você postou
   este Story pelo app? O robô não vai postá-lo."; `intent=manual` → `status='published'`, `origin='manual'`,
   `published_at=UTC_TIMESTAMP()`).
5. Estados: vazio ("Nenhum Story na fila. Ligue os stories no card ao lado; cada matéria publicada gera um."), carregando
   (botões desabilitados, "Enviando…"), erro (linha `text-warn`, completo no `title`).
6. Ações novas no `action`: `salvar_story`, `manual`; as existentes (`postar`, `pular`, `novo`) já funcionam por `id`.
   Pronto quando: em 1440 e 375 px as duas abas funcionam, as miniaturas 9:16 não distorcem e todos os estados aparecem.

**ST10 (P) Produção em modo de teste.** Deploy; ligar "Stories" com o modo de teste ainda ligado; deixar 1 dia.
Conferir `curl -sI -A "facebookexternalhit/1.1" https://respawnou.com.br/media/social/<ano>/<mês>/st<arquivo>.jpg`
→ `200` e `image/jpeg`. Pronto quando: o dono aprovar as artes na aba Stories.

**ST11 (P) Primeiro Story real + docs.** "Postar agora" em 1 Story; conferir no app (nitidez, nada embaixo do nome da
conta nem do campo de mensagem). Depois deixar automático. Atualizar `docs/README.md`, `docs/decisoes.md`,
`docs/banco-de-dados.md` (migration 013), `docs/admin.md` e o status deste arquivo.

**Estimativa da frente A: G (≈ 1,5 dia).**

## Como copiar para outro site (stories)

Tudo o que muda por site está em `config.ts` (`SOCIAL.story`: padrões, fila, CTAs, textos) e nas cores/fontes que o
módulo já usa. Copiar `modelos/story.tsx` junto com o módulo; aplicar a migration equivalente à 013 (com o nome da
tabela de matérias do site); conferir o tipo da conta (Empresa).

---

# Frente C — Imagens próprias nos slides

## Contexto

Hoje `gerarSlides()` (`render/slides.server.ts`) usa a capa (`e.capa.src`) e, nos pontos do carrossel de artigo, a
imagem do trecho ou **recortes com zoom** da capa e das imagens do corpo (`variacoes`). Muitas vezes o recorte repete a
mesma foto, e notícia sem capa local é pulada. O dono quer, em cada item da fila, **trocar a imagem de um slide**,
**acrescentar slides de foto**, ver e gerar de novo.

## Decisões

- **Coluna nova `overrides JSON` em `social_posts`** (não dentro de `payload`, que guarda a `DicaSocial` das
  compilações e é lida como tal em `payloadDe`). Uma coluna separada evita misturar dado do robô com escolha do dono.
- **Arquivos em `MEDIA_DIR/social/uploads/AAAA/MM/u{socialId}-{hash8}.jpg`** (endereço `/media/social/uploads/...`),
  normalizados pelo `sharp`. A limpeza de 30 dias do `tick` não pode apagar upload de item ainda na fila: com o bug 3
  corrigido (ST1), `limparArquivos` ignora `uploads/`; os uploads ganham limpeza própria (apagar arquivo com mais de
  60 dias que não apareça no `overrides` de nenhuma linha `pending/preview/failed`).
- **"Slot" = slide com uma imagem principal.** Só esses aceitam troca; P2 e S (muitas miniaturas) não têm slot, só
  aceitam slide extra.
- **Troca do slide 1 = nova capa do post inteiro**: vale para a capa, para o fundo desfocado (review/guia), para P1 (arte
  do jogo) e para o Story da mesma matéria (que é marcado para gerar de novo, se não foi publicado).
- **Foco do recorte** em vez de editor de recorte: 6 opções (Automático = `sharp.strategy.attention`, Centro, Topo,
  Base, Esquerda, Direita). Simples de usar no celular e suficiente para 4:5 e 9:16.
- **Slide extra ("F", foto)**: foto em tela cheia com legenda curta opcional; entram **antes do CTA final** nos
  carrosséis e **depois do slide 1** nos modelos de imagem única (que viram carrossel). Total máximo: 10 slides (limite
  da API).
- Item `published` não aceita mudança (o Instagram não troca imagem de post publicado).

### Tipo (em `tipos.ts`)

```ts
export type Foco = "auto" | "centre" | "north" | "south" | "west" | "east";
export interface ImagemPropria { src: string; foco?: Foco }
export interface Overrides {
  /** Troca por número do slide (1 = capa do post). */
  trocas?: Record<string, ImagemPropria>;
  /** Slides de foto acrescentados, na ordem. */
  extras?: (ImagemPropria & { legenda?: string })[];
}
```

### Migration

```sql
-- 014: imagens próprias nos slides do Instagram (docs/instagram-stories-videos.md, frente C).
SET NAMES utf8mb4;
ALTER TABLE social_posts
  ADD COLUMN overrides JSON NULL AFTER payload;   -- {"trocas":{"1":{"src":"/media/social/uploads/...","foco":"auto"}},"extras":[...]}
INSERT INTO schema_migrations (version) VALUES ('014_social_uploads');
```
(Se a frente C for feita antes da A, numerar 013 e a dos stories 014: sempre o próximo número livre.)

## Direção visual

### Slide F (foto extra), 1080×1350

```
y    0 ┌──────────────────────────────────────────────────────────┐
       │ FOTO 1080×1350 (cover, foco escolhido)                   │
       │ gradiente topo #060807 85% → 0 (y 0–220)                 │
   48  │ [logo48] RESPAWNOU.                         03/07 ▸      │ Topo(tam=48) com contador
       │                                                          │
       │ gradiente base 0 (y 860) → #060807 95% (y 1350)          │
 ~1110 │ Legenda em Inter 600 40/54 #eef3ea, até 3 linhas,        │ ancorada embaixo (termina em y 1262);
       │ frase inteira (≤ 140 caracteres)                         │ sem legenda: nada
 1270  │ RESPAWNOU.COM.BR                         ARRASTA  →      │ `Rod` do carrossel (último slide: sem "ARRASTA")
 1342  │███████████████████ faixa 8 px ███████████████████████████│
```

### Painel: bloco "Imagens dos slides" (dentro de cada item da fila do feed)

- `<details>` fechado por padrão, resumo "IMAGENS DOS SLIDES" (mono 700 12, `text-acc`) + contagem "2 trocadas · 1
  extra" quando houver. Não aparece em itens `published`/`sending`.
- Dentro: linha com rolagem horizontal de **cartões de slot** (216 px de largura, espaço 12):
  - Miniatura 216×270 do slide atual (imagem gerada; sem geração, a prévia `?s=N`).
  - Rótulo mono 11: "SLIDE 1 · CAPA" / "SLIDE 3 · PONTO: <título do ponto, 1 linha>".
  - Selo: "ORIGINAL" (borda `line-soft`, `text-muted`) ou "SUA IMAGEM" (fundo `acc`, texto `ink`).
  - Botão "Trocar imagem" (label com `<input type="file" class="sr-only">`, aceita `image/jpeg,image/png,image/webp,
    image/avif`), `<select>` "Foco" (Automático, Centro, Topo, Base, Esquerda, Direita; muda na hora com
    `intent=img_foco`), link "Voltar à original" (só se trocada).
- Depois, "SLIDES EXTRAS (1/3)" (o máximo depende do modelo: `10 − slides base`): cada extra com miniatura 108×135,
  campo de legenda (≤ 140, contador `n/140`, salva ao sair do campo), `<select>` de foco e "Remover"; botão
  "+ Acrescentar imagem" (desabilitado no máximo, com `title` explicando).
- Botão principal no fim: **"Gerar de novo com as minhas imagens"** (`Button tone="primary"`), que regenera na hora e
  recarrega com as miniaturas novas.
- Modelos sem slot (P2, S): no lugar dos cartões, `text-sm text-muted`: "Este modelo usa várias miniaturas; dá para
  acrescentar slides de foto."
- Estados: enviando ("Enviando…", controles desabilitados), erro (`Notice tone="warn"` no topo com a mensagem do
  servidor), aviso de baixa resolução (`Notice` amarelo: "A imagem tem 820 px de largura; no Instagram pode ficar
  borrada."), sucesso (`Notice`: "Imagem trocada. Clique em Gerar de novo para ver o resultado.").

## Validação do upload (servidor)

- Tipos: `image/jpeg`, `image/png`, `image/webp`, `image/avif` (GIF fora: animação não serve). Até **10 MB** (o mesmo
  limite de `upload.ts`).
- `sharp(buf).metadata()` tem de funcionar; menor lado **≥ 600 px** (senão recusa com mensagem); largura < 1080 gera o
  aviso de baixa resolução.
- Normalizar: `.rotate()` (orientação EXIF) → `.resize({ width: 2160, height: 2160, fit: "inside",
  withoutEnlargement: true })` → `.jpeg({ quality: 88, mozjpeg: true })` (o `sharp` já remove os metadados).
- `src` aceito no `overrides` só se casar com `^/media/social/uploads/\d{4}/\d{2}/[\w.-]+\.jpg$` (nada de URL
  externa nem `..`). `foco` só da lista. `legenda` cortada em 140. Número do slide só entre os slots do modelo.

## Como o gerador passa a usar os overrides

- `core/overrides.ts` (novo, puro, testável): `lerOverrides(json): Overrides` (sanitiza), `slotsDoModelo(modelo,
  nPontos): { slide: number; rotulo: string }[]` (N → [1]; C-artigo → [1, 2..n+1]; C-review → [1]; C-guia → [1];
  P1 → [1]; P2/S → []), `maxExtras(modelo, nPontos)` e `posicaoDosExtras(modelo)`.
- `imagemDataUri(src, w, h, opts)` ganha `foco?: Foco`: `"auto"` → `position: sharp.strategy.attention`; os outros
  viram `position` direto (e a âncora do zoom quando houver zoom).
- `gerarSlides(modelo, e, ov?: Overrides)`: se `ov.trocas["1"]` existir, substitui `e.capa.src` (e a arte do P1) antes
  de tudo; nos pontos do C-artigo, `ov.trocas[String(i + 2)]` substitui `imagens[i]` (sem zoom: a imagem do dono entra
  inteira, só recortada). Extras: `imagemDataUri(src, 1080, 1350, { foco })` → slides `F`, inseridos na posição certa;
  o total do contador (`NN/TT`) passa a contar os extras (`slidesCarrossel` recebe `extras`).
- `fila.server.ts`: `gerar(l)` lê `l.overrides` e passa adiante. Nova `gerarAgora(id)`: regenera na hora sem mudar o
  status, exceto `skipped` por "sem capa", que volta a `preview` (modo de teste) ou `pending`. Trocar o slide 1 também
  zera `images` do Story da mesma matéria (se não publicado).
- Prévia (`instagram-previa.ts`): lê o `overrides` da linha da matéria; o cache de 5 min passa a incluir
  `rendered_at`/um hash do `overrides` na chave (senão a prévia mostra a imagem velha).

## Arquivos afetados (frente C)

`db/migrations/014_social_uploads.sql` · `app/social/sql/social.sql` · `app/social/tipos.ts` ·
`app/social/core/overrides.ts` (novo) · `app/social/render/imagem.server.ts` · `app/social/render/slides.server.ts` ·
`app/social/render/modelos/carrossel.tsx` (slide F e total com extras) · `app/social/server/fila.server.ts` ·
`app/social/server/uploads.server.ts` (novo: validar, normalizar, gravar, limpar) · `app/routes/admin/instagram.tsx` ·
`app/routes/admin/instagram-previa.ts`.

## Passos (frente C)

**UP1 (P) Migration 014** (SQL acima; colar no chat). Pronto: `DESCRIBE social_posts` mostra `overrides`.

**UP2 (P) `core/overrides.ts` + teste.** Funções puras acima. Teste com `node --test` (arquivo temporário
`scripts/tmp-overrides.test.ts`, rodado com `node --experimental-strip-types --test`, apagado depois): src externo é
descartado; `..` é descartado; slide fora dos slots é descartado; 12 extras viram o máximo permitido; legenda de 200
vira 140. Pronto: todos os casos passam.

**UP3 (M) `uploads.server.ts`.** `salvarUpload(socialId, file): { src, largura, altura, aviso? }` com a validação e a
normalização acima; `limparUploads()` (60 dias, não referenciados). Pronto: enviar um PNG de 3000×2000 grava um JPEG de
2160×1440; um GIF e uma imagem de 400×400 são recusados com mensagem clara.

**UP4 (M) Gerador.** `foco` em `imagemDataUri`; `gerarSlides(modelo, e, ov)`; slide F em `carrossel.tsx`; contador
com extras; Modelo N com extras vira carrossel `[N, F…]`. Pronto: prévia de um artigo com o slide 3 trocado e 2 extras
mostra 9 slides, contador `NN/09` correto, extras antes do CTA.

**UP5 (P) Fila.** `gerar` com overrides; `gerarAgora(id)`; reset do Story ao trocar o slide 1; resgate de `skipped`
"sem capa". Pronto: uma notícia pulada por "sem capa" volta à fila depois de receber uma capa por upload.

**UP6 (G→M) Painel.** Bloco "Imagens dos slides" como descrito; ações `img_trocar` (multipart: `id`, `slide`, `file`,
`foco`), `img_foco`, `img_remover`, `img_extra` (multipart), `img_extra_legenda`, `img_extra_foco`,
`img_extra_remover`, `img_aplicar` (chama `gerarAgora` com a mesma corrida de 25 s do `rodar`). O `Form` dos uploads
usa `encType="multipart/form-data"`; o `action` atual já usa `request.formData()`, que aceita arquivo. Pronto: em 1440
e 375 px, trocar, mudar foco, acrescentar, remover e gerar de novo funcionam; itens publicados não mostram o bloco.

**UP7 (P) Prévia com overrides** e chave de cache nova. Pronto: depois de trocar uma imagem, a prévia mostra a nova sem
esperar 5 min.

**UP8 (P) Docs.** `instagram.md` (seção "Imagens próprias" com link para cá), `admin.md`, `banco-de-dados.md`,
`README.md`, `decisoes.md`.

**Estimativa da frente C: M (≈ 1 dia).**

---

# Frente B — Vídeos curtos (Reels, YouTube Shorts, TikTok)

## Contexto e restrições do dono

- Sem rosto; **voz ElevenLabs** (o dono tem conta). Nenhuma outra API paga; texto só com **Gemini grátis**.
- Site na **Hostinger Business** (hospedagem compartilhada com app Node.js). Lá **não contar com `ffmpeg`**: não vem
  instalado, o pacote `ffmpeg-static` acrescenta ~70 MB ao deploy, e um processo de 1 a 3 min de CPU cheia divide a
  máquina com o site e o robô (a hospedagem compartilhada limita CPU/memória por conta e pode matar o processo).
- **Decisão: renderizar no GitHub Actions** (como o robô de notícias do animeprofile antigo,
  `animeprofile-old/.github/workflows/ai-news.yml`): o repositório é público, então os minutos são grátis; o
  `ubuntu-latest` instala `ffmpeg` com `apt` em ~30 s. O worker **só fala com a API do site** (segredo próprio), não
  com o banco.
- O site continua dono de tudo: escolhe a matéria, escreve o roteiro (Gemini, que já está configurado lá), guarda o
  vídeo em `MEDIA_DIR/video/` e publica nas redes. O worker só faz voz + montagem.
- Opcional (diagnóstico, não bloqueia): se um dia quiser conferir, `ffmpeg -version` pelo SSH da Hostinger.

## Formato do vídeo

- **1080×1920, 30 fps, 25 a 40 s** (alvo 32 s), H.264 High `yuv420p`, `crf 21`, `preset medium`, AAC 128 kbps
  44,1 kHz, `-movflags +faststart`. Tamanho esperado 6 a 14 MB. Serve para Reels, Shorts e TikTok sem mudar nada.
- **Estrutura:**
  1. **Abertura (0 a ~3 s, o "gancho")**: primeira imagem com zoom, cartão de título por cima (chip da seção + título
     em Anton). A voz lê o gancho. Sem legenda palavra a palavra aqui (o título já está na tela).
  2. **Cenas (3 a 5)**: uma imagem por cena (da matéria, upload do dono ou arte do post), movimento Ken Burns, legenda
     palavra por palavra. Corte seco sincronizado com o início da fala de cada cena (sem transições enfeitadas).
  3. **Fechamento (~3 s)**: cartão "SIGA" com a logo e o CTA. Voz: frase fixa do `config` (padrão: "Matéria completa no
     Respawnou. O link está no perfil.").
- **Música: nenhuma por padrão** (pela API não dá para usar o catálogo licenciado do Instagram, e música de terceiros
  derruba vídeo por direito autoral). Opção futura: trilha própria isenta de direitos (pergunta em aberto 6). No TikTok
  manual, o dono pode pôr um som em alta pelo app, baixinho.
- **Roteiro (Gemini, 1 pedido por vídeo)**, gerado pelo site:
  - Entrada: título, linha fina, corpo em texto (sem links), tipo da matéria, dados da review/guia/grátis quando
    houver, e a lista numerada das imagens disponíveis (com o texto alternativo/legenda de cada uma).
  - Esquema JSON: `{ "gancho": string (≤ 90 caracteres), "cenas": [{ "fala": string (≤ 170), "imagem": number }]
    (3 a 5), "titulo_curto": string (≤ 60) }`.
  - Regras do prompt: pt-BR falado, frases curtas (≤ 18 palavras), **nada além do que está no texto**, rumor dito como
    rumor ("segundo rumores"), sem "fala, galera", sem emoji, sem perguntas no meio, números escritos como se falam
    quando forem preço/data ("oitenta e nove e noventa"), nomes de jogos como no texto, total de gancho + cenas entre
    **60 e 95 palavras** (≈ 25 a 38 s em fala compassada).
  - Validação no código: tamanhos, 3–5 cenas, índices de imagem válidos, soma de palavras; falhou → status `falhou`
    com "roteiro inválido" e botão "Gerar outro roteiro". Nunca mais de 1 tentativa automática.
- **Voz (ElevenLabs)**, no worker:
  - `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps` (cabeçalho `xi-api-key`) com o texto
    inteiro (gancho + cenas + fechamento, separados por ponto e espaço; sem tags de pausa), `model_id`
    `eleven_multilingual_v2` (melhor pt-BR; alternativa mais barata `eleven_flash_v2_5`), `voice_settings`:
    `stability 0.55`, `similarity_boost 0.8`, `style 0`, `use_speaker_boost true`, `speed 0.95` ("compassada"),
    `output_format mp3_44100_128`. Tudo em `config`/painel.
  - A resposta traz o áudio em base64 e o **alinhamento por caractere** (início/fim de cada letra). Daí saem as
    palavras com tempo (sem precisar transcrever) e o início de cada cena (contando palavras de cada parte).
  - Uma chamada por vídeo; "Refazer voz" gasta créditos de novo (o painel avisa).
- **Imagens das cenas:** recorte 9:16 a partir das imagens da matéria com `sharp` em **2160×3840** (o dobro, para o zoom
  não serrilhar), `position: sharp.strategy.attention` (o sharp acha a região mais interessante) ou o `foco` escolhido
  pelo dono. Cenas de "arte" (`imagem` = arte do post, ex.: o quadro de notas da review) usam a moldura do ST-M
  renderizada pelo satori, com zoom bem leve (1,00 → 1,04) para o texto não tremer.

### Direção visual do vídeo

**Clima:** noticiário de games em "Central de Comando": imagem em movimento ocupando a tela, legenda grossa em Anton com
a palavra falada acendendo em verde-limão, marca pequena no topo. **Evitar:** transições de PowerPoint, emoji, texto
pequeno, legenda atrás dos botões do app, logo grande.

**Zonas seguras (Reels/Shorts/TikTok, canvas 1080×1920):** topo 0–220 (nome/abas do app), base 1500–1920 (legenda e
nome do perfil), lateral direita x 950–1080 entre y 1000 e 1800 (curtir/comentar/compartilhar). Texto importante em
x 64–916 e y 220–1500.

| Camada | Posição | Estilo |
|---|---|---|
| Imagem da cena | tela cheia 1080×1920 | Ken Burns (abaixo); gradiente topo `#060807` 70% → 0 (y 0–360) e base 0 → 85% (y 1100–1920) |
| Marca (o vídeo todo, menos o fechamento) | x 64, y 236, altura 56 | logo 56 + "RESPAWNOU." Anton 32 (ponto em `#c8ff2e`); à direita (até x 916) chip da seção mono 700 22 |
| Cartão de abertura (0 até o fim do gancho) | y 1000–1480 | chip da seção (48 px) em y 1000; título Anton 96/84/72 até 4 linhas, `#eef3ea`, palavra-chave `#c8ff2e`, largura 852 |
| Legenda palavra por palavra (só nas cenas) | caixa x 64–916, base em y 1440 | Anton 84 maiúsculo, `#eef3ea`, contorno 6 px `#060807`, palavra atual `#c8ff2e`; "páginas" de até 4 palavras ou 30 caracteres, no máximo 2 linhas, troca de página em pontuação |
| Fechamento (últimos ~3 s) | tela cheia | fundo `#060807` + grade + brilho radial `#c8ff2e` 18%; logo 200×200 em y 420; "SIGA" Anton 120 `#eef3ea` em y 700; "@RESPAWNOU.COM.BR" Anton 72 `#c8ff2e` em y 840; chip 852×84 "MATÉRIA COMPLETA: LINK NO PERFIL" em y 1000 |

**Movimentos (alternar por cena, nesta ordem):** 1) zoom in no centro 1,00→1,10; 2) panorâmica da esquerda para a
direita com zoom fixo 1,12; 3) zoom out 1,10→1,00; 4) panorâmica de cima para baixo com zoom 1,12. Com o `zoompan` do
ffmpeg sobre a imagem 2160×3840 (`s=1080x1920`, `fps=30`, `d=1` sobre entrada em `-loop 1 -framerate 30 -t <duração>`).

**Legenda em ASS** (gerada a partir do alinhamento): `PlayResX 1080`, `PlayResY 1920`, estilo `Fontname Anton,
Fontsize 84, PrimaryColour &H00EAF3EE, OutlineColour &H00070806, BorderStyle 1, Outline 6, Shadow 0, Alignment 2,
MarginL 64, MarginR 164, MarginV 480`. Um evento `Dialogue` por palavra, mostrando a página inteira com a palavra atual
em `{\c&H2EFFC8&}` (verde-limão em BGR). Queimar com `subtitles=legenda.ass:fontsdir=<pasta das fontes>`. O libass
precisa de **TTF**: acrescentar `Anton-Regular.ttf` (OFL, do Google Fonts) em `app/video/fonts/` (os `.woff` do
`app/social/fonts` servem ao satori, não garantidamente ao libass).

**Áudio:** só a narração, `loudnorm=I=-14:TP=-1.5:LRA=11`; o vídeo termina 0,6 s depois do fim da fala.

**Capa (thumbnail):** o quadro do cartão de abertura em JPEG 1080×1920 (título dentro da área central, que a grade do
perfil recorta em 3:4).

## Custos estimados (conferir os preços na página da ElevenLabs na hora de contratar)

| Item | Custo |
|---|---|
| Gemini (roteiro) | grátis; 1 pedido por vídeo (a cota grátis é por dia e por modelo; o robô já usa parte) |
| GitHub Actions | grátis (repositório público); ~3 a 5 min por vídeo |
| Hostinger | já pago; ~10 MB por vídeo em `MEDIA_DIR/video`, apagados 30 dias depois de publicados em todas as redes ligadas |
| ElevenLabs | por caractere. Vídeo de ~32 s ≈ 85 palavras ≈ **550 caracteres** (com o fechamento). `eleven_multilingual_v2` = 1 crédito/caractere → ~550 créditos; `eleven_flash_v2_5` = 0,5 → ~275 |

Plano grátis da ElevenLabs (10 mil créditos/mês) **não serve**: não tem licença comercial (o site tem anúncios) e não
deixa a API usar vozes da biblioteca (foi o motivo do rollback de 2026-11-01). **Starter (US$ 5/mês, 30 mil
créditos, licença comercial):** com `multilingual_v2`, ~54 vídeos/mês (≈ US$ 0,09 por vídeo); com `flash_v2_5`, ~109.
**Recomendação:** Starter + 1 vídeo por dia com `multilingual_v2` (~17 mil créditos/mês), sobra para refazer voz.

## Banco (migration da frente B)

```sql
-- 015: vídeos curtos (docs/instagram-stories-videos.md, frente B). Fases 1 a 3.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS video_jobs (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id      INT UNSIGNED NOT NULL,
  status       ENUM('aguardando','aprovado','gerando','pronto','falhou','descartado') NOT NULL DEFAULT 'aguardando',
  origin       ENUM('auto','manual') NOT NULL DEFAULT 'auto',
  script       JSON         NULL,                 -- {"gancho":"...","cenas":[{"fala":"...","imagem":0}],"titulo_curto":"..."}
  images       JSON         NULL,                 -- ["/media/...", "arte:1", ...] disponíveis para as cenas
  focus        JSON         NULL,                 -- {"0":"auto","2":"north"} foco por imagem
  voice_id     VARCHAR(40)  NULL,
  voice_model  VARCHAR(40)  NULL,
  chars        INT UNSIGNED NULL,                 -- caracteres enviados à ElevenLabs (custo)
  duration_s   DECIMAL(5,1) NULL,
  video        VARCHAR(300) NULL,                 -- /media/video/2026/11/v12-ab12cd34.mp4
  cover        VARCHAR(300) NULL,                 -- /media/video/2026/11/v12-ab12cd34.jpg
  captions     JSON         NULL,                 -- {"instagram":"...","youtube":{"title":"...","description":"..."},"tiktok":"..."}
  youtube_id   VARCHAR(20)  NULL,
  youtube_status VARCHAR(20) NULL,                -- private|public|failed
  error        VARCHAR(1000) NULL,
  attempts     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_at    DATETIME     NULL,                 -- UTC
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at  DATETIME     NULL,                 -- UTC
  rendered_at  DATETIME     NULL,                 -- UTC
  UNIQUE KEY uq_video_jobs_post (post_id),
  KEY ix_video_jobs_status (status, created_at),
  CONSTRAINT fk_video_jobs_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reels (fase 2): limite próprio, mesma janela e modo de teste do feed.
ALTER TABLE social_accounts
  ADD COLUMN reel_enabled     TINYINT(1)       NOT NULL DEFAULT 0 AFTER story_min_gap_minutes,
  ADD COLUMN reel_daily_limit TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER reel_enabled;

-- YouTube (fase 3) e TikTok (fase 4, só se usar a API): tokens criptografados como o do Instagram.
INSERT IGNORE INTO social_accounts (network) VALUES ('youtube'), ('tiktok');

INSERT INTO schema_migrations (version) VALUES ('015_videos');
```
Configuração do vídeo na tabela `settings`, chave `video_config` (sem migration): `{ enabled, perDay, autoApprove,
voiceId, model, speed, hour }`. O Reel usa uma linha `social_posts` com `kind='reel'` e `payload = {"videoJobId": N}`.

## Fluxo (fase 1: gerar e baixar; aprovação em ~2 min por dia)

1. **Escolha (site, 1 vez por dia, às 8h de Brasília, dentro do job de coleta que já roda a cada 30 min):** se
   `enabled` e ainda não há job criado hoje, pegar a melhor matéria das últimas 36 h que tenha **capa + pelo menos 2
   imagens utilizáveis** (capa, corpo ou upload), nesta ordem de tipo: consenso da crítica (C-review) > jogo grátis (P1)
   > lançamentos da semana (S) > artigo com ≥ 3 pontos > notícia; empate: mais visitas nas últimas 24 h
   (`visit_pages`), depois a mais nova. Notícia com "rumor" só se não houver outra. Criar o `video_job` e gerar o
   roteiro (Gemini) → `aguardando`.
2. **Manual:** botão "Fazer vídeo desta matéria" no card de `/admin/materias/:id` (origem `manual`), a qualquer hora.
3. **Aprovação (dono, 2 min):** em `/admin/videos`, lê o roteiro, ajusta uma palavra se quiser, troca a imagem de uma
   cena (lista de miniaturas) e clica **"Aprovar e gerar"**. Com `autoApprove` ligado (desligado por padrão), o passo 1
   já deixa `aprovado`.
4. **Disparo:** ao aprovar, o site chama a API do GitHub (`POST /repos/<dono>/respawnou/actions/workflows/video.yml/
   dispatches`, `ref: main`) com o token `GITHUB_DISPATCH_TOKEN` (token fino só com "Actions: write" neste repositório,
   no hPanel). Plano B: o workflow também tem `schedule` a cada 3 h (o agendamento do GitHub atrasa, mas pega o que
   sobrou).
5. **Worker (GitHub Actions):** `GET /api/video/proximo` (cabeçalho `Authorization: Bearer VIDEO_WORKER_SECRET`) → o
   site marca `gerando` e devolve roteiro, URLs absolutas das imagens, foco, voz e configurações. O worker baixa as
   imagens, chama a ElevenLabs, renderiza os quadros (satori, importando `app/social/render` e `app/video/render`),
   monta com ffmpeg e envia `POST /api/video/:id/pronto` (multipart: `video` mp4, `cover` jpg, `chars`, `duracao`).
   Erro: `POST /api/video/:id/falhou` com a mensagem. O site grava em `MEDIA_DIR/video/AAAA/MM/v{id}-{hash8}.mp4|jpg`
   e marca `pronto`.
6. **Uso:** no painel, o dono assiste, baixa o MP4 e copia as legendas de cada rede (Instagram, YouTube, TikTok) para
   postar pelo celular quando quiser. Fases 2 a 4 automatizam.

`gerando` preso há mais de 20 min volta para `aprovado` (o worker caiu); depois de 2 tentativas, `falhou`.

### Legendas por rede (montadas por código, sem Gemini; `app/video/legendas.ts`, puro)
- **Instagram (Reels):** a mesma `montarLegenda()` do feed com o modelo da matéria (gancho, contexto, pergunta, CTA
  "link na bio", até 3 hashtags).
- **YouTube:** título = `titulo_curto` + " #Shorts" (≤ 100 caracteres); descrição = linha fina + "Matéria completa:
  <url da matéria>?utm_source=youtube&utm_medium=shorts" + "Narração gerada por voz sintética." + as hashtags.
- **TikTok:** gancho + "Matéria completa no link do perfil." + até 4 hashtags (as 3 do Instagram + `#gamesbr`).

## Painel `/admin/videos` (direção visual)

Reusar `app/components/admin-ui.tsx` (`PageTitle`, `Card`, `Stat`, `Pill`, `Button`, `Field`, `inputCls`, `Notice`,
`when`), igual ao `/admin/instagram`. Item "Vídeos" no menu, depois de "Instagram".

**Hierarquia:** 1º o vídeo do dia (roteiro para aprovar ou player); 2º os botões de aprovar/baixar/copiar; 3º
configuração e histórico.

1. `PageTitle` "Vídeos" com chip de estado à direita ("DESLIGADO" `text-muted`, "AGUARDANDO VOCÊ" `text-warn`,
   "LIGADO" `text-acc`).
2. Linha de 3 `Stat`: "Este mês" (vídeos prontos), "Créditos usados" (`chars` do mês / cota configurada, ex.
   `9.350/30.000`, `tone="warn"` acima de 80%), "Aguardando aprovação".
3. **Card do job** (um por job, mais novo primeiro; os 10 últimos). Grade em `lg`: coluna esquerda 270 px, direita o
   resto; no celular, empilhado.
   - Esquerda: `aguardando`/`aprovado`: a capa da matéria em 270×480 (`object-cover`) com o título da matéria por
     cima em `bg-ink/80`; `gerando`: o mesmo com faixa "GERANDO… 2 A 5 MIN" (mono 700 12, fundo `acc`, texto `ink`,
     `animate-pulse`); `pronto`: `<video controls playsInline preload="metadata" poster={cover}>` 270×480;
     `falhou`: quadro `border-warn` com o erro.
   - Direita, `aguardando`: campo "Gancho" (input, contador `n/90`, vermelho acima); para cada cena, uma linha com
     miniatura 64×114 da imagem escolhida (clicar abre uma faixa com as miniaturas disponíveis para trocar; a escolhida
     com borda `acc` 2 px), `textarea` da fala (2 linhas, contador `n/170`) e `select` de foco; abaixo, o fechamento
     fixo em `text-muted`. Linha de estimativa em mono 12: "≈ 33 s · 548 caracteres · ~US$ 0,09". Botões: **"Aprovar
     e gerar"** (`tone="primary"`), "Salvar roteiro", "Gerar outro roteiro (usa 1 pedido do Gemini)", "Descartar"
     (`confirm`).
   - Direita, `pronto`: "Baixar MP4" (primário, `<a download>`), "Baixar capa", três blocos de legenda (Instagram,
     YouTube título+descrição, TikTok) em `<pre>` com "Copiar" (vira "COPIADO" por 2 s); "Refazer vídeo (gasta ~550
     créditos)" com `confirm`; nas fases seguintes, "Publicar Reel", "Enviar ao YouTube" e os links do que já saiu.
   - Vazio: "Nenhum vídeo ainda. O próximo é escolhido amanhã às 8h, ou abra uma matéria e clique em 'Fazer vídeo
     desta matéria'."
4. **Card "Configuração"** (fechado num `<details>` no celular): ligado; vídeos por dia (0–3, padrão 1); hora da escolha
   (padrão 8); aprovar sozinho (desligado); voz (`voice_id`, com o nome da voz ao lado quando a API responder); modelo
   (`multilingual_v2` / `flash_v2_5`); velocidade (0,85–1,10, padrão 0,95); cota mensal de créditos (padrão 30.000).
   Sem `ELEVENLABS_API_KEY` no GitHub não há como o site saber: mostrar o último erro do worker se houver.

## Arquivos afetados (frente B, fase 1)

| Arquivo | O quê |
|---|---|
| `db/migrations/015_videos.sql` | SQL acima |
| `app/video/config.ts` (E) | voz padrão, modelo, velocidade, fechamento falado, CTA do cartão, tamanhos/cores da legenda (derivados de `COR`), duração alvo, ordem de tipos para escolher |
| `app/video/db.ts` (E) | ponte com o banco (cópia de `app/social/db.ts`) |
| `app/video/roteiro.server.ts` (G) | prompt, esquema e validação do roteiro (usa o `generateJson` do robô) |
| `app/video/fila.server.ts` (G) | `escolherDoDia`, `criarJob`, `salvarRoteiro`, `aprovar`, `proximo`, `concluir`, `falhar`, `descartar`, `recuperarPresos`, `limparArquivos` |
| `app/video/github.server.ts` (G) | disparo do workflow (`GITHUB_DISPATCH_TOKEN`, `GITHUB_REPO`) |
| `app/video/legendas.ts` (G, puro) | legendas por rede |
| `app/video/render/quadros.tsx` (G) | marca, cartão de abertura, fechamento (satori, PNG com transparência) reaproveitando `app/social/render/ui.tsx` |
| `app/video/fonts/Anton-Regular.ttf` + `OFL.txt` | fonte da legenda (libass) |
| `app/social/render/render.server.ts` | `renderizarPng(elemento, { largura, altura })` (transparência) além do JPEG |
| `app/social/render/imagem.server.ts` | em modo remoto (`SOCIAL_MIDIA_REMOTA=1`, usado no worker), `/media/...` é baixado de `SOCIAL.baseUrl` em vez de lido do disco |
| `app/routes/api/video.ts` | `GET proximo`, `POST :id/pronto` (multipart, até 60 MB), `POST :id/falhou`; segredo `VIDEO_WORKER_SECRET` comparado com `timingSafeEqual` |
| `app/routes/admin/videos.tsx` | painel |
| `app/routes/admin/post-edit.tsx` | botão "Fazer vídeo desta matéria" |
| `app/routes.ts`, `app/components/admin-ui.tsx` | rotas e item de menu |
| `app/lib/robot/robot.server.ts` | no fim de `collect()`, `escolherDoDia()` em try/catch (como o `tickSocial`) |
| `scripts/video/worker.ts` | o worker (roda com `npx tsx`) |
| `scripts/video/ass.ts` (puro) | alinhamento → palavras → páginas → arquivo ASS |
| `scripts/video/ffmpeg.ts` | monta os argumentos/filtergraph e roda o `ffmpeg` |
| `.github/workflows/video.yml` | `workflow_dispatch` + `schedule: "17 */3 * * *"`; `concurrency: video`; `timeout-minutes: 15`; `actions/checkout`, `actions/setup-node` (Node 22), `npm ci`, `sudo apt-get install -y ffmpeg`, `npx tsx scripts/video/worker.ts`; env `SITE_URL`, `VIDEO_WORKER_SECRET`, `ELEVENLABS_API_KEY` (secrets), `SOCIAL_MIDIA_REMOTA=1` |

Variáveis novas: no **hPanel** `VIDEO_WORKER_SECRET` (64 hex, igual ao do GitHub), `GITHUB_DISPATCH_TOKEN`,
`GITHUB_REPO` (`<dono>/respawnou`); nos **secrets do GitHub** `VIDEO_WORKER_SECRET` e `ELEVENLABS_API_KEY`. Nunca no
chat nem no código (o repositório é público).

## Passos (frente B)

### Fase 1 — gerar e baixar (G, 2 a 3 dias)

**V1 (P) Recuperar o que foi engavetado.** No `animeprofile-old`, `git show --stat dd584c699 b62aa84d1 c200329cd
996367cd3` e ler o prompt do roteiro, a chamada à ElevenLabs e o workflow. Anotar em 5 linhas, neste arquivo, o que foi
reaproveitado. Pronto: anotação feita (nada é copiado sem adaptar: lá era Supabase/Chrome, aqui é MySQL/satori).

**V2 (P) Migration 015** (colar no chat). Pronto: `DESCRIBE video_jobs` e as colunas `reel_*` existem.

**V3 (M) Roteiro.** `app/video/roteiro.server.ts` + `config.ts` + `db.ts`. Script temporário gera o roteiro de 3
matérias reais (notícia, review, grátis) sem gravar. Pronto: os 3 passam na validação, 60–95 palavras, nenhuma
informação que não esteja no texto (conferir lendo).

**V4 (M) Fila do site e API do worker.** `fila.server.ts`, `github.server.ts`, `app/routes/api/video.ts`, rotas. Pronto:
com `curl` local e o segredo, `GET /api/video/proximo` devolve o job aprovado e marca `gerando`; sem segredo, `401`;
`POST pronto` com um MP4 de teste grava em `MEDIA_DIR/video/...` e marca `pronto`.

**V5 (P) Quadros.** `renderizarPng` e `app/video/render/quadros.tsx` (marca, abertura, fechamento) conforme a tabela
visual. Pronto: os 3 PNG 1080×1920 abertos lado a lado com a tabela; transparência fora dos elementos.

**V6 (M) Legenda ASS.** `scripts/video/ass.ts` puro + teste com um alinhamento falso (frase de 12 palavras). Pronto:
páginas de até 4 palavras/30 caracteres, uma palavra em verde por evento, tempos sem sobreposição.

**V7 (G) Montagem.** `scripts/video/ffmpeg.ts` e `worker.ts` com voz **falsa** primeiro (`say`/silêncio de 30 s +
alinhamento falso) para não gastar créditos. Rodar local (ffmpeg instalado no Windows ou WSL) e no Actions por
`workflow_dispatch`. Pronto: MP4 1080×1920, 30 fps, H.264 `yuv420p`, AAC, `faststart` (conferir com `ffprobe`),
movimentos alternados, legenda dentro de x 64–916 / y ≤ 1500.

**V8 (P) Voz de verdade.** Chamada `with-timestamps`, palavras a partir do alinhamento, cortes de cena pela contagem
de palavras. Gastar 1 vídeo (~550 créditos). Pronto: a palavra acesa bate com a fala (atraso ≤ 0,1 s a olho), corte de
cena no início da frase.

**V9 (M) Painel `/admin/videos`** como descrito (estados `aguardando`, `aprovado`, `gerando`, `pronto`, `falhou`,
vazio), em 1440 e 375 px. Pronto: aprovar dispara o workflow e, em até 5 min, o player aparece.

**V10 (P) Escolha automática do dia** no fim de `collect()` e botão em `/admin/materias/:id`. Pronto: com `enabled`,
às 8h nasce 1 job `aguardando`; não nasce o segundo no mesmo dia.

**V11 (P) Limpeza.** Arquivos de `MEDIA_DIR/video` de jobs `descartado` em 7 dias; de `pronto` em 30 dias depois da
última publicação (ou 45 dias se nunca publicado). Pronto: script temporário com datas forjadas apaga só o certo.

**V12 (P) Produção e docs.** Deploy; dono cadastra variáveis e secrets (pendências); 3 dias de vídeos aprovados à
mão e postados pelo celular. Atualizar docs. Pronto: 3 vídeos assistidos pelo dono no celular, legenda legível.

### Fase 2 — Reels automático (M)

**V13 (P)** `publicarReel({ contaId, token, video, capa, legenda })` em `instagram.server.ts`: `POST /{ig-id}/media`
com `media_type=REELS`, `video_url`, `caption`, `share_to_feed=true`, `cover_url`; `esperar()` a cada **10 s, até 60
vezes** (vídeo demora a processar); `media_publish`; `permalink`. Mesma tabela de erros.

**V14 (M)** Job `pronto` + `reel_enabled` → linha `social_posts` `kind='reel'`, prioridade 60, validade 48 h. Passo de
reel no `tick` (limite `reel_daily_limit`, padrão 1; janela e modo de teste do feed). Botão "Publicar Reel" no card do
job. Pronto: com a API simulada, o Reel sai 1 vez e o job mostra o link.

**V15 (P)** Card "Reels" no `/admin/instagram` (ligado, por dia) e aba "Reels" na fila (miniatura 108×192 da capa).

**V16 (P)** Conferir que a CDN entrega o MP4 ao robô da Meta: `curl -sI -A "facebookexternalhit/1.1"
https://respawnou.com.br/media/video/<arquivo>.mp4` → `200`, `video/mp4`, `Accept-Ranges`. Primeiro Reel real com o
dono olhando.

### Fase 3 — YouTube Shorts (M + dono)

- **Conta e app (dono, ~40 min, num dia de 3 h):** criar o canal (marca "Respawnou", sem rosto); no Google Cloud,
  projeto grátis → ativar "YouTube Data API v3" → tela de consentimento **Externa**, publicada "Em produção" (sem
  verificação: só o dono usa e aceita o aviso "app não verificado"; em "Teste" o token vence em 7 dias) → credencial
  OAuth "Aplicativo da Web" com redirecionamento `https://respawnou.com.br/admin/videos/youtube/callback` → cadastrar
  `YT_CLIENT_ID` e `YT_CLIENT_SECRET` no hPanel.
- **Restrição importante:** projetos de API criados depois de 2020 que não passaram pela **auditoria da API do
  YouTube** só conseguem enviar vídeos **privados**. Pedir a auditoria ("YouTube API Services – Audit and Quota
  Extension") logo no início; enquanto não sai, o site envia como privado e o dono muda para público no YouTube Studio
  (1 toque no app).
- **Cota:** 10.000 unidades/dia por projeto; `videos.insert` custa 1.600 na tabela de custos clássica (conferir) → até
  6 envios por dia; usamos 1.

**V17 (M)** OAuth: botão "Conectar YouTube" → consentimento (escopo `youtube.upload`, `access_type=offline`,
`prompt=consent`) → callback guarda o `refresh_token` criptografado (mesma `SOCIAL_KEY`) em `social_accounts`
(`network='youtube'`).
**V18 (M)** Envio resumível pelo servidor do site (em segundo plano): `snippet` {título, descrição, tags, `categoryId`
20 (Jogos), `defaultLanguage` `pt-BR`}, `status` {`privacyStatus` privado até a auditoria, `selfDeclaredMadeForKids`
false}. Grava `youtube_id`/`youtube_status`.
**V19 (P)** Botão "Enviar ao YouTube" e, com a auditoria aprovada, opção "enviar sozinho quando ficar pronto" (público).
**V20 (P)** Primeiro Short real; conferir que aparece como Short (vertical, ≤ 60 s).
**V21 (P)** Docs.

### Fase 4 — TikTok (P manual / G API)

- **Padrão: manual.** O dono baixa o MP4 pelo painel (no celular), posta pelo app com a legenda copiada (pode pôr um
  som em alta baixinho, o que ajuda o alcance). Nada a programar além do que a fase 1 já entrega.
- **API (só se o volume justificar):** Content Posting API do TikTok exige app no TikTok for Developers (com as páginas
  de termos e privacidade do site) e **auditoria** para postar público; sem auditoria, os posts saem só como privados
  ("SELF_ONLY") e com limite de usuários. Alternativa sem "postagem direta": enviar o vídeo para a caixa de rascunhos do
  app, e o dono conclui no celular (conferir na documentação se o escopo de envio para rascunho também exige auditoria).
  Se for fazer: V22 (M) app + OAuth; V23 (M) envio por arquivo (`FILE_UPLOAD`, evita verificar domínio); V24 (P) docs.

**Estimativa da frente B:** fase 1 G (2–3 dias); fase 2 M; fase 3 M + dono; fase 4 P (manual) ou G (API).

## Como copiar para outro site (vídeos)

`app/video/config.ts` (voz, velocidade, fechamento falado, cores da legenda vindas do `COR` do site, ordem de tipos),
`app/video/db.ts`, `fonts/` (TTF da fonte de título do site), migration equivalente à 015, `video.yml` com o `SITE_URL`
do site e os secrets próprios (`VIDEO_WORKER_SECRET` diferente por site). O worker e o ASS são genéricos. Uma conta
ElevenLabs pode servir os sites (os créditos são da conta; dividir a cota no painel de cada site).

---

# Riscos e cuidados (todas as frentes)

- **Migration do índice (013):** criar o índice único novo **antes** de apagar o antigo (a chave estrangeira de
  `post_id` precisa de um índice começando por `post_id`); se a ordem inverter, o MySQL recusa o `DROP INDEX`. DDL do
  MySQL não volta atrás: se uma linha falhar no meio, conferir o estado com `SHOW INDEX`/`DESCRIBE` antes de rodar de
  novo. Colar o SQL de toda migration nova no chat.
- **Filtro `kind` esquecido:** qualquer consulta do feed sem `kind = 'feed'` faz os Stories contarem no limite do feed
  (ou aparecerem na fila errada). O passo ST3 tem a verificação por `grep`.
- **Conta Criador x Empresa:** a publicação de Story pela API pode exigir conta **Empresa**.
- **Robô da Meta baixando arquivos:** conferir com `curl -A "facebookexternalhit/1.1"` o JPEG do Story e o MP4 do Reel
  (a CDN da Hostinger já barrou robô falso antes; ver `deploy-hostinger.md`).
- **Pedidos longos:** envio e regeneração sempre em segundo plano ou com a corrida de 25 s (a CDN corta em ~55 s).
- **Worker baixando imagens do site:** a CDN pode desafiar IPs de datacenter (GitHub). Se o V7 falhar nisso, o endpoint
  `GET /api/video/:id/imagem/:n` (com o segredo) entrega os bytes; testar cedo.
- **Envio do MP4 ao site:** o proxy da Hostinger pode limitar o tamanho do corpo. Manter o vídeo ≤ 20 MB (`crf 21`, 40 s
  dá ~12 MB); se vier `413`, plano B: envio em pedaços de 5 MB (`POST :id/parte?n=1..k` e `:id/fim`).
- **Créditos da ElevenLabs:** nunca refazer voz sozinho; "Refazer" pede confirmação; o painel mostra o consumo do mês e
  avisa acima de 80%.
- **Segredos num repositório público:** `ELEVENLABS_API_KEY` e `VIDEO_WORKER_SECRET` só nos secrets do GitHub; o
  workflow nunca imprime variáveis; o worker nunca loga cabeçalhos.
- **Cota do Gemini:** 1 pedido por vídeo; "Gerar outro roteiro" é manual.
- **Direito autoral:** imagens "reprodução" em vídeo têm o mesmo risco do site; nada de música de terceiros. YouTube:
  narração sintética não precisa da marcação de "conteúdo alterado/sintético" quando não imita pessoa real nem
  inventa fato (conferir a regra vigente ao implementar; a descrição já diz "voz sintética").
- **React Router:** rotas novas com `loader`/`action` usam `routePath` (cliques internos pedem `.data`); rotas de API
  (`/api/video/*`) são só de recurso (sem componente). `npm run build` antes de todo push.
- **Robô intacto:** `enfileirar` (feed/story), `tick` e `escolherDoDia` sempre em try/catch; falha social/vídeo nunca
  derruba coleta ou publicação; `dry=1` não enfileira nem cria job.
- **Memória do servidor:** um slide/Story por vez; nada de ffmpeg na Hostinger.

# Como verificar (resumo)

- `npm run typecheck` e `npm run build` sem erro em cada passo.
- Stories: prévias `?formato=story` lado a lado com os mockups (conta-gotas nas cores; nada fora de y 250–1580 / x
  64–1016); JPEG 1080×1920 entre 150 KB e 1,5 MB; uma matéria → uma linha `feed` e uma `story`; limites separados no
  painel; primeiro Story real conferido no app.
- Imagens próprias: troca, foco, extras e "Gerar de novo" refletidos nas miniaturas; upload inválido recusado com
  mensagem; nada fica em `MEDIA_DIR/social/uploads` sem dono depois de 60 dias.
- Vídeos: `ffprobe` (1080×1920, 30 fps, h264 yuv420p, aac, duração 25–40 s); legenda sincronizada; vídeo assistido no
  celular em tela cheia (nada embaixo dos botões); custo do mês no painel bate com o histórico da ElevenLabs.

# Decisões deste plano (o executor copia para `decisoes.md` ao concluir cada frente)

- 2026-11-23: Story pela API, sem figurinha (a API não permite); CTA "link na bio" com seta para o nome da conta;
  opção de postar à mão com figurinha (baixar + copiar link + "marcar como postado").
- 2026-11-23: coluna `kind` (`feed|story|reel`) em `social_posts`, índice único `(post_id, network, kind)`; limites
  dos Stories em `social_accounts`; janela e modo de teste compartilhados com o feed.
- 2026-11-23: dois modelos de Story: ST-N (notícia) e ST-M (moldura com o slide 1 do feed) em vez de um por tipo.
- 2026-11-23: imagens próprias em `social_posts.overrides` (JSON), arquivos em `MEDIA_DIR/social/uploads`, foco em 6
  opções em vez de editor de recorte; slide de foto extra; máximo de 10 slides.
- 2026-11-23: vídeos renderizados no GitHub Actions (repositório público, ffmpeg via apt), nunca na Hostinger; o worker
  só fala com a API do site; roteiro pelo Gemini no site; voz ElevenLabs `with-timestamps` (alinhamento por caractere
  para a legenda palavra por palavra); sem música.
- 2026-11-23: entrega em fases: baixar (1) → Reels (2) → YouTube com auditoria pendente = privado (3) → TikTok manual
  (4).

# Perguntas em aberto (para o dono)

1. **ElevenLabs:** assinar o **Starter (US$ 5/mês)**? Sem plano pago não há licença comercial nem vozes da biblioteca
   pela API (foi o que travou em 2026-11-01). Sem isso, a fase 1 não começa.
2. **Voz:** qual? Sugestão: escolher num chat com o Claude usando o conector da ElevenLabs (listar vozes pt-BR e gerar
   2 ou 3 amostras de uma frase do site; gasta poucos créditos) e colar o `voice_id` no painel. Masculina, feminina ou
   uma por editoria (combinando com os autores Nox, Lume, Vero, Atlas e Loot)?
3. **Volume de vídeos:** 1 por dia (recomendado, ~17 mil créditos/mês) ou só nos dias de 3 h (qui/sáb/dom)?
4. **Aprovação:** sempre aprovar o roteiro antes da voz (recomendado no começo, ~2 min por dia) ou ligar "aprovar
   sozinho" depois de 2 semanas?
5. **Stories:** 6 por dia está bom (o robô publica 7 a 8 matérias)? E nas notícias com "rumor", Story também ou só no
   feed?
6. **Música nos vídeos:** sem música (padrão) ou uma trilha própria, baixinha, isenta de direitos (ex.: uma faixa
   gerada uma vez e usada sempre)?
7. **Contas:** o canal do YouTube e o @ do TikTok do Respawnou já existem? Quer pedir a auditoria da API do YouTube
   (formulário em inglês; o Claude pode redigir as respostas)?
8. **Fechamento falado:** "Matéria completa no Respawnou. O link está no perfil." serve, ou prefere outra frase?
9. **Ordem:** pode ser Stories → imagens próprias → vídeos (recomendado), ou prefere vídeos antes das imagens próprias?

## Vídeo: sincronia, trilha e dinamismo (2026-11-23)
- Cada cena mostra sempre a imagem escolhida para ela; cena longa vira cortes na MESMA imagem alternando quadro aberto e aproximação (punch-in). A transição fica centrada no início da fala.
- Enquadramento manual ou preset do dono: a câmera só respira no centro (sem panorâmica), para o recorte aparecer como foi ajustado.
- Trilha sintetizada pelo ffmpeg (scripts/video/musica.ts; 3 estilos por id do vídeo, sem direitos autorais) + whoosh nas transições, com ducking sob a voz. Efeitos: cor/vinheta, pulso de brilho na batida, mais transições (incl. flash branco).
- Monetização: roteiro e voz próprios + revisão do dono + música própria; risco restante são as imagens (usar material de imprensa/capturas de jogo e creditar a fonte), e marcar "conteúdo sintético" no YouTube/TikTok quando pedirem.

## Recortes de vídeo da matéria (2026-11-24)
- O dono envia o arquivo (MP4/WebM, até 80 MB, material de divulgação que pode usar) + crédito, no rascunho do vídeo; entra na lista de imagens como "Vídeo: <crédito>" e é escolhido numa cena como qualquer imagem.
- Recorte: ffmpeg acha os cortes de cena; trechos de até 4,5 s começando num corte, pulando 6% do início (logotipo) e 14% do fim (cartela); máx. 40% do vídeo final; sem o áudio original; crédito na tela. Trecho que não couber vira imagem.
- Decisão: NÃO baixar do YouTube automaticamente (viola os termos e gera bloqueio/Content ID). Só arquivos enviados pelo dono.
