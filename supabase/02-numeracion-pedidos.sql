-- ============================================================
-- SEVELIN TIENDA — Migración 02
-- Numeración atómica de pedidos ("WEB-000001"). Fase 3 (checkout).
-- Ejecutar en el SQL Editor del proyecto Supabase Web. Idempotente.
-- ============================================================
--
-- generar_numero_pedido() reemplaza cualquier conteo hecho desde la app
-- (ej. "contar filas de pedidos_web + 1"): dos checkouts casi simultáneos
-- podrían leer el mismo conteo y generar el mismo numero_pedido, chocando
-- contra el UNIQUE de la columna. nextval() sobre una SEQUENCE de Postgres
-- es atómico entre transacciones concurrentes — mismo criterio que
-- descontar_stock_venta del POS resuelve la carrera de stock.
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS pedidos_web_numero_seq START 1;

CREATE OR REPLACE FUNCTION generar_numero_pedido()
RETURNS TEXT AS $$
BEGIN
  RETURN 'WEB-' || lpad(nextval('pedidos_web_numero_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFICACIÓN
--   Debe devolver algo como "WEB-000001" (o el próximo correlativo libre).
-- ============================================================
SELECT generar_numero_pedido();
