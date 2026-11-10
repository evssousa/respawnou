# Banco de dados

MySQL 8 / MariaDB 10.6+ (Hostinger). Charset `utf8mb4`, collation `utf8mb4_unicode_ci`.
Datas em UTC.

## Migrations

| Arquivo | Conteúdo | Rodada na Hostinger? |
|---|---|---|
| `db/migrations/001_inicial.sql` | Estrutura inicial (tabelas abaixo) + configurações padrão | ✅ 2026-11-10 |

Como aplicar:

- **Produção:** automático. O `server-app.js` aplica as migrations pendentes toda vez que o app
  inicia (o MySQL da Hostinger só aceita conexão local). Basta commitar o arquivo novo e dar push.
- **Local:** configurar `DB_*` no `.env` e rodar `npm run db:migrate` (aplica só as pendentes,
  registrando em `schema_migrations`).
- **Pelo phpMyAdmin:** colar o conteúdo de cada arquivo, em ordem.
- Toda migration nova é colada no chat quando criada (combinado com o dono do projeto).

Dados de exemplo para desenvolvimento: `npm run db:seed-dev` (apaga posts/jogos; bloqueado com
`NODE_ENV=production`).

## Tabelas

| Tabela | Para quê | Campos importantes |
|---|---|---|
| `games` | Fichas de jogos, calendário | `slug` único, `platforms` JSON, `release_date`, `rawg_id` |
| `posts` | Matérias | `section`+`slug` únicos, `status` (draft/published/archived), `origin` (auto/manual), `body` JSON em blocos, `review` JSON (consenso da crítica), `published_at` (UTC), `source_*` |
| `feeds` | Fontes RSS do robô | `url` única, `weight`, `active`, `last_error` |
| `feed_items` | Fila de pautas | `guid_hash` (sha256) único, `status` (new/used/skipped/failed), `reason`, `post_id` |
| `free_games` | Jogos grátis por tempo limitado | `ends_at`, `starts_at` |
| `cron_runs` | Histórico do robô | `job`, `status`, `message`, `stats` JSON |
| `settings` | Configurações do admin | `posts_per_day`, `robot_sections`, `robot_enabled` |
| `schema_migrations` | Controle das migrations | `version` |

## Formato dos campos JSON

```jsonc
// posts.body
[{ "type": "p", "text": "..." }, { "type": "h2", "text": "..." },
 { "type": "ul", "items": ["..."] }, { "type": "quote", "text": "..." }]

// posts.review (só na editoria reviews)
{ "score": 8.5, "verdict": "...", "pros": ["..."], "cons": ["..."],
  "critics": [{ "outlet": "Veículo", "score": 9, "url": "https://..." }] }
```
