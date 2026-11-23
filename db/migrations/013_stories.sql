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
