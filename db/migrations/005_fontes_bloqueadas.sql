-- Respawnou · migration 005 · fontes que bloqueiam o servidor
SET NAMES utf8mb4;

-- Destructoid e Siliconera respondem 403 ao servidor da Hostinger (do PC local funcionam).
-- O robô respeita o bloqueio: ficam desativadas.
UPDATE feeds SET active = 0, last_error = 'desativado: HTTP 403 para o servidor' WHERE name IN ('Destructoid', 'Siliconera');

-- Ofertas de varejo que já estavam na fila (a regra nova da coleta só vale para itens novos).
UPDATE feed_items SET status = 'skipped', reason = 'oferta de varejo'
WHERE status = 'new' AND (title LIKE '%Black Friday%' OR title LIKE '%Prime Day%' OR title LIKE '%\% off%'
  OR title LIKE '%deal on %' OR title LIKE '%deals on %' OR title LIKE '%deal for %' OR title LIKE '%lowest price%');

INSERT INTO schema_migrations (version) VALUES ('005_fontes_bloqueadas');
