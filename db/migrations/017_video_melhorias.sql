-- 017: melhorias dos vídeos (docs/video-melhorias.md): métricas dos Reels, séries, progresso da montagem, fatos da matéria.
SET NAMES utf8mb4;

ALTER TABLE video_jobs
  ADD COLUMN serie              VARCHAR(30)  NOT NULL DEFAULT '' AFTER origin,   -- '' = vídeo avulso
  ADD COLUMN model              VARCHAR(12)  NULL AFTER serie,                   -- modelo da matéria (N, C-review, P1, S...)
  ADD COLUMN facts              JSON         NULL AFTER images,                  -- fatos congelados para os cartões
  ADD COLUMN progress           VARCHAR(60)  NULL AFTER status,                  -- "parte 2/5" enquanto gera
  ADD COLUMN metrics_checked_at DATETIME     NULL AFTER ig_error;                -- UTC

-- Um vídeo por matéria E por série. Criar o índice novo ANTES de apagar o antigo
-- (a chave estrangeira de post_id precisa de um índice que comece por post_id).
ALTER TABLE video_jobs ADD UNIQUE KEY uq_video_jobs_post_serie (post_id, serie);
ALTER TABLE video_jobs DROP INDEX uq_video_jobs_post;

CREATE TABLE IF NOT EXISTS video_metrics (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_id         INT UNSIGNED NOT NULL,
  network        VARCHAR(20)  NOT NULL DEFAULT 'instagram',
  marco          ENUM('24h','72h','7d','30d') NOT NULL,
  views          INT UNSIGNED NULL,
  reach          INT UNSIGNED NULL,
  likes          INT UNSIGNED NULL,
  comments       INT UNSIGNED NULL,
  shares         INT UNSIGNED NULL,
  saves          INT UNSIGNED NULL,
  interactions   INT UNSIGNED NULL,
  avg_watch_ms   INT UNSIGNED NULL,
  total_watch_ms BIGINT UNSIGNED NULL,
  raw            JSON NULL,
  collected_at   DATETIME NOT NULL,                                               -- UTC (gravar com UTC_TIMESTAMP())
  UNIQUE KEY uq_video_metrics (job_id, network, marco),
  CONSTRAINT fk_video_metrics_job FOREIGN KEY (job_id) REFERENCES video_jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version) VALUES ('017_video_melhorias');
