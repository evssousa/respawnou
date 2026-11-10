# Robô de postagem

Status: ✅ código pronto e testado localmente (coleta real de 11 feeds, validação). 🔄 falta
CRON_TOKEN no painel, teste em produção e criação dos Cron Jobs.

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
   └─ /api/cron/publicar  escolhe 1 item → Gemini escreve → valida → grava em posts (published)
   ▼
MySQL local (127.0.0.1:3306)
```

- Token secreto em `CRON_TOKEN` (variável de ambiente). Sem token correto → 404.
- Cada chamada grava uma linha em `cron_runs` (início, fim, status, mensagem, estatísticas).
- Trava: se existir execução `running` há menos de 10 min, a nova chamada sai sem fazer nada.

## Parâmetros de /api/cron/publicar

- `dry=1`: gera a matéria e devolve o JSON, sem gravar nada (para testar o Gemini em produção).
- `force=1`: ignora janela de horário, limite diário e intervalo (não ignora `robot_enabled`).

## Configurações (tabela `settings`)

`robot_enabled`, `posts_per_day` (4), `robot_sections` (["noticias","promocoes"]),
`robot_min_words` (300), `robot_start_hour` (8), `robot_end_hour` (22).

## Fontes e bloqueios

- 11 feeds (migration 002). GameSpot, Gematsu e a rede Push Square/Pure Xbox/Nintendo Life
  **bloqueiam robôs (403) na página da matéria**: o robô usa o texto do próprio RSS e **não**
  se disfarça de navegador para contornar o bloqueio.
- O robô junta fontes do mesmo assunto (semelhança de título ≥ 0,5) para escrever com mais
  substância; ao publicar, marca como `skipped` tudo da fila que trata do mesmo assunto.
- Descartes automáticos na coleta: reviews/impressões de terceiros, enquetes/quizzes/sorteios,
  listas de ofertas, passatempos, cinema/TV, opinião em primeira pessoa.

## Pipeline de publicação (1 post por chamada)

1. **Escolher**: itens `new` das últimas 48 h, com pontuação (fonte, palavras-chave, jogo conhecido,
   quantas fontes falam do mesmo assunto). Agrupar duplicados.
2. **Enriquecer**: dados do jogo (RAWG) e matérias relacionadas do próprio site para links internos.
3. **Escrever** (Gemini, saída em JSON): título, linha fina, editoria, plataformas, jogo, corpo em
   blocos (`p`, `h2`, `ul`, `quote`), tempo de leitura.
4. **Validar**: tamanho mínimo, sem números/datas que não estejam na fonte, slug único, editoria válida.
   Falhou → item `failed` com motivo; não publica.
5. **Publicar**: grava em `posts` (`origin = 'auto'`), marca item como `used`.

## Consenso da crítica (Reviews)

- Disparado quando um jogo acumula análises suficientes (mínimo de 5 veículos).
- Coleta notas publicadas, normaliza para 0–10, calcula a média simples.
- Gemini resume pontos mais elogiados e mais criticados **a partir dos trechos das análises**.
- Lista cada veículo com nota e link. Atualiza o post quando surgem novas análises.

## Gemini

- Plano gratuito (decisão do projeto: sem APIs pagas). Chave em `GEMINI_API_KEY`.
- Modelo: `GEMINI_MODEL` opcional; padrão `gemini-2.5-flash`, e se não existir mais o cliente
  lista os modelos da chave e escolhe o "flash" mais novo.
- Cota do plano gratuito é **por projeto do Google Cloud**: a chave do Respawnou deve ficar num
  projeto separado do Anime Profile para não dividir limites.
- Erro 429 (limite): a execução termina com erro e a pauta continua na fila.
- Saída estruturada em JSON (response schema).

## Fontes iniciais

Ver migration 002. RAWG (dados de jogos e lançamentos) estava fora do ar em 2026-11-10;
o robô funciona sem ele (posts sem ficha de jogo). Alternativa: IGDB (Twitch).

## Regras de qualidade

Ver [adsense.md](adsense.md) → "Regras do robô".
