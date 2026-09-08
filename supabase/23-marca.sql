-- ============================================================
-- SEVELIN TIENDA — Migración 23
-- Marca del producto (espejo de sevelin-pos-oficial/sql/38-marca-producto.sql)
-- ------------------------------------------------------------
-- El POS es la fuente de verdad del catálogo; esta columna la llena el
-- trigger de sincronización (`POST /api/sync/producto`), nunca se edita
-- acá a mano.
--
-- Sirve para dos cosas en la tienda:
--   1. mostrar la marca en la ficha del producto,
--   2. el JSON-LD `Product` de schema.org, donde `brand` es uno de los
--      campos que Google usa para entender de qué producto se trata
--      (hoy ese bloque no la incluye porque no existía el dato).
--
-- Idempotente.
-- ============================================================

alter table productos_web
  add column if not exists marca text;

comment on column productos_web.marca is
  'Marca del fabricante, sincronizada desde productos.marca del POS. NULL en genéricos.';
