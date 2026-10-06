-- ============================================================
-- 41 · Cómo recibe el cliente un pedido con algo "por llegar", y
--      el aviso "listo para retiro" (06-10-2026)
-- ------------------------------------------------------------
-- Decisión del dueño (06-10-2026):
--   · Retiro en tienda: siempre gratis. El cliente NO viene hasta que se le
--     avisa por correo "tu pedido está listo para retiro" (el POS tiene un
--     botón para eso): encontrar los productos, revisarlos y dejarlos listos
--     toma tiempo.
--   · Despacho a domicilio: se cobra y queda pagado por adelantado, también
--     por lo que está por llegar. Si el pedido mezcla productos que ya están
--     con productos por llegar, el CLIENTE elige:
--       JUNTO      → un solo envío cuando llegue lo que falta (paga 1).
--       DOS_ENVIOS → ahora lo que está, después lo por llegar (paga los 2).
--
-- entrega_por_llegar: NULL en todo pedido que no mezcla (lo normal) y en los
--   de retiro, donde no hay nada que elegir.
-- retiro_avisos: historial de los avisos "listo para retiro" que mandó el
--   POS: [{ "en": "2026-10-06T19:30:00Z", "skus": ["abc", "def"] }, …].
--   Un pedido con algo por llegar puede tener dos: lo que estaba, y después
--   lo que llegó.
--
-- Columnas nuevas en una tabla que ya tiene RLS: no hay políticas que tocar.
-- Idempotente.
-- ============================================================

alter table pedidos_web
  add column if not exists entrega_por_llegar text null,
  add column if not exists retiro_avisos jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_web_entrega_por_llegar_check') then
    alter table pedidos_web
      add constraint pedidos_web_entrega_por_llegar_check
      check (entrega_por_llegar is null or entrega_por_llegar in ('JUNTO', 'DOS_ENVIOS'));
  end if;
end $$;

comment on column pedidos_web.entrega_por_llegar is
  'Pedido con despacho que mezcla productos en stock y por llegar: JUNTO = un envío cuando llegue todo; DOS_ENVIOS = dos envíos, los dos cobrados en costo_envio. NULL = no aplica.';
comment on column pedidos_web.retiro_avisos is
  'Avisos "listo para retiro" enviados desde el POS: [{en, skus}]. Lo escribe el POS (Pedidos Web).';
