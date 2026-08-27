-- ============================================================
-- SEVELIN TIENDA — Migración 04
-- Recibe el umbral de stock configurable por producto (módulo
-- "Página Web → Categorías" del POS, ver
-- sevelin-pos-oficial/sql/23-categorias-web-y-umbral-stock.sql).
--
-- NULL = usa el default de la tienda (+5, ver formatoStock en
-- src/lib/formato.ts). Con valor, la tienda muestra "Más de {umbral-1}
-- disponibles" cuando stock_web >= umbral, y el stock exacto si no.
--
-- IMPORTANTE: correr esta migración ANTES de que el POS empiece a mandar
-- stock_umbral_web (ver src/app/api/sync/producto/route.ts) — si no, el
-- trigger de sync del POS fallaría escribiendo a una columna inexistente.
-- ============================================================

alter table productos_web
  add column if not exists stock_umbral_web integer;

-- ============================================================
-- VERIFICACIÓN
--   select column_name from information_schema.columns
--    where table_name = 'productos_web' and column_name = 'stock_umbral_web';
--   -- debe devolver 1 fila
-- ============================================================
