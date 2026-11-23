-- 014: imagens próprias nos slides do Instagram (docs/instagram-stories-videos.md, frente C).
SET NAMES utf8mb4;
ALTER TABLE social_posts
  ADD COLUMN overrides JSON NULL AFTER payload;   -- {"trocas":{"1":{"src":"/media/social/uploads/...","foco":"auto"}},"extras":[{"src":"...","foco":"auto","legenda":"..."}]}

INSERT INTO schema_migrations (version) VALUES ('014_social_uploads');
