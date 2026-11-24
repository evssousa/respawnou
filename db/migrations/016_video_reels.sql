-- 016: publicação do vídeo como Reels no Instagram (botão em /admin/videos).
SET NAMES utf8mb4;

ALTER TABLE video_jobs
  ADD COLUMN ig_status       ENUM('enviando','publicado','falhou') NULL AFTER youtube_status,
  ADD COLUMN ig_container_id VARCHAR(40)  NULL AFTER ig_status,
  ADD COLUMN ig_media_id     VARCHAR(40)  NULL AFTER ig_container_id,
  ADD COLUMN ig_permalink    VARCHAR(300) NULL AFTER ig_media_id,
  ADD COLUMN ig_started_at   DATETIME     NULL AFTER ig_permalink,       -- UTC
  ADD COLUMN ig_published_at DATETIME     NULL AFTER ig_started_at,      -- UTC
  ADD COLUMN ig_error        VARCHAR(500) NULL AFTER ig_published_at;

INSERT INTO schema_migrations (version) VALUES ('016_video_reels');
