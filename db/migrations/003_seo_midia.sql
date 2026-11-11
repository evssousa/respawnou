-- Respawnou · migration 003 · SEO e mídia das matérias
SET NAMES utf8mb4;

-- Campos de SEO do post (o robô preenche; o admin poderá editar).
ALTER TABLE posts
  ADD COLUMN meta_description VARCHAR(200) NULL AFTER excerpt,
  ADD COLUMN focus_keyword    VARCHAR(120) NULL AFTER meta_description,
  ADD COLUMN tags             JSON         NULL AFTER focus_keyword;

-- Mídia que veio no RSS (imagens e vídeos), guardada na coleta: os sites que bloqueiam
-- robôs na página da matéria (403) ainda mandam as imagens pelo feed.
ALTER TABLE feed_items
  ADD COLUMN media JSON NULL AFTER summary;

-- Matérias mais completas (regra herdada do Anime Profile: mínimo de 350 palavras).
UPDATE settings SET value = '350' WHERE name = 'robot_min_words';

INSERT INTO schema_migrations (version) VALUES ('003_seo_midia');
