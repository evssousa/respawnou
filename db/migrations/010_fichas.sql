-- 010_fichas: dados extras das fichas de jogos (IGDB e Steam) e controle de indexação (docs/crescimento.md, frente 2).
ALTER TABLE games
  ADD COLUMN releases        JSON              NULL AFTER release_label,
  ADD COLUMN critic_score    DECIMAL(4,1)      NULL,
  ADD COLUMN critic_count    SMALLINT UNSIGNED NULL,
  ADD COLUMN modes           JSON              NULL,
  ADD COLUMN franchise       VARCHAR(160)      NULL,
  ADD COLUMN similar_igdb    JSON              NULL,
  ADD COLUMN steam_appid     INT UNSIGNED      NULL,
  ADD COLUMN pc_min          TEXT              NULL,
  ADD COLUMN pc_rec          TEXT              NULL,
  ADD COLUMN price_brl       VARCHAR(40)       NULL,
  ADD COLUMN languages       JSON              NULL,
  ADD COLUMN steam_synced_at DATETIME          NULL,
  ADD COLUMN index_from      DATETIME          NULL,
  ADD KEY ix_games_index (index_from);

INSERT INTO schema_migrations (version) VALUES ('010_fichas');
