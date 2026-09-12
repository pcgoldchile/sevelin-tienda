-- 31 · Precio a consultar
-- =======================
-- Espejo de sevelin-pos-oficial/sql/45-precio-a-consultar.sql.
--
-- Un producto (hoy, servicios técnicos cuyo valor depende del equipo) con
-- esta marca se muestra en la tienda, pero no se puede agregar al carrito
-- ni pagar en línea: la ficha ofrece "Cotizar por WhatsApp" y
-- POST /api/checkout lo rechaza igual si llega por otro camino (carrito
-- compartido, carrito recuperado, alguien probando la API).
--
-- DEBE CORRER ANTES de desplegar la ruta de sync que copia la columna: si
-- el webhook manda un campo que la tabla no tiene, el upsert falla y el
-- producto deja de sincronizarse.
--
-- Idempotente.

alter table productos_web
  add column if not exists precio_a_consultar boolean not null default false;

comment on column productos_web.precio_a_consultar is
  'Precio base que depende del equipo: no se vende en línea, solo se cotiza por WhatsApp. Viene del POS.';
