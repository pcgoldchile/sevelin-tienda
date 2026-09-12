-- 27 · Espejo de productos.urgencia_stock_web (POS)
-- =================================================
-- Contraparte de sevelin-pos-oficial/sql/40-urgencia-stock-web.sql. El POS
-- decide en qué productos se permite el aviso de pocas unidades; acá se
-- recibe por el Database Webhook y la tienda arma el texto con el stock
-- real.
--
-- Default true igual que en el POS, para que un producto sincronizado
-- antes de que existiera la columna no quede silenciado sin que nadie lo
-- haya pedido.
--
-- Idempotente.

alter table productos_web
  add column if not exists urgencia_stock_web boolean not null default true;

comment on column productos_web.urgencia_stock_web is
  'Espejo de productos.urgencia_stock_web en el POS. Habilita el aviso de pocas unidades; el texto y el número los calcula la tienda con stock_web.';
