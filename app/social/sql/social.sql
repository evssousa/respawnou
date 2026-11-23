-- 012+013: postagem automática no Instagram (docs/instagram.md, módulo app/social).
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
  story_enabled         TINYINT(1)        NOT NULL DEFAULT 0,      -- stories (013)
  story_daily_limit     TINYINT UNSIGNED  NOT NULL DEFAULT 6,
  story_min_gap_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 45,
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
  kind          ENUM('feed','story','reel') NOT NULL DEFAULT 'feed',   -- formato (013)
  model         VARCHAR(20)  NOT NULL,                             -- N|C-artigo|C-review|C-guia|P1|P2|S
  status        ENUM('pending','preview','sending','published','failed','skipped','expired') NOT NULL DEFAULT 'pending',
  origin        ENUM('auto','manual') NOT NULL DEFAULT 'auto',
  priority      TINYINT UNSIGNED NOT NULL DEFAULT 10,
  payload       JSON         NULL,                                 -- dados extras (semana, ofertas)
  overrides     JSON         NULL,                                 -- imagens próprias do dono (014)
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
  UNIQUE KEY uq_social_posts_kind (post_id, network, kind),
  KEY ix_social_posts_queue (network, kind, status, priority, created_at),
  KEY ix_social_posts_published (network, kind, published_at),
  CONSTRAINT fk_social_posts_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version) VALUES ('012_instagram');
