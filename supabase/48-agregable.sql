-- 48 · "➕ Agregable": un accesorio opcional que se suma con una casilla junto al botón de compra (21-10-2026)
-- ============================================================
-- Pedido del dueño: en los monitores que no tienen HDMI, ofrecer el
-- adaptador HDMI a VGA "como sugerencia, tipo agregable", en la misma
-- página del monitor. Distinto de "Complementa tu compra" (un carrusel al
-- final de la ficha): es UNO solo, va en el cuadro de compra y se agrega
-- al carrito junto con el producto si el cliente marca la casilla.
--
-- Lo manda el POS (sql/110 de sevelin-pos-oficial: productos.agregable_id y
-- agregable_motivo) por el webhook de siempre (POST /api/sync/producto). Es
-- un id del POS (producto_pos_id), no un id de esta tabla. La ficha lo
-- muestra solo si está publicado, con stock y se puede comprar en línea.
--
-- Esta va ANTES que la del POS: el receptor del webhook ya escribe estas
-- columnas, y sin ellas el guardado del producto entero fallaría.
--
-- No crea tablas (RLS de productos_web sin cambios). Idempotente.

alter table productos_web add column if not exists agregable_pos_id integer;
alter table productos_web add column if not exists agregable_motivo text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'productos_web_agregable_motivo_largo') then
    alter table productos_web add constraint productos_web_agregable_motivo_largo
      check (agregable_motivo is null or char_length(agregable_motivo) <= 140);
  end if;
end $$;

comment on column productos_web.agregable_pos_id is
  'Accesorio opcional del cuadro de compra (productos.agregable_id del POS). Id del POS.';
comment on column productos_web.agregable_motivo is
  'Frase corta de para qué sirve el agregable (ej. "Para conectarlo a un PC que solo tiene HDMI.").';
