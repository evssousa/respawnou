# Vídeos curtos: melhorias (cartões, legenda, gancho, pronúncia, efeitos, séries, métricas, montagem em partes, módulo copiável)

Status: 📝 plano (2026-11-24). Nada implementado. Executor: seguir as **etapas na ordem** (seção "Ordem de execução"),
passo a passo, sem pular o "Pronto quando" de cada passo. Base obrigatória: `docs/instagram-stories-videos.md`, frente B,
principalmente as notas de 2026-11-23 e 2026-11-24 do fim do arquivo (o que vale hoje é o que está nessas notas e no código,
não os trechos antigos de GitHub Actions).

## Objetivo

Fazer os vídeos curtos (Reels/Shorts/TikTok) **informarem mais e reterem melhor** (dados na tela, legenda que destaca o que
importa, gancho escolhido pelo dono, pergunta no fim, voz que pronuncia certo, efeitos sonoros, séries fixas), **medir** o
resultado para escolher melhor as próximas matérias, **montar mais rápido e com menos risco** na Hostinger, e deixar o módulo
**copiável** para animeprofile, vibecoin e criasite com um único arquivo de marca por site.

Fora do escopo (decisão do dono): vídeo semanal horizontal de 5 min, programa/worker no PC do dono, versão em inglês.

## Restrições que valem para todos os passos

- Montagem **só no servidor do site** (Hostinger compartilhada, Node, `ffmpeg-static`, 1 thread por entrada/filtro,
  `/tmp` com `noexec`). Sem GitHub Actions, sem worker externo.
- Texto só com **Gemini grátis** (modelos de vídeo em `app/video/roteiro.server.ts`: `GEMINI_MODEL_VIDEO`,
  `gemini-3.5-flash-lite`, `gemini-3.8-flash`). 1 pedido por roteiro; nunca repetir sozinho.
- Voz **ElevenLabs** (créditos mensais do dono): nada pode gastar crédito sem clique do dono, exceto o vídeo aprovado.
- **Não baixar nada do YouTube.** Vídeo de terceiros só por envio manual de arquivo.
- React Router: componentes de cliente **não importam** `*.server.ts`. Tudo que o painel usa no navegador (tipos, listas de
  cartões, contas de palavras, normalização de texto) fica em arquivo **sem** `.server`. Loaders/actions usam `routePath`
  (cliques internos pedem `.data`).
- Migrations: arquivo novo em `db/migrations/`, aplicado no boot por `db/migrate.mjs`. **Colar o SQL no relatório ao dono.**
- `npm run typecheck` e `npm run build` antes de todo push; commit + push ao fim de cada etapa.
- Tudo em pt-BR (textos do painel, comentários, mensagens).

## Contexto (o que existe hoje, conferido no código em 2026-11-24)

| Peça | Onde | Observação importante para este plano |
|---|---|---|
| Configuração do vídeo (pura) | `app/video/config.ts` (`VIDEO`, `perfis`, `perfilDaSecao`, `SECOES_VOZ`) | Textos da marca misturados com regras genéricas |
| Configuração do painel | `app/video/config.server.ts` (`settings.video_config`) | `salvar_config` em `videos.tsx` **remonta o objeto inteiro**: campo novo não incluído no formulário é apagado ao salvar |
| Roteiro | `app/video/roteiro.ts` (tipos, `textoFalado`) e `roteiro.server.ts` (prompt, `SCHEMA`, `validarRoteiro`, `imagensDisponiveis`) | `textoFalado` tira `?`/`!` do fim de cada parte e junta com ". " (mata a entonação de pergunta) |
| Fila e geração | `app/video/fila.server.ts` (`criarJob`, `proximo`, `processarFilaNoServidor`, `escolherDoDia`, `publicarReel`) | Geração roda dentro do processo do site, em `mkdtemp(tmpdir())`; preso > 90 min volta para `aprovado` e **recomeça do zero** |
| Gerador | `app/video/gerador.server.ts` | Voz → palavras → segmentos → plano de clipes → imagens (sharp) → ASS → quadros → trilha → 1 comando ffmpeg gigante |
| Montagem | `scripts/video/ffmpeg.ts` (`montar`, `movimento`) | Ver "Diagnóstico do tempo de montagem" na etapa 3 |
| Legenda | `scripts/video/ass.ts` (`palavrasDoAlinhamento`, `segmentos`, `paginas`, `gerarAss`) | Cores fixas no código (`&H2EFFC8&` etc.), palavra atual em verde com "pulo" |
| Voz | `scripts/video/elevenlabs.ts` (`sintetizar`, `alinhamentoFalso`) | `with-timestamps`, alinhamento por caractere do texto enviado |
| Trilha | `scripts/video/musica.ts` (`comandoTrilha`, 3 estilos, whoosh nas transições) | A trilha sofre *ducking* pela voz (sidechain) |
| Quadros | `app/video/render/quadros.tsx` (`Moldura`, `Abertura`, `Fechamento`) + `quadros.server.ts` | PNG 1080×1920 transparentes via `renderizarPng` |
| Dados da matéria | `app/social/site.server.ts` (`lerEntrada`, `escolherModelo`) → `EntradaSocial` (`app/social/tipos.ts`) | `e.semana`/`e.ofertas` só existem quando se passa a `dica`, que está em `social_posts.payload`; **o vídeo chama `lerEntrada(postId)` sem dica**, então o modelo `S` nunca aparece no vídeo (bug a corrigir na etapa 10) |
| Reels | `app/social/server/instagram.server.ts` (`publicarReel`) e migration 016 (`video_jobs.ig_media_id` etc.) | Já grava `ig_media_id` e `ig_published_at`: base das métricas |
| Painel | `app/routes/admin/videos.tsx` (~440 linhas) | Formulário de roteiro remonta `cenas` a partir de `fala_i`/`img_i`/`foco_i`: **todo campo novo do roteiro precisa ir no formulário**, senão some ao salvar |

## Ordem de execução

| Etapa | Passos | Item do pedido | Tamanho | Depende de | Por que nesta posição |
|---|---|---|---|---|---|
| 0 | T0 | base de teste | P | — | Todos os passos testam com ele, sem gastar crédito |
| 1 | MIG, ME1, ME2 | 9 (métricas, parte 1) | M | 0 | Métricas precisam de dias para acumular: começar a coletar cedo |
| 2 | MA1 | 12 (marca, parte 1) | M | 0 | O código novo já nasce lendo da marca (cores, fonte, textos) |
| 3 | O1–O5, S1 | 11 (montagem) | G | 0, MIG | Os cartões acrescentam camadas: a montagem precisa ficar leve antes |
| 4 | F1–F3 | 4 (pronúncia e pausas) | M | 0 | Muda como as palavras viram legenda; base da legenda com números e dos cartões |
| 5 | R1 | 3/1/2 (roteiro v2) | M | 4 | Muda o prompt e o formato do roteiro uma vez só, para tudo que vem depois |
| 6 | G1 | 3 (gancho e pergunta) | M | 5 | Ganho de retenção mais barato |
| 7 | L1 | 2 (legenda com destaque) | M | 4, 5 | Usa os números em algarismos e os `destaques` do roteiro |
| 8 | C1–C3 | 1 (cartões) | G | 3, 5 | Visual novo; usa a montagem nova |
| 9 | E1 | 5 (efeitos) | P | 8 | Instantes vêm da linha do tempo dos cartões |
| 10 | SE1–SE3 | 6 (séries) | G | 5, 8 | Séries usam cartões `gratis`, `dia`, `ranking`, `nota` |
| 11 | ME3 | 9 (métricas, parte 2) | P | 1 + ≥ 6 vídeos medidos | Só faz sentido com dados |
| 12 | MA2 | 12 (marca, parte 2) | P | todas | Checklist de cópia e doc permanente |

Ao fim das etapas 3, 8 e 10: deploy e 1 vídeo real em produção com o dono olhando (anotar o tempo de montagem na Hostinger
na tabela da etapa 3).

---

# Etapa 0 — Base de teste local

## T0 (P) Script de teste do gerador, fixo no repositório

**Arquivos:** criar `scripts/video/teste-local.ts`, `scripts/video/fixtures/` (imagens geradas pelo próprio script, sem
direitos de terceiros), `scripts/video/testes/` (testes puros com `node:assert`); alterar `app/video/gerador.server.ts`
(função `baixar`).

1. Em `baixar(url)`: se `process.env.VIDEO_TESTE === "1"` **e** a URL começa com `file://`, ler do disco
   (`readFile(fileURLToPath(url))`). Fora do modo de teste, `file://` continua proibido (as URLs vêm do banco e de matérias
   do robô).
2. `teste-local.ts` aceita `--perfil curto|longo` (padrão `curto`), `--saida <pasta>` (padrão: pasta temporária) e
   `--manter` (não apaga a pasta). Ele:
   - gera 6 imagens de 1920×1080 e 2 de 1080×1350 com `sharp` (gradientes + ruído + um número grande desenhado em SVG, para
     dar para ver o enquadramento) em `scripts/video/fixtures/` se ainda não existirem;
   - monta um `PacoteVideo` fixo: `curto` = 4 cenas, ~90 palavras (≈ 35 s); `longo` = 10 cenas, ~240 palavras (≈ 97 s,
     o mesmo tamanho do teste que levou ~520 s);
   - chama `gerarVideo(pacote, dir, { qualidade: "leve", vozFalsa: true })`;
   - imprime o tempo de cada fase (voz, imagens, quadros, trilha, montagem, capa) e o total, e roda `ffprobe` (ou
     `ffmpeg -i`) para mostrar resolução, fps, codec e duração;
   - extrai quadros PNG em 1,0 s, 5,0 s, no meio e 1 s antes do fim (`-ss X -frames:v 1 quadro_X.png`) para conferência visual.
3. Comando documentado no topo do arquivo:
   `VIDEO_TESTE=1 npx tsx scripts/video/teste-local.ts --perfil longo --manter` (no PowerShell:
   `$env:VIDEO_TESTE=1; npx tsx scripts/video/teste-local.ts --perfil longo --manter`).
4. `scripts/video/testes/`: um arquivo por módulo puro (`ass.teste.ts`, depois `falar.teste.ts`, `partes.teste.ts`,
   `cartoes.teste.ts`), cada um roda com `npx tsx scripts/video/testes/<arquivo>` e termina com "ok".

**Pronto quando:** o comando gera o MP4 curto e o longo, imprime os tempos e os quadros abrem. Anotar o tempo do `longo`
como **linha de base** na tabela da etapa 3.

---

# Etapa 1 — Métricas dos Reels (coleta e painel)

## MIG (P) Migration 017

**Arquivo:** `db/migrations/017_video_melhorias.sql`. Uma migration só para todo o plano (métricas, séries, progresso,
fatos), aplicada já na etapa 1. Colar no relatório:

```sql
-- 017: melhorias dos vídeos (docs/video-melhorias.md): métricas dos Reels, séries, progresso da montagem, fatos da matéria.
SET NAMES utf8mb4;

ALTER TABLE video_jobs
  ADD COLUMN serie              VARCHAR(30)  NOT NULL DEFAULT '' AFTER origin,   -- '' = vídeo avulso
  ADD COLUMN model              VARCHAR(12)  NULL AFTER serie,                   -- modelo da matéria (N, C-review, P1, S...)
  ADD COLUMN facts              JSON         NULL AFTER images,                  -- fatos congelados para os cartões
  ADD COLUMN progress           VARCHAR(60)  NULL AFTER status,                  -- "parte 2/5" enquanto gera
  ADD COLUMN metrics_checked_at DATETIME     NULL AFTER ig_error;                -- UTC

-- Um vídeo por matéria E por série. Criar o índice novo ANTES de apagar o antigo
-- (a chave estrangeira de post_id precisa de um índice que comece por post_id).
ALTER TABLE video_jobs ADD UNIQUE KEY uq_video_jobs_post_serie (post_id, serie);
ALTER TABLE video_jobs DROP INDEX uq_video_jobs_post;

CREATE TABLE IF NOT EXISTS video_metrics (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_id         INT UNSIGNED NOT NULL,
  network        VARCHAR(20)  NOT NULL DEFAULT 'instagram',
  marco          ENUM('24h','72h','7d','30d') NOT NULL,
  views          INT UNSIGNED NULL,
  reach          INT UNSIGNED NULL,
  likes          INT UNSIGNED NULL,
  comments       INT UNSIGNED NULL,
  shares         INT UNSIGNED NULL,
  saves          INT UNSIGNED NULL,
  interactions   INT UNSIGNED NULL,
  avg_watch_ms   INT UNSIGNED NULL,
  total_watch_ms BIGINT UNSIGNED NULL,
  raw            JSON NULL,
  collected_at   DATETIME NOT NULL,                                               -- UTC (gravar com UTC_TIMESTAMP())
  UNIQUE KEY uq_video_metrics (job_id, network, marco),
  CONSTRAINT fk_video_metrics_job FOREIGN KEY (job_id) REFERENCES video_jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version) VALUES ('017_video_melhorias');
```

Antes de escrever: conferir com `SHOW INDEX FROM video_jobs` (ou lendo `015_videos.sql`) que o índice antigo se chama
mesmo `uq_video_jobs_post`. DDL do MySQL não volta atrás: se falhar no meio, conferir o estado com `DESCRIBE`/`SHOW INDEX`
antes de rodar de novo.

Código que precisa acompanhar a migration (no mesmo passo):
- `criarJob(postId, origem, serie = "")`: a busca de job existente vira `WHERE post_id = ? AND serie = ?`; o `INSERT` grava
  `serie` e `model` (`escolherModelo(e)`).
- `JobVideo` ganha `serie`, `model`, `facts`, `progress`.

**Pronto quando:** `npm run dev` com banco local aplica a 017; `DESCRIBE video_jobs` mostra as colunas; criar um job pelo
botão da matéria continua funcionando.

## ME1 (M) Coleta das estatísticas do Instagram

**Arquivos:** `app/social/server/instagram.server.ts` (nova função), criar `app/video/metricas.server.ts`, alterar
`app/lib/robot/robot.server.ts` (chamada no fim de `collect()`, como `escolherDoDia`).

1. `insightsMidia(mediaId, token, metricas)` em `instagram.server.ts`:
   `GET /{mediaId}/insights?metric=<lista>` (mesmo `chamar()`; base pelo tipo de token). Lista padrão para Reels:
   `views,reach,likes,comments,shares,saved,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time`.
   Devolve `Record<string, number>` (ler `data[].values[0].value` ou `data[].total_value.value`, o que vier).
   **Conferir na documentação da Meta ao implementar** (os nomes mudam entre versões; `plays` foi trocado por `views`).
   Se a resposta for erro de métrica inválida (código 100), tentar de novo **uma vez** sem as métricas citadas na mensagem.
2. Permissão: com login do Instagram é `instagram_business_manage_insights`; com login do Facebook,
   `instagram_manage_insights`. Erro de permissão (código 10 ou 200) → gravar em `settings` a chave
   `video_metrics_erro` = mensagem em pt-BR ("O token do Instagram não tem permissão de estatísticas. Gere o token de novo
   marcando a permissão de insights e cole em /admin/instagram.") e parar a rodada. Sucesso apaga a chave.
   Plano B sem permissão: `GET /{mediaId}?fields=like_count,comments_count` (só curtidas e comentários).
3. `coletarMetricas()` em `metricas.server.ts` (sempre em try/catch, nunca derruba a coleta):
   - roda no máximo 1 vez a cada 3 h (chave `settings.video_metrics_last`);
   - pega até 8 jobs com `ig_status = 'publicado' AND ig_media_id IS NOT NULL AND ig_published_at > UTC_TIMESTAMP() - INTERVAL 41 DAY AND (metrics_checked_at IS NULL OR metrics_checked_at < UTC_TIMESTAMP() - INTERVAL 3 HOUR)`;
   - para cada um, calcula a idade desde `ig_published_at` e o **marco devido**: 24h se idade entre 24 e 48 h; 72h entre
     72 e 120 h; 7d entre 7 e 10 dias; 30d entre 30 e 40 dias; só se o marco ainda não existe em `video_metrics`. Fora dessas
     janelas o marco fica sem dado (não gravar número de outra idade com o rótulo errado);
   - chama `insightsMidia` só se houver marco devido; grava com `INSERT ... ON DUPLICATE KEY UPDATE` (mantém o primeiro) e
     `collected_at = UTC_TIMESTAMP()`; guarda a resposta crua em `raw`;
   - atualiza `metrics_checked_at` sempre.
4. Funções de leitura (puras sobre as linhas, em `app/video/metricas.ts`, **sem** `.server`, para o painel):
   `retencao(avgWatchMs, duracaoS) = min(1, avgWatchMs / (duracaoS*1000))`; `melhorMarco(linhas)` (o mais tardio que
   existir); formatação `1.234`.

**Teste local:** script temporário com a resposta da Meta simulada (substituir `fetch` por função falsa) cobrindo: sucesso,
métrica inválida (refaz sem ela), sem permissão (grava o aviso), job de 5 dias (grava só nada ou 7d conforme a janela).
**Pronto quando:** em produção, 3 h depois do deploy, `SELECT * FROM video_metrics` tem linhas dos Reels já publicados
com 24–48 h ou 72–120 h de idade (ou o aviso de permissão aparece no painel).

## ME2 (M) Métricas no painel `/admin/videos`

**Arquivos:** `app/routes/admin/videos.tsx` (loader + UI), criar `app/components/video/Desempenho.tsx` (componente puro).
Reusar `Stat`, `Card`, `Notice`, `when` de `app/components/admin-ui.tsx`.

Hierarquia: o dono continua vendo primeiro o vídeo do dia; métricas ficam no meio (linha de números) e embaixo (tabela).

1. **Linha de `Stat`**: passa de 3 para 4 colunas em `md` (`grid-cols-2 md:grid-cols-4`). Quarto: "Views médias (72 h)"
   = média de `views` do marco 72h dos vídeos publicados nos últimos 30 dias; vazio → "—".
2. **Aviso**: se `settings.video_metrics_erro` existir, `Notice tone="warn"` com o texto, logo abaixo dos avisos atuais.
3. **Lista "Já publicados"**: no `<summary>` de cada item, à direita da data, chips em `font-mono text-[11px]`:
   `1.234 VIEWS` (`text-paper`), `46% RETENÇÃO` (cor: ≥ 60% `text-acc`, 35–59% `text-paper`, < 35% `text-warn`),
   `87 CURT.` e `12 COM.` (`text-muted`). Rótulo do marco usado em `text-muted` ("72 h"). Sem dado: um único chip
   `SEM DADOS AINDA` `text-muted`. No celular os chips quebram para a linha de baixo (`flex-wrap`), nunca cortam o título.
4. **Card "Desempenho"** (novo `<details>` entre "Já publicados" e "Configuração", fechado por padrão; aberto se houver
   ≥ 3 vídeos medidos): tabela `text-xs`, cabeçalho `font-mono font-bold text-muted uppercase`, linhas com
   `border-t border-line-soft`, números alinhados à direita em `font-mono`. Linhas por **formato** (série, se houver, senão
   modelo: "Notícia", "Jogo grátis", "Review", "Lançamentos", "Top 5", "Artigo/Guia"). Colunas: Vídeos · Views (72 h) ·
   Retenção · Curtidas + comentários · Peso na escolha (preenchido na etapa 11; até lá "—"). Rodapé `text-[11px]
   text-muted`: "Atualiza a cada 3 h com os números do Instagram. YouTube e TikTok entram quando os envios forem automáticos."
   Vazio: "Ainda não há Reels publicados há mais de 24 h."
5. Celular (375 px): tabela com rolagem horizontal (`overflow-x-auto`), primeira coluna fixa não é necessária.

**Pronto quando:** em 1440 e 375 px, com dados forjados no banco local (3 jobs publicados + linhas em `video_metrics`), os
chips e a tabela aparecem com as cores certas; sem dados, os estados vazios.

---

# Etapa 2 — Arquivo de marca (parte 1)

## MA1 (M) `app/marca.ts`: um arquivo de marca por site

**Ideia:** tudo o que muda de um site para outro fica em **um** arquivo puro, `app/marca.ts`. `app/social/config.ts` e
`app/video/config.ts` passam a **derivar** dele mantendo exatamente os mesmos nomes exportados (`SOCIAL`, `COR`, `FONTES`,
`FONTES_ARQUIVOS`, `TITULO`, `VIDEO`, `SECOES_VOZ`, `perfilDaSecao`), para não mexer nas dezenas de imports.

Estrutura (valores atuais do Respawnou; o executor move, não inventa):

```ts
export const MARCA = {
  site: "Respawnou",
  marca: "RESPAWNOU",                   // logo em texto
  handle: "respawnou.com.br",
  dominio: "RESPAWNOU.COM.BR",
  baseUrl: "https://respawnou.com.br",
  logo: "public/logo-512.png",
  descricao: "portal brasileiro de notícias de games",  // entra no prompt do roteiro
  tom: "Tom de quem joga para quem joga.",
  cores: { fundo: "#060807", painel: "#0c110c", painel2: "#111611", linha: "#1c241a", linhaSuave: "#243022",
           texto: "#eef3ea", corpo: "#b4bfb0", apagado: "#8a9787", destaque: "#c8ff2e", destaqueFundo: "#3d5200",
           alerta: "#ffb020", ruim: "#ff5a3c", sobreDestaque: "#060807" },
  fontes: { titulo: "Anton", corpo: "Inter", mono: "JetBrains Mono",
            arquivosSatori: [/* hoje em FONTES_ARQUIVOS */],
            legenda: { familia: "Anton", ttf: "app/video/fonts/Anton-Regular.ttf" } },
  titulo: { maiusculo: true, largura: 0.5, tamanhos: [96, 84, 72, 64] },
  secoes: {                              // id da editoria → rótulo, perfil de vídeo
    noticias: { rotulo: "NOTÍCIAS", nome: "Notícias", perfil: "curto" },
    artigos:  { rotulo: "ARTIGO",   nome: "Artigos",  perfil: "longo" },
    reviews:  { rotulo: "REVIEW",   nome: "Reviews",  perfil: "longo" },
    guias:    { rotulo: "GUIA",     nome: "Guias",    perfil: "longo" },
    promocoes:{ rotulo: "PROMOÇÃO", nome: "Promoções",perfil: "curto" },
  },
  social: { frases, perguntas, hashtagsBase, hashtagsPlataforma, plataformaCurta, limites, modelosLigados, fila, story, utm },
  video: {
    fechamento: "Matéria completa no Respawnou. O link está no perfil.",
    fechamentoPergunta: "Responde aí nos comentários. Matéria completa no link do perfil.",   // etapa 6
    ctaCartao: "MATÉRIA COMPLETA: LINK NO PERFIL",
    hashtagTikTokExtra: "gamesbr",
    avisoVoz: "Narração gerada por voz sintética.",
    userAgent: "respawnou-video",
    pastaBin: "respawnou-bin",                 // ~/respawnou-bin
    pastaTrabalho: "respawnou-trabalho",       // etapa 3 (S1)
    trilhas: ["energia", "tensao", "aventura"],
    pronunciaBase: [ /* etapa 4 */ ],
    series: { /* etapa 10 */ },
  },
};
```

Regras:
1. `app/marca.ts` é **puro** (sem `node:*`, sem banco), importável no navegador.
2. `app/social/config.ts`: `SOCIAL`, `COR`, `FONTES`, `FONTES_ARQUIVOS`, `TITULO` montados a partir de `MARCA` (mesmos
   campos e tipos de hoje). `rotuloSecao` vem de `MARCA.secoes[x].rotulo`.
3. `app/video/config.ts`: `VIDEO.fechamento`, `ctaCartao`, `hashtagTikTokExtra`, `avisoVoz` vêm de `MARCA.video`;
   `SECOES_VOZ` = `Object.entries(MARCA.secoes).map(([id, s]) => ({ id, rotulo: s.nome }))`; `perfilDaSecao` usa
   `MARCA.secoes[secao]?.perfil ?? "curto"`. `limites`, `perfis`, `ordemTipos`, `padrao`, `usdPorMilCreditos` continuam em
   `VIDEO` (são do núcleo).
4. Trocar os textos fixos do núcleo por `MARCA`: prompt em `roteiro.server.ts` ("do Respawnou, portal brasileiro de
   notícias de games" → `${MARCA.site}, ${MARCA.descricao}`; "Tom de quem joga para quem joga" → `MARCA.tom`);
   `User-Agent` em `gerador.server.ts`; cor da barra de progresso `0xc8ff2e` em `ffmpeg.ts` (receber por parâmetro);
   cores do ASS em `ass.ts` (receber por parâmetro, ver L1); caminho e família da fonte da legenda em `gerador.server.ts`
   e `ass.ts`; texto do `confirm` "Instagram do Respawnou" em `videos.tsx` → `MARCA.site`; `"Respawnou"` de reserva da
   legenda em `fila.server.ts`.
5. Função pura nova em `scripts/video/ass.ts`: `corAss(hex: string, alfa = 0) → "&HAABBGGRR&"` (ex.: `#c8ff2e` →
   `&H002EFFC8&`).

**Pronto quando:** `npm run typecheck` e `build` passam; `teste-local.ts` gera um vídeo **idêntico** ao de antes (comparar
os quadros de 1 s e 5 s lado a lado); o comando
`rg -n "Respawnou|respawnou|c8ff2e|2EFFC8|EAF3EE" app/video scripts/video app/routes/admin/videos.tsx` não acha nada fora
de comentários.

---

# Etapa 3 — Montagem mais leve e em partes (item 11)

## Diagnóstico do tempo de montagem (estimativa a confirmar no O1)

Hoje (`scripts/video/ffmpeg.ts`, modo `leve`, 1 thread), cada quadro de saída passa por:

| Custo por quadro (1080×1920, 1 thread; estimativa) | ms | Por quê |
|---|---|---|
| Decodificar o JPEG da cena (`-loop 1 -framerate 30`): o ffmpeg **decodifica a imagem de novo a cada quadro** | 18–25 | entrada 1620×2880 |
| `zoompan` (redimensiona 1620×2880 → 1080×1920 a cada quadro) | 10–15 | inevitável com Ken Burns |
| Moldura PNG 1080×1920 (`-loop 1 -t total`): decodificar PNG + converter RGBA→YUVA **a cada quadro** + `overlay` tela cheia | 15–22 | durante o vídeo inteiro |
| Cartão de abertura PNG 1080×1920: idem, **durante o vídeo inteiro** (a entrada tem `-t total`, só o `enable` corta) | 12–18 | só precisava dos primeiros ~3 s |
| `eq` contraste/saturação/brilho com `eval=frame` + `vignette` tela cheia | 8–14 | |
| Barra, `subtitles` (libass), `xfade` fora das transições | 3–6 | |
| x264 `veryfast` crf 21, 1 thread | 45–60 | |
| **Total** | **≈ 115–160** | 97 s × 30 = 2.910 quadros → 335–465 s + áudio/imagens ≈ os ~520 s medidos |

Isso explica por que "reduzir o tamanho das imagens não ajudou": o grosso é decodificação repetida de PNG/JPEG,
sobreposições tela cheia e o x264, não o tamanho da imagem.

**Meta (O2–O4):** cortar ≈ 45–70 ms por quadro → **≈ 35–45% menos tempo** (97 s de vídeo: de ~520 s para ~300–340 s
localmente), **sem perder qualidade** (mesmo crf, mesmo preset, mesma resolução). Dividir em partes (S1) **não reduz** o
trabalho total com 1 thread; ele traz: retomada depois de queda (não recomeça do zero), processos curtos (menos chance de a
hospedagem matar), muito menos memória (cada parte abre só as suas imagens) e, se a conta permitir 2 processos, ~1,8× mais
rápido em tempo de relógio.

Tabela a preencher pelo executor (deixar neste arquivo):

| Medição | curto (≈35 s) local | longo (≈97 s) local | longo na Hostinger |
|---|---|---|---|
| Linha de base (T0/O1) | | ~520 s (nota de 2026-11-24) | |
| Depois de O2 | | | |
| Depois de O3 | | | |
| Depois de O4 | | | |
| Depois de S1 (paralelo 1) | | | |
| S1 com paralelo 2 | | | |

## O1 (P) Medir

`teste-local.ts` imprime o tempo por fase; acrescentar a opção `--benchmark` que passa `-benchmark` ao ffmpeg da montagem
(imprime tempo de CPU e memória máxima). Rodar curto e longo 2 vezes cada; anotar a média na tabela. Guardar os quadros de
referência (1 s, 5 s, meio, fim) numa pasta `antes/` no scratch, para comparar depois de cada passo.

## O2 (M) Imagens das cenas decodificadas uma vez só

Em `montar()`:
- **Clipes com `zoompan`:** entrada sem `-loop`: `-framerate 30 -i cenaN.jpg` (1 quadro). Filtro:
  `zoompan=z=...:x=...:y=...:d=<quadros do clipe>:s=1080x1920:fps=30` (o `zoompan` gera os `d` quadros a partir de 1 imagem;
  `on` continua contando de 0 a d−1, as expressões de `movimento()` não mudam).
- **Clipes com `pan` (crop animado):** entrada de 1 quadro + `loop=loop=<quadros-1>:size=1,setpts=N/30/TB` antes do `crop`
  (o `t` do crop continua sendo o tempo do clipe).
- Trechos de vídeo: sem mudança.

**Pronto quando:** quadros iguais aos de `antes/` a olho (mesmo movimento), duração igual, tempo menor anotado.

## O3 (M) Moldura e abertura sem decodificar a cada quadro

1. `Moldura` vira **duas** imagens: `moldura_topo.png` 1080×420 (gradiente de cima + marca + chip da seção) e
   `moldura_base.png` 1080×820 (gradiente de baixo), em `quadros.tsx`/`quadros.server.ts`. As coordenadas internas não
   mudam (a base é sobreposta em y 1100).
2. Entradas **sem `-loop`/`-t`** (1 quadro); cadeia `format=yuva420p` (converte uma vez) e
   `overlay=...:eof_action=repeat` (repete o último quadro, que é o único). `enable='lt(t,<início do fechamento>)'` igual a
   hoje.
3. Abertura: entrada de 1 quadro → `format=yuva420p,loop=loop=<quadros até fimAbertura>:size=1,setpts=N/30/TB,fade=t=out:st=<fimAbertura-0.3>:d=0.3:alpha=1`
   → `overlay` com a mesma expressão de entrada deslizando e `eof_action=pass` (some quando acaba).
4. A capa (`sharp ... composite`) passa a compor `moldura_topo` (top 0) + `moldura_base` (top 1100) + `abertura`.

## O4 (M) Cor e vinheta sem filtro tela cheia por quadro

1. Contraste/saturação passam para o `sharp` na preparação de cada imagem (em `preparar()`):
   `.linear(1.07, -128 * 0.07).modulate({ saturation: 1.22 })`. A cadeia do vídeo fica só com o pulso de brilho:
   `eq=brightness='0.035*exp(-7*mod(t,B))':eval=frame` (sem `contrast`/`saturation`). Trechos de vídeo enviados pelo dono
   recebem `eq=contrast=1.07:saturation=1.22` **na própria cadeia** deles (só nos quadros deles).
2. `vignette` sai. O escurecimento dos cantos entra nas PNGs da moldura: em `moldura_topo` e `moldura_base`, além do
   gradiente vertical atual, um `radial-gradient` nos cantos (`rgba(6,8,7,0.35)` nos 180 px dos cantos externos → 0).
   Conferir no quadro de 5 s que o meio da tela não ficou mais claro que antes de forma perceptível.
3. Opção na marca/config do núcleo: `VIDEO.montagem.pulso = true` (desligar remove o `eq`).

## O5 (P) Experimento do x264 (só adota se valer)

Rodar o longo com `-preset superfast` (o resto igual). Adotar **só se** ganhar ≥ 15% de tempo e o arquivo crescer ≤ 25%
e os quadros de 5 s/meio não mostrarem blocos a olho no celular. Senão, manter `veryfast` e registrar o resultado na
tabela. (Não usar `-tune stillimage`: piora o movimento.)

## S1 (G) Montagem em partes, com retomada e progresso

**Arquivos:** criar `scripts/video/partes.ts` (puro), alterar `scripts/video/ffmpeg.ts` (montar uma parte; montar o
áudio; juntar), `app/video/gerador.server.ts` (orquestração), `app/video/fila.server.ts` (pasta de trabalho, `progress`,
limpeza), `app/routes/admin/videos.tsx` (barra de progresso).

Desenho:

1. **Áudio separado (passada A):** um comando só de áudio monta voz (`loudnorm`) + trilha com *ducking* + efeitos (etapa 9)
   → `audio.m4a` (AAC 128k, 44,1 kHz). É o mesmo filtro de áudio de hoje, tirado de `montar()`.
2. **Divisão (pura, `dividirPlano(plano, alvoS)`):** escolhe pontos de corte no **meio de clipes** com duração ≥ 1,5 s,
   longe (≥ 0,4 s) de qualquer transição, mirando partes de `VIDEO.montagem.parteAlvoS` (padrão **20 s**). Vídeo com
   total ≤ 1,5 × alvo = 1 parte (mesmo caminho de código, sem exceção). Cortes arredondados para quadro (múltiplos de
   1/30 s). Saída por parte: `{ A, B, clipes }`, com cada clipe em **tempo local** (`ini − A`) e, para o clipe partido no
   início da parte, `desloc` (segundos já passados dentro dele) e duração cortada.
3. **Montar uma parte (`montarParte`)**: mesmo grafo de hoje, mas só com os clipes da parte:
   - `movimento()` recebe `desloc` em quadros e o total de quadros do clipe inteiro: `z = 1+g*(on+DESLOC)/N` (idem x/y), e
     `d` = quadros do clipe dentro da parte;
   - `pan`: `u = min((t+DESLOC_S)/dur,1)`; trecho de vídeo: `ss + DESLOC_S`;
   - `xfade` com `offset` em tempo local; nenhuma transição cruza o corte (garantido pela divisão);
   - moldura em toda parte; abertura só se `A < fimAbertura`; barra com `x='-w+w*(t+A)/TOTAL'`; cartões (etapa 8) com
     tempos locais; fechamento só na última parte;
   - legenda: `gerarAss(..., { deslocamento: A, ate: B })` gera um ASS por parte (subtrai A, descarta o que está fora);
   - saída só vídeo (`-an`), `-frames:v <quadros exatos da parte>`, mesmos parâmetros de x264 de hoje (preset/crf/profile,
     `-pix_fmt yuv420p`, `-r 30`).
4. **Juntar:** `ffmpeg -f concat -safe 0 -i partes.txt -i audio.m4a -map 0:v -map 1:a -c copy -t <total> -movflags +faststart saida.mp4`
   (sem recodificar).
5. **Pasta de trabalho persistente:** `VIDEO_WORK_DIR` ou `~/<MARCA.video.pastaTrabalho>/v<id>/` (fora de `/media`, que é
   público, e fora de `/tmp`, que pode ser limpo). Dentro, `plano.json` com um hash de (roteiro + imagens/focos + fatos +
   configuração de montagem + versão do gerador). Se o hash bater, partes já prontas (`parte_k.mp4` com tamanho > 0 e
   `parte_k.ok`) são **puladas** na retomada; se não bater, a pasta é apagada e recomeça. A voz (`voz.mp3` +
   `alinhamento.json`) também fica na pasta: **retomada nunca gasta crédito de novo**. Apagar a pasta em `concluir`,
   `descartar`, e numa varredura de pastas com mais de 3 dias (dentro de `limparArquivos`).
6. **Paralelo opcional:** `VIDEO.montagem.paralelo` (padrão **1**; variável `VIDEO_PARALELO` sobrescreve). Com 2, roda 2
   partes ao mesmo tempo (cada uma com `-threads 1`). Se aparecer `pthread_create`/`Resource temporarily unavailable`,
   espera 20 s e continua com 1 até o fim (e registra no log).
7. **Progresso:** `UPDATE video_jobs SET progress = ?` em cada fase: `voz`, `imagens`, `parte 2/5`, `juntando`, `capa`;
   `NULL` ao terminar. `recuperarPresos` não muda (90 min), mas agora a retomada aproveita o que já foi feito.
8. **Painel:** no card do job em `gerando`, a faixa "GERANDO…" mostra o progresso: `GERANDO · PARTE 2 DE 5` e, abaixo da
   imagem, uma barra de 4 px (`bg-line` com preenchimento `bg-acc` proporcional a partes prontas / total; `transition-all
   duration-500`). Sem `progress` (job antigo): texto atual.

**Teste local:** `scripts/video/testes/partes.teste.ts` (puro): para um plano falso de 97 s com 25 clipes, as partes
cobrem `[0, total)` sem buraco nem sobreposição, nenhuma transição cruza corte, todos os cortes são múltiplos de 1/30 e a
soma dos quadros = `round(total*30)`. Depois `teste-local.ts --perfil longo`: o MP4 final tem a duração esperada (±1
quadro), **sem salto visível nos cortes** (extrair os quadros 1/30 s antes e depois de cada corte e comparar) e áudio em
sincronia no fim (a última palavra bate com a legenda). Teste de retomada: matar o processo no meio da parte 3, rodar de
novo e ver no log que as partes 1–2 foram puladas.

**Pronto quando:** a tabela de tempos está preenchida (local) e, depois do deploy, 1 vídeo longo real foi gerado na
Hostinger com o tempo anotado.

---

# Etapa 4 — Pronúncia e pausas (item 4)

## Decisão de desenho

O roteiro passa a ser **escrito para a tela** (números em algarismos: "R$ 249,90", "28/11", "nota 8,7") e o código converte
para **o que a voz fala** ("duzentos e quarenta e nove reais e noventa centavos"). Assim:
- a legenda mostra algarismos (mais legíveis e destacáveis, etapa 7);
- a pronúncia é determinística (não depende de a voz acertar "R$");
- o dicionário de pronúncia corrige nomes e siglas **sem** mudar o que aparece na legenda.

Para isso, um **mapa** liga cada palavra da tela às palavras faladas: depois da voz, as palavras com tempo (do alinhamento)
são "dobradas" de volta para as palavras da tela.

Por que não usar o dicionário de pronúncia da própria ElevenLabs: o alinhamento devolvido é do texto enviado, e fazer a
troca no nosso código funciona igual em qualquer modelo (`multilingual_v2` e `flash_v2_5`) e com o alinhamento.

## F1 (M) Normalização do texto falado (puro)

**Arquivos:** criar `scripts/video/falar.ts` (puro, vale no navegador também), alterar `app/video/roteiro.ts`
(`textoFalado`, `caracteresDoRoteiro`), `app/video/gerador.server.ts` (usar o mapa), `scripts/video/ass.ts`
(`palavrasDoAlinhamento` + remapeamento).

1. `paraFala(textoTela: string, dic: ItemPronuncia[]): { falado: string; mapa: number[] }`: divide a tela em palavras por
   espaço (o espaço "duro" ` ` **não** divide); para cada palavra, aplica na ordem:
   1. **Dicionário** (casando a palavra sem a pontuação final, sem diferenciar maiúsculas; entradas com várias palavras
      casam primeiro, as mais longas antes). Mantém a pontuação final.
   2. **Preço:** `R$ 249,90` / `R$249,90` / `R$ 1.299` → "mil duzentos e noventa e nove reais"; `,00` some; centavos →
      "e noventa centavos". `US$` → "dólares".
   3. **Porcentagem:** `30%` → "trinta por cento".
   4. **Data:** `28/11` → "vinte e oito de novembro"; `1/12` → "primeiro de dezembro"; `28/11/2026` → "... de dois mil e
      vinte e seis".
   5. **Hora:** `13h` → "treze horas"; `13h30` → "treze e trinta".
   6. **Decimal:** `8,7` → "oito vírgula sete". **Inteiro** até 999.999 por extenso (anos também: "dois mil e vinte e seis").
   7. **Ranking:** `#5` → "número cinco"; ordinal `1º` → "primeiro", `2ª` → "segunda".
   8. **Modelos de placa/processador:** número de 4 dígitos logo depois de `RTX|GTX|RX|Arc` é lido em pares ("4060" →
      "quarenta sessenta"); `i5`, `i7`, `i9` → "i cinco"...
   9. O resto fica como está.
   `mapa[i]` = quantas palavras faladas a palavra `i` da tela virou (pode ser 1, 7, ...).
   O roteiro novo (etapa 5) junta preço numa palavra só com ` ` ("R$ 249,90"); `paraFala` também aceita
   "R$ 249,90" com espaço comum (junta as duas palavras na tela).
2. `textoFalado(r, dic)` passa a montar **duas** versões, tela e falada, por parte (gancho, cada fala, fechamento) e devolve
   `{ tela: string[], falado: string, mapas: number[][] }`. Pontuação: só tira `.`/`…` do fim de cada parte; **mantém `?` e
   `!`**; junta com espaço e põe "." só onde a parte não termina em `?`/`!` (corrige a entonação de pergunta, que a etapa 6
   precisa).
3. `caracteresDoRoteiro` usa o texto **falado** (é o que custa crédito).
4. No gerador: palavras do alinhamento → `semTags()` (remove sequências de palavras entre `<` e `>`, ver F2) →
   `remapear(palavrasFaladas, mapas)` → palavras **da tela** com `ini` (da primeira falada) e `fim` (da última). Daí em diante
   tudo (segmentos, legenda, cartões) usa as palavras da tela, como hoje.
5. Proteção: se o número de palavras faladas do alinhamento não bater com a soma do mapa (a voz devolveu algo diferente),
   registrar aviso no log e cair no comportamento de hoje (legenda com as palavras faladas), sem falhar o vídeo.
6. `alinhamentoFalso` continua funcionando (recebe o texto falado).

**Teste:** `scripts/video/testes/falar.teste.ts` com pelo menos 25 casos (cada regra acima, pontuação no fim, "R$ 0,99",
"R$ 1.000", "100%", "1/1", "31/12/2027", "#1", "RTX 4060", palavra do dicionário com vírgula depois, entrada de 2 palavras do
dicionário) e um teste de ida e volta: texto → `paraFala` → alinhamento falso do falado → `remapear` → as palavras da tela
voltam iguais, na ordem, com tempos crescentes.

## F2 (P) Pausas antes de números

- Antes de uma palavra da tela classificada como **preço, nota ou data** (e que não começa a frase), inserir no falado
  `<break time="0.25s" />` (SSML aceito por `eleven_multilingual_v2` e `eleven_flash_v2_5`; conferir na documentação da
  ElevenLabs ao implementar). No máximo **4 pausas por vídeo** e 1 por frase (muitas pausas deixam a voz instável).
- A pausa não entra no `mapa` (é removida por `semTags()` antes de remapear, quer a ElevenLabs devolva os caracteres da tag
  no alinhamento, quer não).
- Configuração: `VIDEO.voz.pausaAntesNumero = 0.25` (0 desliga) no núcleo.
- Gastar **1** teste real curto (uma frase com preço, ~80 caracteres) para conferir: a pausa aparece e a legenda continua
  sincronizada. Anotar o resultado aqui.

## F3 (M) Dicionário de pronúncia: onde fica e como o dono edita

**Onde:** base do site em `MARCA.video.pronunciaBase` (no código, vale para todo vídeo) + do dono em `settings` na chave
`video_pronuncia` = `{ "itens": [{ "de": "GTA", "para": "gê tê á" }] }` (sem migration). Item do dono com o mesmo `de`
(sem diferenciar maiúsculas) substitui o da base.

Base inicial do Respawnou (o executor confere ouvindo no 1º vídeo real; ajustes vão para o painel):
`PS5` → "pê ésse cinco", `PS4` → "pê ésse quatro", `PC` → "pê cê", `DLC` → "dê éle cê", `RPG` → "érre pê gê",
`FPS` → "éfe pê ésse", `MMO` → "ême ême ó", `GTA` → "gê tê á", `Xbox` → "équis box", `4K` → "quatro ká", `VR` → "vê érre",
`IA` → "i á", `NPC` → "éne pê cê", `HD` → "agá dê", `RTX` → "érre tê équis", `GPU` → "gê pê u", `CPU` → "cê pê u",
`SSD` → "ésse ésse dê", `Game Pass` → "Game Pass" (exemplo de nome mantido), `Switch 2` → "Switch dois".

**Arquivos:** `app/video/pronuncia.server.ts` (ler/salvar, validação), `app/video/pronuncia.ts` (puro: juntar base + dono,
`suspeitas(texto, dic)`), `app/routes/admin/videos.tsx` (card + intent `salvar_pronuncia`), criar
`app/components/video/Pronuncia.tsx` (puro). `proximo()` passa o dicionário no pacote.

Validação no servidor: `de` 1–40 caracteres, `para` 1–80, sem `<>{}\`, no máximo 300 itens, sem `de` repetido.

**Painel, card "Pronúncia da voz"** (`<details id="pronuncia">` logo depois de "Configuração", fechado por padrão):
- Texto de ajuda `text-xs text-muted`: "Como a voz deve falar nomes e siglas. Vale para os próximos vídeos (não muda a legenda)."
- Tabela de 3 colunas no `sm+` (`grid grid-cols-[1fr_1.5fr_auto] gap-2`): input "Como está escrito" (`inputCls`,
  `maxLength 40`), input "Como a voz deve falar" (`maxLength 80`), botão "Remover" (texto, `border border-line-soft
  min-h-9 px-3 font-mono text-xs`, hover `border-warn text-warn`). No celular, cada linha vira um bloco empilhado com borda
  `border-line`.
- "+ Acrescentar" (estado no cliente, linha vazia nova com foco no primeiro campo) e "Salvar pronúncias"
  (`tone="primary"`).
- Abaixo, `<details>` "Já vem pronto (20)": lista da base em `font-mono text-xs text-muted` ("PS5 → pê ésse cinco"), com um
  link "trocar" que acrescenta uma linha do dono com o mesmo `de` preenchido.
- `?nova=GTA` na URL abre o card e já cria uma linha com `de = GTA` (usado pelos chips abaixo).

**No card do job em rascunho:** abaixo das cenas, linha "Confira a pronúncia:" com chips (`border border-line-soft px-2
min-h-8 font-mono text-[11px] text-paper`, hover `border-acc`) das palavras **suspeitas** do roteiro que não estão no
dicionário: só maiúsculas com 2+ letras (`GTA`), letra+dígito (`PS6`, `GTA6`), ou palavra com `k`/`w`/`y` que não está num
pequeno dicionário de palavras comuns. Clicar leva a `/admin/videos?nova=<palavra>#pronuncia`. Nenhuma suspeita: a linha
não aparece.

**Opcional (P), só se sobrar tempo:** botão "Ouvir" em cada linha do dicionário (rota de recurso `/admin/videos/ouvir`,
POST, devolve `audio/mpeg` com a palavra falada numa frase curta "Hoje no Respawnou: <para>."; `confirm` "Gasta cerca de N
créditos"). Sem isso, o dono confere no próximo vídeo.

**Pronto quando:** salvar 2 itens, recarregar e eles continuam; um roteiro com "GTA" mostra o chip; `falar.teste.ts` com o
dicionário passa; o estimador de caracteres do card usa o texto falado.

---

# Etapa 5 — Roteiro v2 (formato e prompt únicos para as etapas 6 a 10)

## R1 (M) Novo formato, prompt e validação, compatível com os roteiros antigos

**Arquivos:** `app/video/roteiro.ts`, `app/video/roteiro.server.ts`, criar `app/video/cartoes.ts` (puro: tipos e
disponibilidade dos cartões), `app/video/fila.server.ts` (`criarJob`/`gerarRoteiroDoJob` gravam `facts`),
`app/routes/admin/videos.tsx` (formulário preserva tudo).

Tipo (em `roteiro.ts`, puro):

```ts
export type TipoCartao = "preco" | "lancamento" | "nota" | "requisitos" | "gratis" | "plataformas" | "ranking" | "dia";
export interface CenaRoteiro { fala: string; imagem: number; cartao?: TipoCartao | null; item?: number | null }
export interface Roteiro {
  v?: 2;
  gancho: string;              // o escolhido (é o falado)
  ganchos?: string[];          // até 3 opções do Gemini (etapa 6)
  pergunta?: string | null;    // pergunta do fechamento, até 80 caracteres (etapa 6)
  usarPergunta?: boolean;      // padrão true quando há pergunta
  destaques?: string[];        // até 6 termos para destacar na legenda (etapa 7)
  cenas: CenaRoteiro[];
  titulo_curto: string;
}
```

Fatos (em `cartoes.ts`, puro; montados no servidor a partir de `EntradaSocial` e congelados em `video_jobs.facts` na
criação e em "Gerar outro roteiro"):

```ts
export interface FatosVideo {
  jogo?: string | null;
  preco?: string | null;                       // "R$ 249,90" (de e.precoBrl)
  lancamento?: { data: string; diaSemana?: string; ano?: number } | null;   // ver C1
  plataformas?: string[];                      // rótulos curtos (MARCA.social.plataformaCurta)
  nota?: { valor: number; veiculos: number; veredito?: string } | null;     // de e.review
  requisitos?: { rotulo: string; minimo: string }[];                       // de e.requisitos
  gratis?: { nome: string; loja: string; ate: string; precoNormal?: string | null; arte?: string | null }[];
  dias?: { rotulo: string; data: string; jogos: string[] }[];              // série lançamentos
  ranking?: { titulo: string }[];                                          // série top 5
}
export function cartoesDisponiveis(f: FatosVideo, serie: string): TipoCartao[]
```
Regras de disponibilidade: `preco` se `preco` tem dígito; `lancamento` se há data; `nota` se `nota.veiculos ≥ 1`;
`requisitos` se ≥ 2 linhas reconhecidas (placa de vídeo, processador, memória); `gratis` se ≥ 1; `plataformas` se ≥ 1;
`ranking` só na série `top5`; `dia` só na série `lancamentos-semana`.

Prompt (`systemDoPerfil`), mudanças:
1. **Números em algarismos** (substitui a regra "escreva números como se falam"): "Escreva preços, datas, notas e números com
   algarismos, como aparecem na matéria (R$ 249,90; 28/11; nota 8,7; 2026). O sistema converte para a fala."
2. `ganchos`: "3 opções de primeira frase (até 90 caracteres cada), de estilos diferentes: (1) o fato mais forte, com o
   número ou o nome principal; (2) o que muda para quem joga; (3) curiosidade ou contraste, sem exagerar nem prometer o que a
   matéria não diz. No máximo uma delas pode ser pergunta."
3. `pergunta`: "uma pergunta curta de opinião para o fim (até 80 caracteres), ligada à matéria, que dê para responder com
   uma palavra (ex.: 'Você pagaria R$ 349 nele?'). Sem 'comenta aí' (o sistema acrescenta)." A regra "sem pergunta no meio"
   continua para as falas.
4. `destaques`: "até 6 termos que aparecem literalmente nas falas: nomes de jogos, estúdios ou consoles mais importantes."
5. `cenas[].cartao`: "opcional; use só um destes, se a fala daquela cena citar o dado: <lista de cartoesDisponiveis>. No
   máximo um por cena e cada tipo uma vez (exceto ranking e dia, uma por cena). Deixe vazio se não combinar."
   `cenas[].item`: "nas séries, o número do item da lista DADOS a que a cena se refere".
6. A seção DADOS do prompt passa a ser gerada a partir de `FatosVideo` (numerada nas listas: grátis, dias, ranking).

`SCHEMA` ganha `ganchos` (ARRAY de STRING), `pergunta` (STRING), `destaques` (ARRAY de STRING), e em `cenas.items`:
`cartao` (STRING, `enum` com os tipos disponíveis daquele job + "") e `item` (INTEGER). `required` continua
`["cenas", "titulo_curto"]` + `ganchos` (o `gancho` some do pedido; é preenchido pelo código).

`validarRoteiro(r, nImagens, secao, fatos, serie)`:
- aceita o formato antigo (com `gancho` e sem `ganchos`): continua válido (compatibilidade com jobs existentes);
- `ganchos`: filtra os vazios/longos; precisa sobrar ≥ 1; `gancho = r.gancho` válido e presente em `ganchos`, senão
  `ganchos[0]`;
- `pergunta` inválida (vazia, > 80) vira `null` (não falha o roteiro); `usarPergunta` padrão `true` se há pergunta;
- `destaques`: até 6, cada um 2–40 caracteres, só os que aparecem nas falas (comparação sem acento/maiúsculas);
- `cartao` fora de `cartoesDisponiveis` ou repetido → vira `null` (não falha); `item` fora da lista → `null`;
- **reforço automático** (fallback, só no roteiro vindo do Gemini, não no salvo pelo dono): se um cartão disponível de
  `nota`, `gratis` ou `preco` não foi usado, pôr na primeira cena (depois da 1ª) cuja fala tenha o número/nome dele; se
  nenhuma tiver, não pôr;
- limites de palavras contam a **tela** (gancho + falas), como hoje.

Formulário do painel (risco principal desta etapa): `salvar`/`aprovar`/`img_add`/`vid_add` remontam o roteiro a partir dos
campos. Acrescentar campos ocultos ou visíveis para **tudo**: `ganchos_i`, `gancho_sel`, `pergunta`, `usarPergunta`,
`destaques` (JSON oculto), `cartao_i`, `item_i`. A action reconstrói o `Roteiro` v2 completo. Teste obrigatório: salvar um
roteiro v2 sem mexer em nada e conferir no banco que nenhum campo sumiu.

**Teste local:** script temporário que chama `gerarRoteiro` para 4 matérias reais do banco local (notícia com preço,
review, grátis, guia) e imprime o JSON + `validarRoteiro`; conferir lendo: algarismos nos números, 3 ganchos de estilos
diferentes, cartões coerentes com a fala, nada inventado. Usa 4 pedidos do Gemini.
**Pronto quando:** os 4 passam na validação, um job antigo continua abrindo/salvando/gerando, e o teste do formulário acima
passa.

---

# Etapa 6 — Gancho escolhido pelo dono e pergunta no fechamento (item 3)

## G1 (M)

**Arquivos:** `app/routes/admin/videos.tsx` (criar `app/components/video/Ganchos.tsx`, puro), `app/video/roteiro.ts`
(`fechamentoFinal`), `app/video/fila.server.ts` (`proximo` passa o fechamento final), `app/video/render/quadros.tsx`
(`Fechamento` com pergunta), `app/video/legendas.ts`, `app/social/core/legenda.ts` (parâmetro opcional).

1. **Fala do fechamento:** `fechamentoFinal(r) = r.usarPergunta && r.pergunta ? `${r.pergunta} ${MARCA.video.fechamentoPergunta}` : MARCA.video.fechamento`.
   `textoFalado` e o `PacoteVideo.fechamento` usam isso (o `segmentos()` conta as palavras do fechamento: tem que ser o mesmo
   texto). A legenda continua sem o fechamento (como hoje).
2. **Painel, bloco "Gancho"** (substitui o input "Gancho"): `fieldset` com legenda "Gancho: a 1ª frase (escolha uma)".
   Três linhas (ou uma, em roteiro antigo), cada uma: `radio` (`name="gancho_sel"`, 20 px, `accent-[var(--color-acc)]`) +
   `input` (`name="ganchos_i"`, `inputCls`, `maxLength 90`) + contador `font-mono text-[11px]` "64/90" (vermelho `text-warn`
   acima de 90). A linha escolhida: `border-2 border-acc bg-acc/10`; as outras `border border-line`; transição
   `transition-colors duration-150`. Acima de cada input, rótulo `font-mono text-[10px] text-muted uppercase`: "FATO",
   "PARA QUEM JOGA", "CURIOSIDADE". Clicar em qualquer lugar da linha seleciona. Foco do teclado: `focus-visible:outline
   outline-2 outline-acc`.
3. **Painel, bloco "Fechamento"** (substitui o parágrafo "Fechamento fixo"): `checkbox` "Fechar com pergunta (puxa
   comentários)" (`name="usarPergunta"`) + `input` da pergunta (`maxLength 80`, desabilitado e `opacity-50` quando
   desmarcado). Embaixo, em `text-xs text-muted`, o que a voz vai falar: com pergunta "<pergunta> Responde aí nos
   comentários. Matéria completa no link do perfil."; sem, o fechamento fixo. Roteiro sem pergunta: só o checkbox
   desmarcado e o input vazio (o dono pode escrever uma).
4. **Cartão de fechamento com pergunta** (`Fechamento` ganha `pergunta?: string`), tela 1080×1920, opaca, mesmo fundo de hoje
   (grade + brilho radial). Com pergunta, de cima para baixo:
   - y 260: chip contorno "RESPONDA NOS COMENTÁRIOS" (altura 56, `border 3px` `cores.destaque`, texto `cores.destaque`,
     `MONO` 700 26, padding 0 22), centralizado;
   - y 350: a pergunta em `ANTON`, caixa alta, `ajustarTitulo(pergunta, 852, 3, [88, 76, 64])`, cor `cores.texto`, centralizada,
     largura 852, `lineHeight 1.04`; o "?" final em `cores.destaque`;
   - y 760: logo 160×160; y 950: "SIGA" Anton 104; y 1070: "@HANDLE" Anton 64 `cores.destaque`; y 1190: botão 852×84 com o CTA
     (igual ao de hoje). Tudo dentro de y 220–1500.
   Sem pergunta: o layout atual, sem mudança.
5. **Legendas das redes:** `montarLegenda(e, modelo, { pergunta })` (parâmetro opcional novo em `core/legenda.ts`: se
   vier, substitui a pergunta escolhida de `SOCIAL.perguntas`). TikTok: gancho + pergunta (se houver) + CTA + hashtags.
6. Estimativa de duração no card: `palavras faladas (sem tags) / 2,5 + 3`, incluindo o fechamento final.

**Teste local:** `teste-local.ts` com pergunta: o fechamento dura mais e o cartão mostra a pergunta; a voz falsa cobre o
tempo. Prévia do quadro do fechamento em 1080×1920 lado a lado com a especificação (posições y).
**Pronto quando:** escolher o gancho 2, salvar, recarregar: continua o 2; aprovar gera com o gancho 2 na voz; desmarcar a
pergunta volta ao fechamento fixo.

---

# Etapa 7 — Legenda com destaque inteligente (item 2)

## L1 (M)

**Arquivos:** `scripts/video/ass.ts`, `app/video/gerador.server.ts` (passa termos e cores).

1. **Classificação de cada palavra da tela** (função pura `classificar(palavras, termos)`):
   - `numero`: tem dígito, ou é `R$…`, `%`, `#n`, ou "grátis"/"GRÁTIS" (palavra-chave de promoção);
   - `nome`: faz parte de um termo de `termos` = `roteiro.destaques` + `fatos.jogo` + nomes de `fatos.gratis`, `fatos.dias`,
     `fatos.ranking`. Casamento por sequência de palavras, sem acento/maiúsculas/pontuação, a mais longa primeiro; termo com
     mais de 4 palavras destaca só as 4 primeiras;
   - `comum`: o resto.
2. **Estilos no ASS** (cores via `corAss` a partir de `MARCA.cores`):
   - `comum`: branco `cores.texto` (como hoje); palavra da vez em `cores.destaque` com o pulo atual (`\fscx122\fscy122` →
     100 em 120 ms);
   - `numero`: **sempre** `cores.alerta` (âmbar `#ffb020`) e `\fscx112\fscy112`; quando é a palavra da vez,
     `\fscx138\fscy138\t(0,140,\fscx112\fscy112)` e contorno `\bord8` (o normal é 6);
   - `nome`: **sempre** `cores.destaque` (verde-limão), tamanho normal; quando é a vez, pulo `\fscx118\fscy118` → 100 em
     120 ms (a cor já é verde, o movimento marca a vez).
   Hierarquia resultante: número (âmbar e maior) > nome de jogo (verde) > palavra da vez (verde com pulo) > resto (branco).
3. **Páginas** (`paginas()`): (a) `R$ 249,90` é uma palavra só e vira `R$\h249,90` no ASS (aplicar `\h` **depois** de
   `limpa()`, que remove barras); (b) se a palavra é `numero` e a página atual já tem ≥ 2 palavras, fecha a página antes
   (o número abre a página seguinte, mais visível); (c) um `nome` com várias palavras não é partido entre páginas se couber
   em 30 caracteres.
4. `gerarAss` recebe `{ cores, fonte, deslocamento, ate }` (cores e fonte da marca; deslocamento/fim por parte da etapa 3).

**Teste:** `ass.teste.ts`: frase "O novo GTA 6 chega em 26/05 por R$ 349,90 no PS5" com termos ["GTA 6"] → "GTA" e "6" em
verde, "26/05" e "R$\h349,90" em âmbar, "26/05" abrindo página; nenhuma sobreposição de tempo; o arquivo abre no ffmpeg
(`teste-local.ts`). Conferir o quadro na hora do preço: âmbar, maior, legível, dentro de x 64–916.
**Pronto quando:** quadros do teste mostram as três cores sem a legenda passar de 2 linhas nem entrar na zona y > 1500.

---

# Etapa 8 — Cartões de dados animados (item 1)

## Direção visual

**Clima:** painel de dados do "Central de Comando" pousando sobre a imagem: bloco escuro quase opaco, barra verde-limão à
esquerda (a mesma do cartão de abertura), rótulo técnico em mono, o número grande em Anton. Lê-se em 1 segundo no
celular. **Evitar:** cantos arredondados, emoji, gradiente colorido, vários cartões ao mesmo tempo, texto pequeno
(< 26 px), cartão na zona dos botões do app ou por cima da legenda.

**Hierarquia dentro do cartão:** 1º o valor (preço/nota/data/nome do jogo grátis), 2º o rótulo (o que é), 3º o detalhe
(veículos, loja, prazo).

**Na tela:** o olho vê primeiro a legenda (embaixo) e o cartão (meio-alto) quando entra (por isso ele entra com movimento e
som, e só um por vez); a imagem continua visível acima e atrás.

## Tokens (todos de `MARCA.cores`/`MARCA.fontes`; nada fixo no componente)

| Token | Valor (Respawnou) |
|---|---|
| Fundo do cartão | `cores.fundo` `#060807` a 88% (`rgba(6,8,7,0.88)`) |
| Barra de acento | 10 px à esquerda, `cores.destaque` `#c8ff2e` |
| Borda | 2 px `cores.linhaSuave` `#243022` em cima, à direita e embaixo |
| Sombra | `0 20px 48px rgba(0,0,0,0.55)` |
| Raio | 0 (cantos retos, igual a toda a marca) |
| Padding interno | 30 px em cima, 40 à direita, 34 embaixo, 36 à esquerda (depois da barra) |
| Rótulo | `MONO` 700 26 px, `cores.destaque`, `letterSpacing 2`, caixa alta |
| Ícone | 34×34, SVG em linha, traço 3 px `cores.destaque`, sem preenchimento, 12 px antes do rótulo |
| Valor | `ANTON`, `cores.texto` `#eef3ea` (tamanho por tipo, abaixo) |
| Detalhe | `Inter` 600 30 px, `cores.corpo` `#b4bfb0`, até 2 linhas |
| Dado secundário | `MONO` 700 24–26 px, `cores.texto` |
| Notas | `corNota()` atual (≥ 7,5 `#c8ff2e`; ≥ 5,5 `#ffb020`; abaixo `cores.ruim` `#ff5a3c`): mover de `carrossel.tsx` para `app/social/core/nota.ts` e reusar nos dois |

## Geometria

- Cartões do meio: caixa 852 px de largura, x 64 → 916, topo **y 600**, altura conforme o tipo (220 a 440), **fundo
  sempre ≤ y 1040** (a legenda começa em ~y 1220; a marca termina em y 292; lateral direita dos botões começa em y 1000,
  mas o cartão não passa de x 916).
- O PNG tem 40 px de folga transparente em volta (para a sombra): 932 × (altura + 80). Sobreposição em x 24, y 560.
- Renderizar **no tamanho do cartão**, não em 1080×1920 (4 a 8 vezes menos pixels para converter e sobrepor por quadro).
- Exceção: `ranking` fica em cima (topo y 330, ver abaixo).

## Os 8 cartões

| Tipo | Rótulo + ícone | Conteúdo | Altura | Animação | Som (etapa 9) |
|---|---|---|---|---|---|
| `preco` | "PREÇO" · etiqueta | Valor `R$ 249,90` Anton 136 (112 se > 10 caracteres; texto sem dígito, ex. "GRATUITO", Anton 96). Detalhe: nome do jogo (cortar 40) | ~300 | pop | ding |
| `lancamento` | "LANÇAMENTO" · calendário | Linha: valor "28 NOV" Anton 136 (+ " 2027" se não for o ano atual) e, à direita, chip `SEXTA` (fundo `cores.destaque`, texto `cores.sobreDestaque`, `MONO` 700 24, altura 48, padding 0 16). Detalhe: nome do jogo | ~300 | sobe | pop |
| `nota` | "NOTA MÉDIA DA CRÍTICA" · medidor (meio círculo) | Linha: quadrado 200×200 com fundo `corNota(v)` e o valor `8,7` Anton 120 em `cores.sobreDestaque` (igual ao slide do carrossel); à direita, coluna com "12 VEÍCULOS" `MONO` 700 26 `cores.texto` e o veredito (Inter 600 30, 2 linhas, até 70 caracteres). Embaixo do quadrado e da coluna, barra 772×12: fundo `cores.linha`, preenchimento `corNota(v)` em `v/10` da largura | ~340 | pop | impacto |
| `requisitos` | "REQUISITOS MÍNIMOS · PC" · chip | 3 linhas (placa de vídeo, processador, memória, nesta ordem; reconhecer pelo `rotulo` sem acento: `placa|video|gpu`, `processador|cpu`, `memoria|ram`): rótulo `MONO` 700 22 `cores.apagado` em coluna de 220 px + valor Inter 600 30 `cores.texto` (1 linha, cortar 34). Separador 1 px `cores.linha` entre linhas | ~380 | sobe | pop |
| `gratis` | (sem rótulo mono) | Linha de cima: chip "GRÁTIS" (fundo `cores.destaque`, texto `cores.sobreDestaque`, Anton 56, padding 6 18) + loja `MONO` 700 26 `cores.destaque`. Valor: nome do jogo Anton, `ajustarTitulo(nome, 772, 2, [84, 72, 60])`. Embaixo: "ATÉ QUI, 27/11, ÀS 13H" `MONO` 700 26 `cores.texto` e, se houver, "DE R$ 89,99" Inter 600 30 `cores.apagado` riscado (`textDecoration: line-through`) | ~360 | pop | ding |
| `plataformas` | "ONDE JOGAR" · controle | Fichas em linha (quebram): altura 72, padding 0 24, borda 3 px `cores.destaque`, Anton 48 `cores.texto`, espaço 14; máximo 5 (`MARCA.social.plataformaCurta`) | ~220 | sobe | pop |
| `ranking` (só série top 5) | — | Caixa 852×220 no **topo y 330**: à esquerda quadrado 220×220 fundo `cores.destaque` com "#5" Anton 150 `cores.sobreDestaque`; à direita painel (fundo do cartão) com o título do item Anton `ajustarTitulo(t, 560, 2, [64, 56, 48])` | 220 | pop | impacto |
| `dia` (só série lançamentos) | — | Linha de cima: chip "SEX" (como o chip de `lancamento`) + "28/11" Anton 64 `cores.texto`. Até 3 jogos, um por linha, Anton 52 `cores.texto` com quadrado 14×14 `cores.destaque` antes; se houver mais, "+2 JOGOS" `MONO` 700 24 `cores.apagado` | ~360 | sobe | pop |

Ícones: desenhar em SVG simples dentro de `quadros.tsx` (etiqueta = retângulo com ponta e furo; calendário = retângulo + 2
argolas + linha; medidor = arco de 180° + ponteiro; chip = quadrado com 3 "pinos" por lado; controle = retângulo arredondado
com cruz e 2 botões). Mesmo traço e cor em todos.

Fallback de dado: o componente recebe só o que existe; texto longo é cortado com `cortar()`; se faltar o valor principal
(preço vazio, nota sem número, menos de 2 requisitos, lista vazia) o renderizador devolve `null` e o cartão **não entra**
(só um aviso no log, o vídeo nunca falha por cartão).

## Tempo de tela (puro, `scripts/video/cartoes.ts`: `planoCartoes(cenasSeg, palavras, roteiro, fatos)`)

Para cada cena com `cartao`:
- **início**: se a fala da cena tem a palavra do dado (preço: palavra com `R$`/`,dd`; nota: o número da nota; data: dd/mm
  ou mês; grátis/ranking/dia/plataformas/requisitos: não procura), início = `palavra.ini − 0,15 s`; senão,
  `cena.ini + 0,35 s`. Nunca antes de `fimAbertura + 0,25 s` nem antes do fim do cartão anterior + 0,3 s;
- **fim**: `min(cena.fim − 0,15 s, início + 4,5 s)`; `ranking` e `dia` ficam até `cena.fim − 0,15 s` (sem teto);
- se `fim − início < 1,6 s`, o cartão é descartado;
- devolve `[{ tipo, item, ini, fim, png }]`, usado pela montagem (C2) e pelos efeitos (E1).

## C1 (M) Fatos e renderização dos cartões

**Arquivos:** `app/video/cartoes.ts` (tipos, `cartoesDisponiveis`, puro), criar `app/video/fatos.server.ts`
(`fatosDaEntrada(e, serie)`), `app/video/render/quadros.tsx` (`Cartao*` + `CartaoBase`), `app/video/render/quadros.server.ts`
(`gerarCartao(tipo, fatos, item) → { png, largura, altura } | null`), `app/social/core/nota.ts` (corNota/dec).

- `fatosDaEntrada`: `preco` = `e.precoBrl`; `lancamento` a partir de `release_date` **completo** (acrescentar a
  `lerEntrada` um campo `lancamentoIso` sem mudar o `lancamento` atual) → `{ data: "28 NOV", diaSemana: "SEXTA", ano }`
  (fuso America/Sao_Paulo); `plataformas` via `plataformaCurta`; `nota` de `e.review`; `requisitos` mínimos de
  `e.requisitos`; `gratis` de `e.gratis` (ou da série); `dias`/`ranking` da série (etapa 10).
- `criarJob` e `gerarRoteiroDoJob` gravam `facts` e passam os fatos ao prompt.

**Teste:** script `scripts/video/testes/cartoes-render.ts` que gera os 8 PNGs com fatos de exemplo (incluindo nome de jogo
longo, preço sem dígito, nota 4,9, 6 plataformas) numa pasta e uma "folha" 1080×1920 com cada cartão sobre uma imagem de
fixture na posição real (x 24, y 560), para conferir de uma vez.

## C2 (M) Cartões na montagem

Em `montarParte()` (depois da moldura e antes da abertura; legenda sempre por cima de tudo), para cada cartão da parte:
- entrada de 1 quadro `-framerate 30 -i cartao_k.png`;
- **sobe:** `[i:v]format=yuva420p,loop=loop=<quadros até FIM>:size=1,setpts=N/30/TB,fade=t=in:st=INI:d=0.25:alpha=1,fade=t=out:st=FIM-0.2:d=0.2:alpha=1[ck]`
  e `overlay=x=24:y='560+48*pow(1-min(max((t-INI)/0.3,0),1),3)':eval=frame:enable='between(t,INI,FIM)':eof_action=pass`
  (sobe 48 px desacelerando em 0,3 s);
- **pop:** mesma cadeia + `scale=w='trunc(iw*S/2)*2':h='trunc(ih*S/2)*2':eval=frame` com
  `S = 0.88+0.12*u+0.06*sin(PI*u)`, `u = min(max((t-INI)/0.3,0),1)` (cresce de 88% a ~101% e assenta em 100%), e
  `overlay=x='24+466-w/2':y='560+(H+80)/2-h/2'` (centro fixo), `fade` de entrada de 0,12 s;
- saída sempre por `fade` de 0,2 s, sem movimento;
- tempos `INI`/`FIM` locais da parte (etapa 3); cartão cortado por um corte de parte é tratado pela divisão (as expressões
  usam o tempo local; o `loop` começa no início da parte com `u` calculado a partir do tempo absoluto: passar
  `INI_LOCAL` possivelmente negativo).
- Se o `ffmpeg-static` não aceitar `t` no `scale` com `eval=frame` (testar no T0), usar "sobe" para todos e registrar aqui.

**Teste:** `teste-local.ts` com 3 cartões (preço, nota, grátis): extrair quadros no início + 0,1 s, + 0,3 s e no meio de
cada um; conferir posição, entrada, saída e que a legenda não foi coberta. Anotar o custo extra no tempo total (esperado
< 5%).

## C3 (P) Cartão por cena no painel

No `CenaLinha`, depois do seletor de enquadramento: `select` "Cartão" (`min-h-9 border border-line bg-ink px-2 text-xs
text-paper`) com "Nenhum" + só os tipos de `cartoesDisponiveis(job.facts, job.serie)`, rótulos "Preço: R$ 249,90",
"Nota: 8,7", "Lançamento: 28 NOV", "Grátis: <nome>", "Plataformas: PC, PS5", "Requisitos mínimos". Nas séries, um segundo
`select` "Item" com a lista numerada. Tipo já usado noutra cena aparece desabilitado com "(já na cena 3)". Ao lado, a
miniatura do cartão: rota de recurso `/admin/videos/cartao/:id?tipo=&item=` (PNG, mesma ideia da prévia da capa),
`h-[60px] border border-line`, carregando: retângulo `bg-line animate-pulse`; erro: texto "sem prévia". Job sem `facts`
(antigo): o `select` não aparece.

**Pronto quando:** em 1440 e 375 px o seletor mostra só cartões com dado; trocar e salvar mantém; o vídeo gerado mostra o
cartão escolhido na cena certa.

---

# Etapa 9 — Efeitos sonoros nos momentos-chave (item 5)

## E1 (P)

**Arquivos:** criar `scripts/video/efeitos.ts` (puro: `comandoEfeitos(eventos, total, saida, leve)`), alterar a passada de
áudio (etapa 3) e `gerador.server.ts`.

- Eventos = `planoCartoes(...)` → `{ t: ini, tipo }`, com o som pela tabela dos cartões: `ding` (preço, grátis), `impacto`
  (nota, ranking), `pop` (demais). Intervalo mínimo de 1,5 s entre efeitos (o segundo é descartado).
- Síntese com `aevalsrc` (sem arquivo de terceiros), mono 44,1 kHz:
  - `ding` (0,9 s): `0.5*(sin(2*PI*1318.5*t)+0.6*sin(2*PI*1975.5*t)+0.25*sin(2*PI*2637*t))*exp(-6*t)*min(1,t*400)`;
  - `impacto` (0,7 s): `0.9*sin(2*PI*(55*t+60*(1-exp(-25*t))/25))*exp(-5*t)+0.25*(random(0)*2-1)*exp(-30*t)`, depois
    `lowpass=f=4000`;
  - `pop` (0,15 s): `0.4*sin(2*PI*(600+900*exp(-40*t))*t)*exp(-35*t)`.
  Cada evento com `adelay`, somados com `amix` → `efeitos.wav` (mesmo padrão dos whooshes de `musica.ts`).
- Mistura final: `[voz][trilha com ducking][efeitos volume=0.45]` → `amix=inputs=3` (conferir se o `amix` do
  `ffmpeg-static` aceita `normalize=0`; se não, compensar com `volume=3` como hoje com `volume=2`) → `alimiter`.
  Os efeitos **não** passam pelo *ducking* (senão somem sob a voz).
- Liga/desliga: `video_config.efeitos` (padrão ligado) no card "Configuração" ("Efeitos sonoros nos cartões"). **Incluir o
  campo no `salvar_config`** (ele remonta o objeto inteiro) e em `lerConfig`.

**Teste:** `teste-local.ts` com 3 cartões; ouvir no fone: o ding cai junto com a entrada do cartão de preço, a voz continua
inteligível, sem estouro (`alimiter`). **Pronto quando:** o dono ouviu 1 vídeo real e aprovou o volume (ou pediu ajuste,
que vira um número em `VIDEO.efeitos.volume`).

---

# Etapa 10 — Séries fixas (item 6)

## Desenho

Uma **série** é um formato fixo (estrutura de roteiro + perfil de duração + cartões + identidade) ancorado numa matéria
que já existe (o job continua com `post_id`; a chave única passou a ser `(post_id, serie)`). Duas são de **calendário**
(o site cria sozinho no dia) e duas são **formatos** aplicados automaticamente ao tipo de matéria.

| Série (`serie`) | Rótulo na tela | Quando | Matéria-âncora | Dados | Estrutura do roteiro | Perfil |
|---|---|---|---|---|---|---|
| `gratis-semana` | "GRÁTIS DA SEMANA" | Calendário: quinta, depois das 14h (a Epic troca às 13h) | a matéria de promoção (modelo P1) mais recente dos últimos 3 dias sem vídeo desta série | `free_games` com `ends_at > agora` e `post_id` não nulo, até 5, ordem por valor (`worth`) | gancho + 1 cena por jogo (2 a 5), cada uma com `cartao: gratis` e `item` = jogo | 30–60 s, 70–140 palavras |
| `lancamentos-semana` | "LANÇAMENTOS DA SEMANA" | Calendário: segunda, depois que a peça evergreen "lançamentos da semana" sai (ver pergunta 1) | a matéria do modelo S da semana | `semana` lida de `social_posts.payload` (a `dica`) | gancho + 1 cena por dia com lançamento (até 6), `cartao: dia` | 35–60 s, 80–140 palavras |
| `review-60` | "REVIEW EM 60 S" | Formato: toda escolha de matéria C-review (automática ou manual) | a própria review | `nota`, prós, contras, veredito, plataformas, preço | 4 cenas fixas: (1) o jogo e a nota (`nota`); (2) o que a crítica elogia; (3) o que critica; (4) veredito + onde jogar (`plataformas` ou `preco`) | 50–60 s, 125–150 palavras |
| `top5` | "TOP 5" | Formato: artigo (C-artigo) com ≥ 5 pontos | o próprio artigo | `ranking` = títulos dos 5 primeiros pontos (`extrairPontos`) | gancho + 5 cenas; se o título tem "melhor/melhores/top/ranking", contagem regressiva #5 → #1 (ordem inversa do texto), senão 01 → 05 na ordem do texto; `cartao: ranking` em todas | 50–75 s, 120–180 palavras |

Identidade visual da série (pouca coisa, bem marcada): o chip do cartão de abertura e o chip da moldura (canto superior
direito) mostram o **rótulo da série** em vez da editoria; trilha fixa por série (`gratis-semana` e `top5` = "energia",
`lancamentos-semana` = "aventura", `review-60` = "tensao") para dar identidade sonora; na série top 5, o fechamento com
pergunta padrão "Qual seria o seu número 1?" se o Gemini não mandar outra.

## SE1 (M) Perfis e prompts das séries

**Arquivos:** `app/video/config.ts` (`VIDEO.perfis` ganha `gratis`, `semana`, `review60`, `top5`; `perfilDoJob(secao,
serie)` substitui `perfilDaSecao` onde há job), `app/marca.ts` (`MARCA.video.series` com rótulos, dia/hora padrão e
trilha), `app/video/roteiro.server.ts` (bloco de instruções por série no `systemDoPerfil`; validação: número exato de
cenas nas séries, `item` obrigatório onde a tabela pede).

Texto do bloco de instruções (exemplo `gratis-semana`): "Este é o vídeo da série Grátis da semana. Faça exatamente uma
cena por jogo da lista DADOS, na mesma ordem. Cada fala diz o nome do jogo, a loja e até quando está grátis; o preço normal
se houver. Em cada cena, cartao = gratis e item = número do jogo." O executor escreve os outros três no mesmo padrão,
seguindo a coluna "Estrutura".

## SE2 (M) Dados das séries e escolha automática

**Arquivos:** criar `app/video/series.server.ts` (ESPECÍFICO DO SITE: lê `free_games`, `social_posts.payload`,
`extrairPontos`), `app/video/fatos.server.ts` (fatos das séries), `app/video/fila.server.ts` (`escolherDoDia`, `criarJob`),
`app/video/roteiro.server.ts` (`imagensDisponiveis` ganha as artes dos jogos da série: `gratis[].arte`, artes de
`semana.dias[].jogos[]`, imagens dos pontos; limite de 8 continua, priorizando uma por item).

1. **Correção do modelo S:** no vídeo, `lerEntrada(postId, dica)` com a `dica` lida de
   `SELECT payload FROM social_posts WHERE post_id = ? AND network = 'instagram' AND kind = 'feed'` (mesma função
   `payloadDe` da fila social; exportá-la de um arquivo comum). Vale em `criarJob`, `gerarRoteiroDoJob`, `proximo` e
   `escolherDoDia`.
2. `serieDoFormato(e)`: C-review → `review-60`; C-artigo com ≥ 5 pontos → `top5`; senão `''`. Usado na escolha
   automática e como padrão no botão manual.
3. `serieDeCalendario(cfg, agora)`: se hoje (Brasília) é o dia de uma série ligada e passou da hora, devolve
   `{ serie, postId }` da âncora (ou nada, se não houver âncora/dados suficientes: grátis com < 2 jogos não vira série; o
   avulso do P1 continua existindo).
4. `escolherDoDia`: primeiro a série de calendário (se houver e ainda não existir job `(post, serie)`), depois a escolha
   normal. Ambas contam no `perDay`.
5. `video_config` ganha `series: { "gratis-semana": { ligado, dia, hora }, "lancamentos-semana": { ligado, dia, hora } }`
   e `formatos: { "review-60": true, "top5": true }`. **Atualizar `lerConfig` e o `salvar_config`** (remonta tudo).

## SE3 (P) Painel e botão manual

- Card do job: título do `Card` ganha o chip da série antes do título da matéria (`font-mono text-[11px] font-bold
  text-ink bg-acc px-2`), ex. "GRÁTIS DA SEMANA · ...".
- Card "Configuração": bloco "Séries" com, para cada série de calendário, checkbox + dia (`select` dom–sáb) + hora; e
  checkboxes dos formatos ("Reviews viram 'Review em 60 s'", "Listas com 5+ itens viram 'Top 5'").
- Botão "Fazer vídeo desta matéria" (`app/routes/admin/post-edit.tsx`): ao lado, `select` "Formato" com "Automático"
  (padrão, usa `serieDoFormato`), "Avulso" e as séries válidas para aquela matéria.

**Teste local:** com o banco local, forjar 3 jogos em `free_games` e uma matéria P1; rodar `escolherDoDia` com a data
simulada numa quinta 15h → nasce o job `gratis-semana` com 3 cenas e cartões `gratis` 0, 1, 2; gerar com voz falsa.
Repetir para `top5` com um artigo de 7 pontos e para uma review.
**Pronto quando:** os 4 formatos geram vídeo local; em produção, a primeira quinta com a série ligada cria o job sozinho.

---

# Etapa 11 — Métricas na escolha das matérias (item 9, parte 2)

## ME3 (P) Peso por formato

**Arquivos:** `app/video/metricas.server.ts` (`pesosPorFormato()`), `app/video/fila.server.ts` (`escolherDoDia`),
`app/components/video/Desempenho.tsx` (coluna "Peso").

- Desempenho de um vídeo = `views(72h) × (0,5 + retenção)` (retenção 0–1; quem segura mais vale mais).
- Formato = série, se houver; senão `model`.
- Peso do formato = mediana do desempenho do formato ÷ mediana de todos, limitado a **0,6–1,6**; só com ≥ 3 vídeos medidos
  no formato (senão 1,0); só liga com ≥ 6 vídeos medidos no total (senão tudo 1,0 e a escolha é a de hoje). Janela: vídeos
  publicados nos últimos 60 dias.
- Nova pontuação do candidato em `escolherDoDia`:
  `(ordemTipos.length − posição do tipo) × peso do formato + 0,8 × log10(1 + visitas 24 h)`; rumor continua perdendo para
  não-rumor (como hoje). Empate: mais nova.
- `video_config.usarMetricas` (padrão ligado; checkbox "Usar o desempenho dos Reels na escolha" no card Configuração;
  incluir no `salvar_config`).
- Log `[video] escolha: post X, pontuação 4,6 (review ×1,20, 240 visitas)`.

**Teste:** script com linhas forjadas em `video_metrics` (reviews com o dobro de views das notícias) → a review ganha da
notícia mais visitada; com 4 vídeos medidos, a escolha não muda (peso 1,0).

---

# Etapa 12 — Módulo copiável (item 12, parte 2)

## Núcleo copiável x específico do site

| Copiar igual (núcleo) | Específico de cada site |
|---|---|
| `scripts/video/` inteiro (`ass.ts`, `ffmpeg.ts`, `partes.ts`, `musica.ts`, `efeitos.ts`, `falar.ts`, `cartoes.ts`, `videoclip.ts`, `elevenlabs.ts`, `teste-local.ts`, `testes/`, `fixtures/`) | `app/marca.ts` (o único arquivo de marca) |
| `app/video/`: `roteiro.ts`, `roteiro.server.ts`, `cartoes.ts`, `config.ts` (deriva da marca), `config.server.ts`, `fila.server.ts`, `gerador.server.ts`, `legendas.ts`, `metricas.ts`, `metricas.server.ts`, `pronuncia.ts`, `pronuncia.server.ts`, `fatos.server.ts`, `render/` | `app/video/db.ts` e `app/social/db.ts` (ponte com o banco do site) |
| `app/social/` `core/`, `render/`, `server/`, `tipos.ts`, `config.ts` (deriva da marca) | `app/social/site.server.ts` (`lerEntrada`, `escolherModelo`: lê as tabelas do site) |
| `app/components/video/*`, `EscolherImagem.tsx`, `AlinharImagem.tsx`, `app/routes/admin/videos.tsx` | `app/video/series.server.ts` (dados das séries; pode começar devolvendo nenhuma série) |
| | `app/video/fonts/` e `app/social/fonts/` (fontes da identidade) e `public/logo-512.png` |
| | Migrations (renumerar: equivalentes a 012–017) e a chamada em `collect()` do robô do site |

Cada arquivo ganha na 1ª linha `// NÚCLEO (copiar igual)` ou `// DO SITE (adaptar)`.

## MA2 (P) Checklist, doc permanente e verificação

1. Criar `docs/modulo-video.md` (permanente): o que o módulo faz em 10 linhas, a tabela acima, os campos de `app/marca.ts`
   comentados, e o **checklist de cópia**:
   1. Copiar os arquivos do núcleo (tabela) para o site novo.
   2. Criar `app/marca.ts` do site a partir do do Respawnou (cores, fontes, logo, textos de fechamento/CTA, `descricao`,
      `tom`, seções com rótulo e perfil, hashtags, `pronunciaBase` do assunto do site, séries).
   3. Copiar as fontes: TTF da fonte da legenda em `app/video/fonts/` (libass precisa de TTF) e WOFF/TTF estáticos para o
      satori em `app/social/fonts/`.
   4. Escrever as pontes `db.ts` e `site.server.ts` (`lerEntrada` devolvendo `EntradaSocial`) para as tabelas do site.
   5. `series.server.ts`: começar sem séries (`return null`), ativar depois.
   6. Migrations equivalentes (social 012–014, vídeo 015–017) com a numeração do site; colar o SQL no chat.
   7. Rotas em `app/routes.ts` (`/admin/videos`, `/admin/videos/capa/:id`, `/admin/videos/cartao/:id`, `/admin/videos/ouvir`
      se existir) e item no menu do painel.
   8. No robô do site, no fim da coleta, em try/catch: `escolherDoDia()`, `processarFilaNoServidor()`, `coletarMetricas()`,
      `limparArquivos()`.
   9. Dependências: `satori`, `sharp`, `ffmpeg-static`, `react`; variáveis `ELEVENLABS_API_KEY`, `SOCIAL_KEY`, chaves do
      Gemini; `VIDEO_WORK_DIR` opcional.
   10. `VIDEO_TESTE=1 npx tsx scripts/video/teste-local.ts` com a marca nova; conferir os quadros; `npm run build`; deploy.
   11. No painel do site novo: vozes por editoria, pronúncias, séries.
   (animeprofile: só depois da migração dele para MySQL/Hostinger; vibecoin e criasite: quando tiverem o módulo social.)
2. Atualizar a seção "Como copiar para outro site (vídeos)" de `instagram-stories-videos.md` para apontar para
   `docs/modulo-video.md`.
3. Verificação final: o `rg` do MA1 continua sem achados; `teste-local.ts` passa; o dono gerou 1 vídeo de cada série.

---

# Arquivos afetados (resumo)

| Arquivo | Etapas |
|---|---|
| `db/migrations/017_video_melhorias.sql` (novo) | 1 |
| `app/marca.ts` (novo) | 2, 4, 6, 10 |
| `app/social/config.ts`, `app/video/config.ts`, `app/video/config.server.ts` | 2, 3, 9, 10, 11 |
| `app/video/roteiro.ts`, `app/video/roteiro.server.ts` | 2, 4, 5, 6, 10 |
| `app/video/cartoes.ts`, `app/video/fatos.server.ts`, `app/video/series.server.ts` (novos) | 5, 8, 10 |
| `app/video/pronuncia.ts`, `app/video/pronuncia.server.ts` (novos) | 4 |
| `app/video/metricas.ts`, `app/video/metricas.server.ts` (novos) | 1, 11 |
| `app/video/fila.server.ts`, `app/video/gerador.server.ts`, `app/video/legendas.ts` | 1, 3–10 |
| `app/video/render/quadros.tsx`, `quadros.server.ts` | 3, 6, 8 |
| `scripts/video/ass.ts`, `ffmpeg.ts`, `musica.ts` | 2, 3, 4, 7 |
| `scripts/video/falar.ts`, `partes.ts`, `cartoes.ts`, `efeitos.ts`, `teste-local.ts`, `testes/`, `fixtures/` (novos) | 0, 3, 4, 8, 9 |
| `app/social/server/instagram.server.ts`, `app/social/core/legenda.ts`, `app/social/core/nota.ts` (novo), `app/social/site.server.ts`, `app/social/render/modelos/carrossel.tsx` | 1, 6, 8, 10 |
| `app/routes/admin/videos.tsx`, `app/components/video/*` (novos), `app/routes/admin/post-edit.tsx`, `app/routes.ts` | 1, 3–6, 8–11 |
| `app/lib/robot/robot.server.ts` | 1 |
| `docs/modulo-video.md` (novo), `docs/instagram-stories-videos.md`, `docs/README.md`, `docs/decisoes.md` | 12 e ao fim de cada etapa |

# Riscos e cuidados

- **Formulário que apaga campos:** `salvar`/`aprovar` remontam o roteiro e `salvar_config` remonta a configuração. Todo
  campo novo (ganchos, pergunta, destaques, cartão, item, efeitos, séries, formatos, usarMetricas) precisa ir no formulário
  e no parser. Testar "salvar sem mexer" depois de cada etapa que mexe no roteiro/configuração.
- **Compatibilidade:** jobs existentes têm roteiro v1 (`gancho` sem `ganchos`, números por extenso, sem `facts`). Tudo
  precisa aceitar v1: sem cartões, sem pergunta, `paraFala` deixa as palavras por extenso como estão.
- **Mapa tela ↔ fala:** se o alinhamento não bater com o mapa, cair no comportamento antigo (legenda com o falado) em vez de
  falhar. Nunca refazer a voz sozinho.
- **Créditos:** retomada usa a voz guardada na pasta de trabalho; o teste de pausa (F2) é o único gasto extra previsto
  (~80 caracteres); "Ouvir" (opcional) sempre com `confirm`.
- **Migration 017:** índice novo antes de apagar o antigo; conferir o nome do índice antigo; colar o SQL no relatório.
- **Filtros do ffmpeg-static:** `scale` com `t`/`eval=frame`, `amix normalize`, `loop` e `fade alpha` precisam ser testados
  no binário do projeto (T0/C2) antes de depender deles; os fallbacks estão descritos em cada passo.
- **Cortes das partes:** nenhuma transição ou entrada de cartão pode depender de tempo absoluto sem o deslocamento da
  parte; o teste puro de `partes.ts` e a extração de quadros em volta de cada corte são obrigatórios.
- **Memória e processos na Hostinger:** `paralelo` padrão 1; só subir para 2 depois de 1 vídeo real com 1 e olhando o
  "Uso de recursos" do hPanel.
- **Permissão de estatísticas:** o token atual pode não ter a permissão de insights; a coleta tem que avisar e não quebrar.
- **Fatos congelados:** o cartão mostra o dado de quando o roteiro foi feito (ex.: preço mudou depois). "Gerar outro
  roteiro" atualiza; o painel mostra a data do roteiro.
- **Regras do Instagram/YouTube:** nada de música de terceiros; efeitos e trilha são sintetizados; o aviso de voz
  sintética continua nas descrições.
- **React Router:** componentes novos em `app/components/video/` só importam arquivos puros (`roteiro.ts`, `cartoes.ts`,
  `metricas.ts`, `pronuncia.ts`, `marca.ts`). Rotas de recurso novas (`/admin/videos/cartao/:id`, `/admin/videos/ouvir`)
  sem componente, com `requireAdmin`. `npm run build` antes de todo push.

# Como verificar (resumo)

- `npm run typecheck` e `npm run build` em cada passo; `npx tsx scripts/video/testes/<arquivo>` para cada módulo puro.
- `VIDEO_TESTE=1 npx tsx scripts/video/teste-local.ts --perfil curto|longo --manter`: tempos por fase, `ffprobe`
  (1080×1920, 30 fps, h264 yuv420p, aac), quadros extraídos comparados com a especificação.
- Visual: quadros em 1080×1920 abertos a 100% e no celular em tela cheia; cartões dentro de x 64–916 e y 560–1040 (ranking
  y 330–550); legenda nunca coberta; nada em y > 1500 exceto o fundo.
- Painel: 1440 px e 375 px para cada bloco novo (gancho, fechamento, cartão por cena, pronúncia, desempenho, séries,
  progresso).
- Produção: 1 vídeo real ao fim das etapas 3, 8 e 10, com o tempo de montagem anotado; métricas aparecendo 3 h depois do
  deploy da etapa 1.

# Decisões que dependem do dono (só o que bloqueia)

1. **Série "Lançamentos da semana" na segunda-feira.** A decisão de 2026-11-23 diz "vídeos só quinta, sábado e domingo",
   mas a peça de lançamentos da semana sai na segunda. Opções: (a) **recomendado:** o site cria o roteiro na segunda e o dono
   aprova pelo celular nesse dia (2 min; exceção à regra só para esta série); se não aprovar até quarta 12h, o job é
   descartado sozinho; (b) a série fica desligada por padrão e o dono liga quando quiser. Bloqueia só o SE2 dessa série; o
   resto segue.
2. **Token com permissão de estatísticas** (não é decisão, é ação): se o painel mostrar o aviso de permissão depois da
   etapa 1, gerar o token de novo em developers.facebook.com marcando a permissão de insights e colar em `/admin/instagram`.
   Sem isso, as etapas 1 e 11 ficam só com curtidas e comentários.
