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
- Gematsu e a rede Push Square bloqueiam também as **imagens** (403). Pauta exclusiva deles só
  vira matéria se outra fonte do mesmo assunto tiver imagem (sem capa, a pauta é descartada).
- O robô junta fontes do mesmo assunto (semelhança de título ≥ 0,5) para escrever com mais
  substância; ao publicar, marca como `skipped` tudo da fila que trata do mesmo assunto.
- Descartes automáticos na coleta: reviews/impressões de terceiros, enquetes/quizzes/sorteios,
  listas de ofertas, passatempos, cinema/TV, opinião em primeira pessoa.

## Pipeline de publicação (1 post por chamada)

Código: `writer.server.ts` (redator), `quality.ts` (checagem), `assemble.ts` (corpo final),
`media.ts`/`media.server.ts` (imagens e vídeos). Regras baseadas no robô do Anime Profile
(`animeprofile/src/lib/ai-news/worker/`: prompt, quality, html, media, localize).

1. **Escolher**: itens `new` das últimas 48 h, pela pontuação; junta até 2 fontes do mesmo assunto.
2. **Fontes e mídia**: texto da página (ou do RSS) e mídia do RSS (`feed_items.media`, gravada na
   coleta) + da página (`og:image`, imagens do `<article>`, vídeos do YouTube, links oficiais de lojas).
3. **Imagens antes do Gemini** (`chooseMedia`): baixa até 10 candidatas na maior resolução que o CDN
   oferece (`imageCandidates`: gnwcdn/IGN `width=1600`, WordPress sem `-300x169`, Future `-1920-`),
   descarta repetidas (mesmo arquivo). **Capa**: horizontal, ≥ 1200 px (aceita ≥ 800 se não houver);
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
8. **Montar** (`assembleBody`): vídeo depois do lide, uma imagem abaixo de cada h2 (alt =
   "palavra-chave: título da seção", crédito "Imagem: reprodução/<veículo>"), link interno garantido
   (1ª menção de plataforma vira link se o Gemini não pôs nenhum) e "Leia também" depois do 3º parágrafo.
9. **Publicar**: grava as imagens em WebP (sharp, até 1600 px) em `MEDIA_DIR` (padrão
   `~/respawnou-media`, fora da pasta do app, que é trocada a cada deploy), servidas em `/media`
   com cache de 1 ano; grava o post com `meta_description`, `focus_keyword`, `tags`, capa e crédito.
10. **Refazer**: `/api/cron/publicar?token=...&refazer=<id do post>` reescreve um post do robô com
    as regras atuais, no mesmo endereço (`&dry=1` para só ver).

Teste real (2026-11-11): post #1 refeito com 564 palavras, capa própria em WebP (55 KB, cache de
1 ano), links internos e para IGN/GameSpot, tags e meta description. Sem imagem no corpo porque as
pautas antigas não tinham a mídia do RSS gravada (só as coletadas depois da migration 003 têm).

Página do post: `<h1>` = título; meta description; `robots max-image-preview:large` (Discover);
JSON-LD NewsArticle com imagem, `keywords` (tags), `articleSection` e logo; crédito da capa;
tags com link para a busca.

## Consenso da crítica (Reviews)

- Disparado quando um jogo acumula análises suficientes (mínimo de 5 veículos).
- Coleta notas publicadas, normaliza para 0–10, calcula a média simples.
- Gemini resume pontos mais elogiados e mais criticados **a partir dos trechos das análises**.
- Lista cada veículo com nota e link. Atualiza o post quando surgem novas análises.

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
