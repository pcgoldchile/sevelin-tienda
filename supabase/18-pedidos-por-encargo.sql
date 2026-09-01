-- ============================================================
-- Pedidos por Encargo (dropshipping / retiro en tienda)
-- ------------------------------------------------------------
-- es_pedido_encargo: llega sincronizado desde el POS (ver
-- sevelin-pos-oficial/sql/30-pedidos-por-encargo.sql y
-- src/app/api/sync/producto/route.ts). Un producto de Encargo se muestra
-- y se puede comprar en /pedidos-por-encargo sin importar su stock_web.
--
-- tipo_pedido: se fija en POST /api/checkout según si los ítems del
-- carrito son de Encargo o normales (nunca se mezclan en un mismo
-- pedido). Sirve para filtrar el panel "Pedidos Web" del POS.
-- ============================================================

ALTER TABLE productos_web ADD COLUMN IF NOT EXISTS es_pedido_encargo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE pedidos_web ADD COLUMN IF NOT EXISTS tipo_pedido TEXT NOT NULL DEFAULT 'NORMAL';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_web_tipo_pedido_check'
  ) THEN
    ALTER TABLE pedidos_web ADD CONSTRAINT pedidos_web_tipo_pedido_check
      CHECK (tipo_pedido IN ('NORMAL', 'ENCARGO'));
  END IF;
END $$;
