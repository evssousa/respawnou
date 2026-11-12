# Banco de dados

MySQL 8 / MariaDB 10.6+ (Hostinger). Charset `utf8mb4`, collation `utf8mb4_unicode_ci`.
Datas em UTC.

## Migrations

| Arquivo | Conteúdo | Rodada na Hostinger? |
|---|---|---|
| `db/migrations/001_inicial.sql` | Estrutura inicial (tabelas abaixo) + configurações padrão | ✅ 2026-11-10 |
| `db/migrations/002_robo.sql` | 11 fontes RSS + configurações do robô (liga o robô) | ✅ 2026-11-10 |
| `db/migrations/003_seo_midia.sql` | `posts.meta_description`, `focus_keyword`, `tags`; `feed_items.media`; mínimo de 350 palavras | ✅ 2026-11-11 |
| `db/migrations/004_fontes.sql` | Desativa Polygon (bloqueia o servidor); + GamesRadar+, Game Informer, Kotaku, Destructoid, Siliconera | ✅ 2026-11-11 |
| `db/migrations/005_fontes_bloqueadas.sql` | Desativa Destructoid e Siliconera (403 ao servidor); tira ofertas de varejo da fila | ✅ 2026-11-11 |
| `db/migrations/006_ofertas.sql` | `free_games` preenchida pelo robô: `source`, `external_id` (único por origem), `image_url`, `worth`, `description`, `extra`, `post_id`/`post_status`/`post_note` (matéria sobre a oferta) | automática no deploy de 2026-11-11 |
| `db/migrations/007_consenso.sql` | Tabelas `critic_reviews` (nota de cada análise, lida do JSON-LD) e `critic_consensus` (um consenso por jogo, ligado ao post); feeds só de análises da IGN e da Game Informer | automática no deploy de 2026-11-11 |
| `db/migrations/008_igdb.sql` | `games` preenchida pelo IGDB: `igdb_id` (único), `igdb_url`, `hypes`, `release_label` (data imprecisa), `cover_url`, `screenshots`, `trailer`, `summary_en`, `synced_at` | automática no deploy de 2026-11-12 |

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
| `posts` | Matérias | `section`+`slug` únicos, `status` (draft/published/archived), `origin` (auto/manual), `body` JSON em blocos, `review` JSON (consenso da crítica), `published_at` (UTC), `source_*`, `image_url`/`image_alt`/`image_credit` (capa), `meta_description`, `focus_keyword`, `tags` JSON |
| `feeds` | Fontes RSS do robô | `url` única, `weight`, `active`, `last_error` |
| `feed_items` | Fila de pautas | `guid_hash` (sha256) único, `status` (new/used/skipped/failed), `reason`, `post_id`, `media` JSON (imagens/vídeos/links do RSS) |
| `critic_reviews` | Análises com nota dos veículos (consenso da crítica) | `game_key`, `url_hash` (único) |
| `critic_consensus` | Um consenso por jogo: post, status, nº de análises | `game_key` (PK) |
| `free_games` | Jogos grátis por tempo limitado (Epic + GamerPower, job `ofertas`) | `ends_at`, `starts_at`, `(source, external_id)` |
| `cron_runs` | Histórico do robô | `job`, `status`, `message`, `stats` JSON |
| `settings` | Configurações do admin | `posts_per_day`, `robot_sections`, `robot_enabled` |
| `schema_migrations` | Controle das migrations | `version` |

## Formato dos campos JSON

```jsonc
// posts.body — em p/ul/quote o texto aceita links [texto](url) ("/..." = interno)
[{ "type": "p", "text": "... [PlayStation 5](/plataforma/playstation) ..." },
 { "type": "video", "youtubeId": "abc123def45", "title": "..." },
 { "type": "h2", "text": "..." },
 { "type": "img", "src": "/media/2026/11/slug-2-1a2b3c4d.webp", "alt": "...", "width": 1600, "height": 900, "credit": "Imagem: reprodução/IGN" },
 { "type": "h3", "text": "..." }, { "type": "ul", "items": ["..."] }, { "type": "quote", "text": "..." },
 { "type": "p", "text": "Leia também: [Título](/noticias/slug)" }]

// feed_items.media
{ "images": [{ "url": "https://...", "alt": "..." }], "videos": ["youtubeId"], "links": ["https://store.steampowered.com/app/..."] }

// posts.review (só na editoria reviews)
{ "score": 8.5, "verdict": "...", "pros": ["..."], "cons": ["..."],
  "critics": [{ "outlet": "Veículo", "score": 9, "url": "https://..." }] }
```
