-- ============================================================
-- SEVELIN TIENDA — Migración 07
-- Trazabilidad del consentimiento de privacidad (Ley 21.719): registra
-- CUÁNDO y CON QUÉ VERSIÓN de la política el titular aceptó, tanto al
-- crear una cuenta (perfiles_clientes) como al hacer un pedido de invitado
-- (pedidos_web) — son dos momentos de consentimiento independientes, un
-- cliente registrado también vuelve a marcar la casilla en cada compra.
--
-- version_politica es texto libre (no un catálogo aparte): alcanza con
-- versionar a mano en src/lib/politica-privacidad.ts cada vez que cambie
-- el contenido real de /privacidad.
-- ============================================================

alter table pedidos_web
  add column if not exists consentimiento_privacidad boolean not null default false,
  add column if not exists fecha_consentimiento timestamptz,
  add column if not exists version_politica text;

alter table perfiles_clientes
  add column if not exists consentimiento_privacidad boolean not null default false,
  add column if not exists fecha_consentimiento timestamptz,
  add column if not exists version_politica text;

-- ============================================================
-- VERIFICACIÓN
--   select column_name from information_schema.columns
--    where table_name in ('pedidos_web', 'perfiles_clientes')
--      and column_name in ('consentimiento_privacidad', 'fecha_consentimiento', 'version_politica')
--    order by table_name, column_name;
--   -- debe devolver 6 filas
-- ============================================================
