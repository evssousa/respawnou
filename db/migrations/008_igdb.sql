-- Respawnou · migration 008 · jogos e lançamentos vindos do IGDB
SET NAMES utf8mb4;

-- games passa a ser preenchida pelo robô (job "jogos", dentro da coleta, no máximo a cada 6 h).
ALTER TABLE games
  ADD COLUMN igdb_id        INT UNSIGNED  NULL AFTER rawg_id,
  ADD COLUMN igdb_url       VARCHAR(300)  NULL AFTER igdb_id,
  ADD COLUMN hypes          INT UNSIGNED  NOT NULL DEFAULT 0 AFTER igdb_url,     -- interesse no IGDB (ordena a lista)
  ADD COLUMN release_label  VARCHAR(40)   NULL AFTER release_date,               -- data imprecisa ("4º tri. de 2027", "2027")
  ADD COLUMN cover_url      VARCHAR(500)  NULL AFTER image_url,                  -- capa vertical
  ADD COLUMN screenshots    JSON          NULL AFTER cover_url,
  ADD COLUMN trailer        VARCHAR(20)   NULL AFTER screenshots,                -- id do vídeo no YouTube
  ADD COLUMN summary_en     TEXT          NULL AFTER description,                -- resumo original (inglês), base da descrição em português
  ADD COLUMN synced_at      DATETIME      NULL,
  ADD UNIQUE KEY uq_games_igdb (igdb_id);

INSERT INTO schema_migrations (version) VALUES ('008_igdb');
