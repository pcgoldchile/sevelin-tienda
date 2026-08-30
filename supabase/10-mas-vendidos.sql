-- ============================================================
-- SEVELIN TIENDA — Unidades vendidas (para "Destacados")
-- Archivo: supabase/10-mas-vendidos.sql · Ejecutar después del 09.
-- Idempotente.
-- ------------------------------------------------------------
-- PARA QUÉ
--   La portada mostraba en "Destacados" los primeros productos del
--   catálogo por orden alfabético, que no es un criterio: lo que se
--   quiere mostrar es lo que MÁS SE VENDE.
--
--   Ese dato vive en el POS (`venta_items`), donde está el grueso de las
--   ventas del negocio — las del mostrador, que son la mayoría. Los
--   `pedidos_web` de esta tienda solos darían una foto muy parcial.
--
-- POR QUÉ UNA COLUMNA Y NO UNA CONSULTA CRUZADA
--   Esta tienda NUNCA se conecta al Supabase del POS directo (regla dura
--   del proyecto, ver CLAUDE.md). El dato viaja igual que el resto del
--   catálogo: el POS lo empuja con el secreto compartido, acá solo se
--   guarda. Es un contador desnormalizado a propósito — se refresca cada
--   vez que el POS lo sincroniza, y si queda desactualizado el único
--   efecto es que el orden de la portada envejece, nada más.
-- ============================================================

ALTER TABLE productos_web
  ADD COLUMN IF NOT EXISTS unidades_vendidas INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN productos_web.unidades_vendidas IS
  'Unidades vendidas históricas según el POS (venta_items). Lo empuja el POS vía POST /api/sync/mas-vendidos; se usa solo para ordenar "Destacados".';

-- El orden de la portada es "más vendidos primero" sobre el catálogo
-- publicado: el índice parcial cubre exactamente esa consulta.
CREATE INDEX IF NOT EXISTS idx_productos_web_mas_vendidos
  ON productos_web (unidades_vendidas DESC)
  WHERE publicado_web = TRUE;

-- ------------------------------------------------------------
-- VERIFICACIÓN (opcional)
--   SELECT nombre, unidades_vendidas FROM productos_web
--    WHERE publicado_web ORDER BY unidades_vendidas DESC LIMIT 10;
-- ------------------------------------------------------------
