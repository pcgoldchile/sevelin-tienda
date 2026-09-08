-- 22-khipu.sql
-- ------------------------------------------------------------
-- Segundo medio de pago para el checkout (transferencia bancaria vía
-- Khipu), en paralelo a Flow (webpay/tarjetas) — ver src/lib/khipu.ts.
-- `metodo_pago` distingue qué pasarela generó el pago de cada pedido;
-- `khipu_payment_id` es el equivalente de flow_token/flow_order pero para
-- Khipu (su API usa un solo identificador de 12 caracteres, ver
-- POST /v3/payments en developers.khipu.com).
--
-- Los pedidos ya existentes (todos hechos con Flow) quedan con
-- metodo_pago='FLOW' vía el DEFAULT — no hace falta backfill manual.
--
-- Idempotente: se puede correr más de una vez sin romper nada.

ALTER TABLE pedidos_web ADD COLUMN IF NOT EXISTS metodo_pago TEXT NOT NULL DEFAULT 'FLOW';
ALTER TABLE pedidos_web ADD COLUMN IF NOT EXISTS khipu_payment_id TEXT UNIQUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_web_metodo_pago_check'
  ) THEN
    ALTER TABLE pedidos_web
      ADD CONSTRAINT pedidos_web_metodo_pago_check CHECK (metodo_pago IN ('FLOW', 'KHIPU'));
  END IF;
END $$;

COMMENT ON COLUMN pedidos_web.metodo_pago IS
  'Pasarela de pago usada para este pedido: FLOW (webpay/tarjetas) o KHIPU '
  '(transferencia bancaria). Elegida por el cliente en el checkout — ver '
  'formulario-checkout.tsx y POST /api/checkout.';
COMMENT ON COLUMN pedidos_web.khipu_payment_id IS
  'Identificador del pago en Khipu (payment_id, 12 caracteres alfanuméricos '
  'devueltos por POST /v3/payments). Equivalente a flow_token/flow_order '
  'pero para pagos hechos con Khipu — ver src/lib/khipu.ts.';

-- ============================================================
-- VERIFICACIÓN
--   Deben aparecer ambas columnas.
-- ============================================================
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'pedidos_web' AND column_name IN ('metodo_pago', 'khipu_payment_id');
