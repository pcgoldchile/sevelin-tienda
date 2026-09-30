-- 38 · "Complementa tu compra": productos complementarios elegidos en el POS (30-09-2026)
-- ============================================================
-- Pedido del dueño: en la ficha, un carrusel con productos relacionados
-- (pasta térmica, limpieza, cables...) que él pueda elegir desde el POS.
-- Distinto de "También te puede interesar", que muestra PARECIDOS de la
-- misma categoría y se arma solo.
--
-- Lo manda el POS (sql/75 de sevelin-pos-oficial: productos.relacionados_ids,
-- en orden) por el webhook de siempre (POST /api/sync/producto). Son ids del
-- POS (producto_pos_id), no ids de esta tabla. La ficha muestra solo los que
-- están publicados y con stock, en el orden elegido.
--
-- No crea tablas (RLS de productos_web sin cambios). Idempotente.

alter table productos_web add column if not exists relacionados_pos_ids integer[] not null default '{}';

comment on column productos_web.relacionados_pos_ids is
  'Complementarios elegidos en el POS (productos.relacionados_ids), en orden. Ids del POS.';
