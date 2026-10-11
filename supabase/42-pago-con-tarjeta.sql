-- 42 · Pago con tarjeta: link de pago de Haulmer (puente) y Webpay Plus
-- =====================================================================
-- POR QUÉ (dueño, 11-10-2026): "quiero ofrecer tarjeta en sevelin.cl". Decidió
-- Webpay Plus de Transbank y, mientras termina el trámite, un botón "Pagar
-- con tarjeta" que abre su link de pago (tuu.cl/sevelin).
--
--   LINK_TUU → el pedido queda CREADO esperando el pago. El cliente paga en el
--              link y manda el comprobante; el dueño aprieta "Confirmar pago"
--              en el POS y recién ahí el pedido pasa a PAGADO.
--   WEBPAY   → Transbank confirma solo cuando el cliente vuelve del formulario
--              de pago (no hay webhook: se confirma en la ruta de retorno).
--
-- No se agrega un estado nuevo: "esperando pago" es CREADO, como siempre. Lo
-- que distingue a un pedido que espera una confirmación manual es metodo_pago.
--
-- Idempotente. La tabla ya tiene RLS (el cliente solo lee SUS pedidos); las
-- columnas nuevas no guardan nada que no sea de su propia compra.

alter table pedidos_web drop constraint if exists pedidos_web_metodo_pago_check;
alter table pedidos_web
  add constraint pedidos_web_metodo_pago_check
  check (metodo_pago in ('FLOW', 'KHIPU', 'LINK_TUU', 'WEBPAY'));

-- Token de la transacción en curso de Webpay (64 caracteres). Cambia en cada
-- intento de pago: es lo que permite encontrar el pedido cuando Transbank
-- devuelve al cliente.
alter table pedidos_web add column if not exists webpay_token text;
create unique index if not exists pedidos_web_webpay_token_idx
  on pedidos_web (webpay_token) where webpay_token is not null;

-- Comprobante del pago con tarjeta. Webpay: orden de compra, código de
-- autorización, fecha, tipo de pago, cuotas y los 4 últimos dígitos (lo que
-- Transbank pide mostrar en la página de resultado). Link: si fue débito o
-- crédito y la referencia que anotó el dueño al confirmar.
alter table pedidos_web add column if not exists pago_detalle jsonb;

-- Cuándo quedó confirmado el pago (a mano o por Webpay).
alter table pedidos_web add column if not exists pago_confirmado_en timestamptz;

-- Recordatorio "tu pedido quedó sin pagar". Hasta ahora un carrito que llegaba
-- a convertirse en pedido dejaba de recibir el recordatorio de abandono, así
-- que quien llegaba al banco y no pagaba no recibía nada.
alter table pedidos_web add column if not exists recordatorio_pago_enviado_en timestamptz;

comment on column pedidos_web.metodo_pago is
  'Cómo se paga el pedido: KHIPU (transferencia), LINK_TUU (tarjeta por el link de pago de Haulmer, confirmación manual desde el POS), WEBPAY (tarjeta por Webpay Plus de Transbank) o FLOW (apagado desde el 09-09-2026).';
comment on column pedidos_web.pago_detalle is
  'Comprobante del pago con tarjeta (Webpay) o datos de la confirmación manual (link de pago). Ver src/lib/webpay.ts y src/lib/pago-confirmado.ts.';

select column_name, data_type from information_schema.columns
 where table_name = 'pedidos_web'
   and column_name in ('webpay_token', 'pago_detalle', 'pago_confirmado_en', 'recordatorio_pago_enviado_en');
