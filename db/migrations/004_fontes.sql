-- Respawnou · migration 004 · troca de fontes
SET NAMES utf8mb4;

-- Polygon derruba a conexão vinda do servidor da Hostinger (UND_ERR_SOCKET "other side closed"):
-- bloqueio do lado deles, que o robô respeita. Fica desativado (não apagado, para o histórico).
UPDATE feeds SET active = 0, last_error = 'desativado: bloqueia o servidor (conexão derrubada)' WHERE name = 'Polygon';

-- Novas fontes (verificadas em 2026-11-11: feed, imagens no RSS e página da matéria acessíveis).
INSERT IGNORE INTO feeds (name, url, language, section_hint, weight) VALUES
  ('GamesRadar+',   'https://www.gamesradar.com/rss/',       'en', NULL, 7),
  ('Game Informer', 'https://gameinformer.com/news.xml',     'en', NULL, 7),
  ('Kotaku',        'https://kotaku.com/rss',                'en', NULL, 6),
  ('Destructoid',   'https://www.destructoid.com/feed/',     'en', NULL, 5),
  ('Siliconera',    'https://www.siliconera.com/feed/',      'en', NULL, 4);

INSERT INTO schema_migrations (version) VALUES ('004_fontes');
