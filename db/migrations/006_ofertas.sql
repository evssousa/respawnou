-- Respawnou · migration 006 · jogos grátis automáticos (Epic Games Store + GamerPower)
SET NAMES utf8mb4;

-- free_games passa a ser preenchida pelo robô (job "ofertas", dentro da coleta, no máximo a cada 3 h).
-- source/external_id identificam a oferta na origem; post_id liga à matéria escrita sobre ela.
ALTER TABLE free_games
  ADD COLUMN source       VARCHAR(20)   NOT NULL DEFAULT 'manual' AFTER id,
  ADD COLUMN external_id  VARCHAR(160)  NULL AFTER source,
  ADD COLUMN image_url    VARCHAR(500)  NULL AFTER url,
  ADD COLUMN worth        VARCHAR(40)   NULL AFTER image_url,
  ADD COLUMN description  TEXT          NULL AFTER worth,
  ADD COLUMN extra        JSON          NULL AFTER description,
  ADD COLUMN post_id      INT UNSIGNED  NULL AFTER ends_at,
  ADD COLUMN post_status  VARCHAR(20)   NULL AFTER post_id,
  ADD COLUMN post_note    VARCHAR(500)  NULL AFTER post_status,
  ADD COLUMN updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD UNIQUE KEY uq_free_games_source (source, external_id),
  ADD CONSTRAINT fk_free_games_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE SET NULL;

INSERT INTO schema_migrations (version) VALUES ('006_ofertas');
