# Robô de postagem

Status: ⏳ a construir (fase 3). Depende do banco (fase 1 ✅) e do site no ar (fase 2).

## Arquitetura

```
Cron Job da Hostinger (hPanel → Avançado → Cron Jobs)
   │  a cada ~15 min:  curl -s "https://respawnou.com.br/api/cron/coletar?token=..."
   │  4x por dia:      curl -s "https://respawnou.com.br/api/cron/publicar?token=..."
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
- Modelo e limites a confirmar na hora de implementar (o plano gratuito muda com frequência).
- Saída estruturada em JSON (response schema) para não depender de parsing de texto.

## Fontes iniciais

IGN, PC Gamer, Eurogamer (RSS). URLs exatas são cadastradas na tabela `feeds` pelo admin e
verificadas na implementação. RAWG para dados de jogos e lançamentos (chave gratuita em `RAWG_API_KEY`).

## Regras de qualidade

Ver [adsense.md](adsense.md) → "Regras do robô".
