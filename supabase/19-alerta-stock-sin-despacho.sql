-- 19-alerta-stock-sin-despacho.sql
-- ------------------------------------------------------------
-- Reporte de Seguridad Consolidado B, hallazgo #4: un pago puede quedar
-- confirmado en Flow (dinero real cobrado) mientras el ajuste de stock en
-- el POS falla (STOCK_INSUFICIENTE) por una condición de carrera entre dos
-- checkouts casi simultáneos de la última unidad. Antes, ese error solo se
-- logueaba (console.error) y el pedido quedaba en PAGADO como cualquier
-- otro, sin ninguna señal visible de que necesita revisión manual.
--
-- `nota_interna` guarda el detalle técnico del error para quien revise el
-- pedido (nunca se le muestra al cliente) — reutilizable a futuro para
-- cualquier otra nota administrativa, no solo esta alerta.
--
-- Idempotente: se puede correr más de una vez sin romper nada.

ALTER TABLE pedidos_web ADD COLUMN IF NOT EXISTS nota_interna TEXT;

COMMENT ON COLUMN pedidos_web.nota_interna IS
  'Nota interna para el equipo (nunca visible al cliente). Hoy la usa el '
  'estado ERROR_STOCK_SIN_DESPACHO (ver src/lib/pedidos.ts::marcarErrorStockSinDespacho) '
  'para guardar el detalle técnico de por qué falló el ajuste de stock.';

-- ============================================================
-- VERIFICACIÓN
--   Debe aparecer la columna nota_interna.
-- ============================================================
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'pedidos_web' AND column_name = 'nota_interna';
