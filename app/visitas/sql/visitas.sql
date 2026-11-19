-- 013: contador de visitas próprio, sem cookie (docs/plano-painel-visitas.md).
-- Tudo agregado por dia de Brasília. Nada de IP nem de identificador permanente.

-- Totais do dia: páginas vistas, entradas (inícios de visita), visitantes aproximados e robôs ignorados.
CREATE TABLE IF NOT EXISTS visit_daily (
  day DATE NOT NULL PRIMARY KEY,
  pageviews INT UNSIGNED NOT NULL DEFAULT 0,
  entries INT UNSIGNED NOT NULL DEFAULT 0,
  visitors INT UNSIGNED NOT NULL DEFAULT 0,
  bots INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Páginas vistas por endereço e dia. O endereço vem de location.pathname (ASCII), sem query string.
CREATE TABLE IF NOT EXISTS visit_pages (
  day DATE NOT NULL,
  path VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  kind VARCHAR(20) CHARACTER SET ascii NOT NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  entries INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path),
  KEY idx_visit_pages_kind (day, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contagens por dimensão e dia, só nas entradas: origem, domínio de origem, campanha, aparelho, navegador, sistema, idioma/país.
CREATE TABLE IF NOT EXISTS visit_dims (
  day DATE NOT NULL,
  dim VARCHAR(16) CHARACTER SET ascii NOT NULL,
  value VARCHAR(120) NOT NULL,
  n INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, dim, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Códigos de visitante do dia (hash com sal diário), só para não contar a mesma pessoa duas vezes no dia.
-- A limpeza apaga tudo o que não é de hoje.
CREATE TABLE IF NOT EXISTS visit_seen (
  day DATE NOT NULL,
  vhash BINARY(16) NOT NULL,
  PRIMARY KEY (day, vhash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
