-- Recargo por medio de pago en el pedido.
-- ------------------------------------------------------------
-- Ver docs/PLAN-PRECIOS-DIFERENCIADOS.md. Desde el 08-09-2026 el checkout
-- cobra un 3% adicional SOLO cuando el cliente paga con tarjeta a través de
-- Flow (2,89% + IVA de comisión). Khipu, el mostrador y los links de pago de
-- TUU van al precio base.
--
-- Se guarda el monto ya calculado, no el porcentaje: si mañana el recargo
-- cambia, los pedidos viejos tienen que seguir explicando el total que
-- realmente se cobró. Mismo criterio que `venta_items.costo_unitario` en el
-- POS, que guarda el costo del momento y no el actual.
--
-- `total` sigue siendo el monto final cobrado (ya incluye este recargo): es
-- lo que se le pide a Flow y lo que va en la boleta. Esta columna existe
-- para poder EXPLICAR ese total — sin ella, la suma de los ítems más el
-- envío no cuadra con el total y parece un error de cálculo.
--
-- Idempotente.

ALTER TABLE pedidos_web
  ADD COLUMN IF NOT EXISTS recargo_medio_pago integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN pedidos_web.recargo_medio_pago IS
  'Recargo cobrado por pagar con tarjeta en el checkout web (Flow). 0 en Khipu y en todo pedido anterior al 08-09-2026. Ya está incluido dentro de total.';

-- Verificación:
--   select numero_pedido, total, recargo_medio_pago, metodo_pago
--   from pedidos_web order by creado_en desc limit 5;
