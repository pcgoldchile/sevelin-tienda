-- 32 · Cuándo trae su equipo el cliente (servicios técnicos)
-- =========================================================
-- QUÉ RESUELVE (dueño, 12-09-2026)
-- Un cliente puede pagar en línea un servicio técnico de precio fijo para
-- reservarlo, pero el equipo lo tiene que traer al local. Sin saber cuándo
-- llega, no hay cómo preparar su llegada.
--
-- CÓMO
-- Se reusa la agenda del retiro (supabase/30): mismas columnas retiro_fecha
-- y retiro_bloque, mismo selector en el checkout. Lo único que cambia es
-- QUÉ significa esa fecha, y eso lo dice agenda_tipo:
--   RETIRO          → el cliente pasa a BUSCAR su pedido (lo de siempre).
--   ENTREGA_EQUIPO  → el cliente TRAE su equipo para el servicio.
--
-- Una columna aparte, y no deducirlo de los ítems, porque el correo de
-- recordatorio y el panel del POS tienen que decir cosas distintas ("te lo
-- dejamos listo" vs. "trae tu equipo"), y los ítems guardados en el pedido
-- no traen la categoría del producto.
--
-- En un carrito solo de servicios la fecha es obligatoria: es justamente
-- para lo que existe. El recordatorio se manda el día ANTES (el del retiro
-- sale la misma mañana).
--
-- Idempotente.

alter table pedidos_web
  add column if not exists agenda_tipo text not null default 'RETIRO'
  check (agenda_tipo in ('RETIRO', 'ENTREGA_EQUIPO'));

comment on column pedidos_web.agenda_tipo is
  'Qué significa retiro_fecha: RETIRO (pasa a buscar su pedido) o ENTREGA_EQUIPO (trae su equipo para un servicio técnico).';
