-- 015: vídeos curtos (docs/instagram-stories-videos.md, frente B). Fases 1 a 3.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS video_jobs (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id      INT UNSIGNED NOT NULL,
  status       ENUM('aguardando','aprovado','gerando','pronto','falhou','descartado') NOT NULL DEFAULT 'aguardando',
  origin       ENUM('auto','manual') NOT NULL DEFAULT 'auto',
  script       JSON         NULL,                 -- {"gancho":"...","cenas":[{"fala":"...","imagem":0}],"titulo_curto":"..."}
  images       JSON         NULL,                 -- [{"src":"/media/...","alt":"..."}] disponíveis para as cenas
  focus        JSON         NULL,                 -- {"0":"auto","2":"north"} foco por imagem
  voice_id     VARCHAR(40)  NULL,
  voice_model  VARCHAR(40)  NULL,
  chars        INT UNSIGNED NULL,                 -- caracteres enviados à ElevenLabs (custo)
  duration_s   DECIMAL(5,1) NULL,
  video        VARCHAR(300) NULL,                 -- /media/video/2026/11/v12-ab12cd34.mp4
  cover        VARCHAR(300) NULL,                 -- /media/video/2026/11/v12-ab12cd34.jpg
  captions     JSON         NULL,                 -- {"instagram":"...","youtube":{"title":"...","description":"..."},"tiktok":"..."}
  youtube_id   VARCHAR(20)  NULL,
  youtube_status VARCHAR(20) NULL,                -- private|public|failed
  error        VARCHAR(1000) NULL,
  attempts     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_at    DATETIME     NULL,                 -- UTC
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at  DATETIME     NULL,                 -- UTC
  rendered_at  DATETIME     NULL,                 -- UTC
  UNIQUE KEY uq_video_jobs_post (post_id),
  KEY ix_video_jobs_status (status, created_at),
  CONSTRAINT fk_video_jobs_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reels (fase 2): limite próprio, mesma janela e modo de teste do feed.
ALTER TABLE social_accounts
  ADD COLUMN reel_enabled     TINYINT(1)       NOT NULL DEFAULT 0 AFTER story_min_gap_minutes,
  ADD COLUMN reel_daily_limit TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER reel_enabled;

-- YouTube (fase 3) e TikTok (fase 4, só se usar a API): tokens criptografados como o do Instagram.
INSERT IGNORE INTO social_accounts (network) VALUES ('youtube'), ('tiktok');

INSERT INTO schema_migrations (version) VALUES ('015_videos');
