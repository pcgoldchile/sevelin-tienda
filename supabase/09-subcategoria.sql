-- ============================================================
-- SEVELIN WEB — Migración 09
-- Subcategoría del catálogo (ej. "Fuentes de poder" dentro de
-- "Componentes PC"). El POS ya administraba un árbol de 2 niveles en
-- producto_categorias (con parent_id) desde hace tiempo, pero nunca
-- sincronizaba esa relación acá — solo el nombre de la categoría de nivel
-- superior. Ver sevelin-pos-oficial/sql/25-subcategoria-web-sync.sql.
-- ============================================================

alter table productos_web
  add column if not exists subcategoria text;

-- ============================================================
-- VERIFICACIÓN
--   select column_name from information_schema.columns
--    where table_name = 'productos_web' and column_name = 'subcategoria';
--   -- debe devolver 1 fila
-- ============================================================
