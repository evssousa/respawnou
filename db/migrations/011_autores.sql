-- 011_autores: cada matéria do robô passa a ser assinada pelo autor de IA da editoria (docs/crescimento.md, D6).
-- Só mexe em posts feitos pelo robô (origin = 'auto') que ainda estão com o nome genérico; matérias manuais não mudam.
UPDATE posts SET author = 'Nox'   WHERE origin = 'auto' AND author = 'Redação Respawnou' AND section = 'noticias';
UPDATE posts SET author = 'Lume'  WHERE origin = 'auto' AND author = 'Redação Respawnou' AND section = 'artigos';
UPDATE posts SET author = 'Vero'  WHERE origin = 'auto' AND author = 'Redação Respawnou' AND section = 'reviews';
UPDATE posts SET author = 'Atlas' WHERE origin = 'auto' AND author = 'Redação Respawnou' AND section = 'guias';
UPDATE posts SET author = 'Loot'  WHERE origin = 'auto' AND author = 'Redação Respawnou' AND section = 'promocoes';

INSERT INTO schema_migrations (version) VALUES ('011_autores');
