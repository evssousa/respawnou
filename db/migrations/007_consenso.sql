-- Respawnou · migration 007 · consenso da crítica (editoria Reviews)
SET NAMES utf8mb4;

-- Cada análise com nota lida dos feeds (a nota vem do JSON-LD reviewRating da própria página).
CREATE TABLE critic_reviews (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  feed_id       INT UNSIGNED  NULL,
  outlet        VARCHAR(80)   NOT NULL,                 -- veículo (IGN, Eurogamer...)
  url           VARCHAR(600)  NOT NULL,
  url_hash      CHAR(64)      NOT NULL,
  title         VARCHAR(400)  NOT NULL,
  game_name     VARCHAR(200)  NOT NULL,                 -- nome do jogo tirado do título da análise
  game_key      VARCHAR(200)  NOT NULL,                 -- nome normalizado, agrupa as análises do mesmo jogo
  item_name     VARCHAR(200)  NULL,                     -- itemReviewed.name do JSON-LD
  platforms     JSON          NULL,
  rating        DECIMAL(6,2)  NOT NULL,                 -- nota como publicada
  best          DECIMAL(6,2)  NOT NULL,                 -- nota máxima da escala do veículo
  score10       DECIMAL(4,2)  NOT NULL,                 -- convertida para 0 a 10
  author        VARCHAR(160)  NULL,
  published_at  DATETIME      NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_critic_reviews_url (url_hash),
  KEY ix_critic_reviews_game (game_key, published_at),
  CONSTRAINT fk_critic_reviews_feed FOREIGN KEY (feed_id) REFERENCES feeds (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Um consenso por jogo: liga ao post e guarda tentativas que não deram certo.
CREATE TABLE critic_consensus (
  game_key     VARCHAR(200)  NOT NULL PRIMARY KEY,
  game_name    VARCHAR(200)  NOT NULL,
  post_id      INT UNSIGNED  NULL,
  status       VARCHAR(20)   NOT NULL,                  -- used | skipped | failed
  note         VARCHAR(500)  NULL,
  critics      INT UNSIGNED  NOT NULL DEFAULT 0,        -- quantas análises havia na última tentativa/atualização
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_critic_consensus_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feeds só de análises (mais análises por jogo). O nome antes de " · " é o veículo.
INSERT IGNORE INTO feeds (name, url, language, section_hint, weight) VALUES
  ('IGN · análises',           'https://www.ign.com/rss/articles/feed?tags=review', 'en', 'reviews', 8),
  ('Game Informer · análises', 'https://gameinformer.com/reviews.xml',              'en', 'reviews', 7);

INSERT INTO schema_migrations (version) VALUES ('007_consenso');
