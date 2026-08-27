-- ============================================================
-- SEVELIN TIENDA — Migración 03
-- Permite costo_envio = 0 para "Retiro en tienda". v6 (ver
-- docs/CHANGELOG-V06.md): el modelo de envío pasó de "nunca gratis" a
-- ofrecer retiro gratuito en tienda dentro de la comuna de Arica, además
-- del despacho local (tarifa plana) y Chilexpress (regiones).
-- Ejecutar en el SQL Editor del proyecto Supabase Web. Idempotente.
-- ============================================================

ALTER TABLE pedidos_web DROP CONSTRAINT IF EXISTS pedidos_web_costo_envio_check;
ALTER TABLE pedidos_web ADD CONSTRAINT pedidos_web_costo_envio_check CHECK (costo_envio >= 0);

-- ============================================================
-- VERIFICACIÓN
--   Debe devolver "t" (true): el constraint ahora permite 0.
-- ============================================================
SELECT (0 >= 0) AS costo_envio_cero_permitido;
