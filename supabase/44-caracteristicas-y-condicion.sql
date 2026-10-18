-- 44 · Filtros del catálogo: características y estado (dueño, 18-10-2026)
-- Pareja de sevelin-pos-oficial/sql/103. El dueño marca en el POS las casillas de
-- cada producto (HDMI, VGA, parlantes…) y llegan acá con la sincronización de
-- siempre (/api/sync/producto). Con ellas, más la marca, el precio y el estado,
-- /productos arma el panel "Filtrar" (src/lib/filtros.ts).
--
--   caracteristicas  { "<grupo>": ["<valor>", …] }, tal cual lo guarda el POS.
--   condicion        'nuevo' | 'reacondicionado' (productos.condicion del POS).
--                    NULL hasta la primera sincronización después de esto.
--
-- Son datos públicos del producto, como el nombre: no cambia nada de RLS.
-- Idempotente.

alter table productos_web add column if not exists caracteristicas jsonb not null default '{}'::jsonb;
alter table productos_web add column if not exists condicion text null;

alter table productos_web drop constraint if exists productos_web_caracteristicas_objeto;
alter table productos_web add constraint productos_web_caracteristicas_objeto
  check (jsonb_typeof(caracteristicas) = 'object');

alter table productos_web drop constraint if exists productos_web_condicion_check;
alter table productos_web add constraint productos_web_condicion_check
  check (condicion is null or condicion in ('nuevo', 'reacondicionado'));

select count(*) as productos, count(condicion) as con_condicion,
       count(*) filter (where caracteristicas <> '{}'::jsonb) as con_caracteristicas
from productos_web;
