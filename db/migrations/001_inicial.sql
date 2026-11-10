-- Respawnou · migration 001 · estrutura inicial
-- Compatível com MySQL 8 e MariaDB 10.6+ (Hostinger). Rodar uma vez, no banco do site.
-- Campos JSON: no MariaDB o tipo JSON é um LONGTEXT com validação; o app trata os dois casos.

SET NAMES utf8mb4;

-- Controle de migrations já aplicadas.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(50)  NOT NULL PRIMARY KEY,
  applied_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jogos: alimentam fichas (/jogos/:slug), calendário de lançamentos e posts relacionados.
CREATE TABLE games (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(160)  NOT NULL,
  name          VARCHAR(200)  NOT NULL,
  platforms     JSON          NOT NULL,                 -- ["pc","playstation",...]
  release_date  DATE          NULL,
  developer     VARCHAR(160)  NOT NULL DEFAULT '',
  publisher     VARCHAR(160)  NOT NULL DEFAULT '',
  genres        JSON          NOT NULL,                 -- ["RPG","Ação"]
  description   TEXT          NOT NULL,
  art           CHAR(1)       NOT NULL DEFAULT 'a',     -- arte provisória (a|b|c|d)
  image_url     VARCHAR(500)  NULL,
  image_credit  VARCHAR(200)  NULL,
  rawg_id       INT UNSIGNED  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_games_slug (slug),
  UNIQUE KEY uq_games_rawg (rawg_id),
  KEY ix_games_release (release_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fontes monitoradas pelo robô (RSS).
CREATE TABLE feeds (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(120)  NOT NULL,
  url              VARCHAR(500)  NOT NULL,
  language         VARCHAR(10)   NOT NULL DEFAULT 'en',
  section_hint     VARCHAR(20)   NULL,                  -- editoria sugerida para itens desta fonte
  weight           TINYINT       NOT NULL DEFAULT 5,    -- 1 a 10: peso na escolha de pautas
  active           TINYINT(1)    NOT NULL DEFAULT 1,
  last_fetched_at  DATETIME      NULL,
  last_error       VARCHAR(500)  NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_feeds_url (url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Matérias publicadas (automáticas ou manuais).
CREATE TABLE posts (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  section       VARCHAR(20)   NOT NULL,                 -- noticias|artigos|reviews|guias|promocoes
  slug          VARCHAR(200)  NOT NULL,
  status        ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  origin        ENUM('auto','manual') NOT NULL DEFAULT 'auto',
  title         VARCHAR(300)  NOT NULL,
  excerpt       VARCHAR(600)  NOT NULL,
  tag           VARCHAR(40)   NULL,                     -- substitui o rótulo da editoria no card
  platforms     JSON          NOT NULL,
  game_id       INT UNSIGNED  NULL,
  author        VARCHAR(120)  NOT NULL DEFAULT 'Redação Respawnou',
  read_minutes  TINYINT UNSIGNED NOT NULL DEFAULT 3,
  art           CHAR(1)       NOT NULL DEFAULT 'a',
  image_url     VARCHAR(500)  NULL,
  image_alt     VARCHAR(300)  NULL,
  image_credit  VARCHAR(200)  NULL,
  body          JSON          NOT NULL,                 -- blocos: [{type:"p",text}, {type:"h2",text}, ...]
  review        JSON          NULL,                     -- consenso da crítica (só em reviews)
  featured      TINYINT(1)    NOT NULL DEFAULT 0,
  views         INT UNSIGNED  NOT NULL DEFAULT 0,
  source_name   VARCHAR(120)  NULL,
  source_url    VARCHAR(500)  NULL,
  published_at  DATETIME      NULL,                     -- sempre em UTC
  updated_at    DATETIME      NULL,                     -- última atualização editorial (UTC)
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_posts_section_slug (section, slug),
  KEY ix_posts_status_date (status, published_at),
  KEY ix_posts_section_date (section, status, published_at),
  KEY ix_posts_game (game_id),
  FULLTEXT KEY ft_posts_text (title, excerpt),
  CONSTRAINT fk_posts_game FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Itens lidos dos feeds: a fila de pautas do robô.
CREATE TABLE feed_items (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  feed_id       INT UNSIGNED  NOT NULL,
  guid_hash     CHAR(64)      NOT NULL,                 -- sha256 do guid/link, evita duplicados
  title         VARCHAR(400)  NOT NULL,
  url           VARCHAR(600)  NOT NULL,
  summary       TEXT          NULL,
  published_at  DATETIME      NULL,
  status        ENUM('new','used','skipped','failed') NOT NULL DEFAULT 'new',
  score         SMALLINT      NOT NULL DEFAULT 0,       -- prioridade calculada pelo robô
  reason        VARCHAR(500)  NULL,                     -- motivo de skipped/failed
  post_id       INT UNSIGNED  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_feed_items_guid (guid_hash),
  KEY ix_feed_items_status (status, published_at),
  CONSTRAINT fk_feed_items_feed FOREIGN KEY (feed_id) REFERENCES feeds (id) ON DELETE CASCADE,
  CONSTRAINT fk_feed_items_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jogos grátis por tempo limitado (módulo da home).
CREATE TABLE free_games (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200)  NOT NULL,
  store       VARCHAR(80)   NOT NULL,
  platform    VARCHAR(40)   NOT NULL,
  url         VARCHAR(500)  NOT NULL,
  starts_at   DATETIME      NULL,
  ends_at     DATETIME      NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_free_games_ends (ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Histórico das execuções do robô (cron).
CREATE TABLE cron_runs (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job          VARCHAR(40)   NOT NULL,                  -- coletar|publicar|...
  status       ENUM('running','ok','error','skipped') NOT NULL DEFAULT 'running',
  started_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at  DATETIME      NULL,
  message      VARCHAR(1000) NULL,
  stats        JSON          NULL,
  KEY ix_cron_runs_job (job, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configurações editáveis pelo admin (posts por dia, editorias do robô...).
CREATE TABLE settings (
  name        VARCHAR(80)  NOT NULL PRIMARY KEY,
  value       JSON         NOT NULL,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (name, value) VALUES
  ('posts_per_day', '4'),
  ('robot_sections', '["noticias","promocoes"]'),
  ('robot_enabled', 'false');

INSERT INTO schema_migrations (version) VALUES ('001_inicial');
