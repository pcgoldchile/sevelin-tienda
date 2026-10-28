-- 49 · Ajustes de la tienda que el dueño cambia desde el POS (28-10-2026)
-- ============================================================
-- Primer uso: el horario de atención. Antes vivía escrito en el código
-- (src/lib/horarios.ts) y cambiarlo pedía un despliegue. Ahora el POS lo manda
-- por POST /api/sync/horario y la tienda lo lee de aquí (con el de código como
-- respaldo si la fila no existe).
--
-- Una fila por ajuste: clave = 'horario', valor = { tramos, dias, aviso_domingo, ... }.
-- RLS activo SIN políticas: solo la service_role (el servidor) la toca, igual
-- que el resto de las tablas de la tienda. Idempotente.

create table if not exists ajustes_tienda (
  clave text primary key,
  valor jsonb not null,
  actualizado_en timestamptz not null default now()
);

alter table ajustes_tienda enable row level security;
revoke all on ajustes_tienda from anon, authenticated;
grant all on ajustes_tienda to service_role;

comment on table ajustes_tienda is 'Ajustes que el dueño cambia desde el POS (horario de atención). Solo service_role.';
