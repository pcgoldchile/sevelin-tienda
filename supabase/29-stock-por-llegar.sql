-- 29 · Espejo de productos.stock_por_llegar (POS)
-- ================================================
-- Contraparte de sevelin-pos-oficial/sql/44. Es el tope de lo que se puede
-- RESERVAR cuando el stock real llegó a 0; con unidades disponibles manda
-- el stock real. Sin esto el carrito permitía 99 unidades de algo que en
-- la tienda tenía una sola, y el pago se cobraba igual.
--
-- Idempotente.

alter table productos_web
  add column if not exists stock_por_llegar integer not null default 0;

comment on column productos_web.stock_por_llegar is
  'Espejo de productos.stock_por_llegar. Tope de reserva cuando stock_web es 0. Nunca se vende lo que no va a existir.';
