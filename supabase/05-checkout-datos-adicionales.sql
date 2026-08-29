-- ============================================================
-- SEVELIN TIENDA — Migración 05
-- Campos nuevos del checkout: apellido separado del nombre, nota del
-- cliente, y "solicitar factura" con los datos de la empresa.
--
-- `cliente_nombre` pasa a significar SOLO el nombre de pila (antes era el
-- nombre completo) — el formulario ahora separa Nombre/Apellido, ver
-- src/components/formulario-checkout.tsx.
--
-- El teléfono NO se toca acá: código de país + número se separan en el
-- FORMULARIO pero se concatenan en un solo string antes de guardar
-- (cliente_telefono sigue siendo un solo TEXT, no necesita columna nueva).
-- La región tampoco necesita columna: viaja dentro del mismo
-- direccion_envio JSONB que ya existe (ver src/lib/tipos.ts::DireccionEnvio).
-- ============================================================

alter table pedidos_web
  add column if not exists cliente_apellido text,
  add column if not exists nota_cliente text,
  add column if not exists quiere_factura boolean not null default false,
  add column if not exists factura_razon_social text,
  add column if not exists factura_rut text,
  add column if not exists factura_giro text;

-- ============================================================
-- VERIFICACIÓN
--   select column_name from information_schema.columns
--    where table_name = 'pedidos_web'
--      and column_name in ('cliente_apellido', 'nota_cliente', 'quiere_factura',
--                           'factura_razon_social', 'factura_rut', 'factura_giro');
--   -- debe devolver 6 filas
-- ============================================================
