-- Respawnou · migration 002 · fontes do robô e configurações de publicação
SET NAMES utf8mb4;

-- Fontes RSS iniciais (verificadas em 2026-11-10). Peso 1 a 10: prioridade na escolha de pautas.
-- Sites que bloqueiam robôs na página da matéria entram pelo texto do próprio RSS.
INSERT IGNORE INTO feeds (name, url, language, section_hint, weight) VALUES
  ('IGN',                'https://www.ign.com/rss/articles/feed',     'en', NULL, 8),
  ('GameSpot',           'https://www.gamespot.com/feeds/mashup/',    'en', NULL, 8),
  ('PC Gamer',           'https://www.pcgamer.com/rss/',              'en', NULL, 7),
  ('Eurogamer',          'https://www.eurogamer.net/feed',            'en', NULL, 7),
  ('Polygon',            'https://www.polygon.com/rss/index.xml',     'en', NULL, 6),
  ('Rock Paper Shotgun', 'https://www.rockpapershotgun.com/feed',     'en', NULL, 5),
  ('VG247',              'https://www.vg247.com/feed',                'en', NULL, 5),
  ('Push Square',        'https://www.pushsquare.com/feeds/latest',   'en', NULL, 5),
  ('Pure Xbox',          'https://www.purexbox.com/feeds/latest',     'en', NULL, 5),
  ('Nintendo Life',      'https://www.nintendolife.com/feeds/latest', 'en', NULL, 5),
  ('Gematsu',            'https://www.gematsu.com/feed',              'en', NULL, 4);

-- Liga o robô. As rotas /api/cron/* só respondem com CRON_TOKEN configurado.
UPDATE settings SET value = 'true' WHERE name = 'robot_enabled';
UPDATE settings SET value = '["noticias","promocoes"]' WHERE name = 'robot_sections';

INSERT IGNORE INTO settings (name, value) VALUES
  ('robot_min_words', '300'),   -- mínimo de palavras no corpo
  ('robot_start_hour', '8'),    -- janela de publicação, horário de Brasília
  ('robot_end_hour', '22');

INSERT INTO schema_migrations (version) VALUES ('002_robo');
