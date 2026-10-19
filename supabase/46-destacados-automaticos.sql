-- 46 · Destacados automáticos (dueño, 18-10-2026)
-- "Que en destacados aparezcan los más clickeados del mes, los más tendencia,
-- tipo ahora que hace calor los ventiladores industriales, y los más vendidos;
-- que vayan cambiando solos."
--
-- Antes: Destacados se ordenaba por `unidades_vendidas` (total histórico), que el
-- POS solo mandaba cuando alguien corría un script a mano: no cambiaba nunca.
--
--   vendidos_30d          unidades vendidas en los últimos 30 días (las empuja el
--                         POS cada día con su cron, junto con el total histórico).
--   puntaje_destacado     lo calcula cada día src/lib/destacados.ts (ventas del mes,
--                         vistas del mes, tendencia de la semana, etiqueta del POS,
--                         clima de Arica). 0 = no compite.
--   motivo_destacado      por qué está arriba, para el sello de la portada
--                         ('VENDIDO' | 'VISTO' | 'TENDENCIA' | 'CALOR' | 'NOVEDAD' | 'OFERTA').
--   destacado_calculado_en  cuándo se calculó por última vez.
-- La sincronización de productos (/api/sync/producto) no toca estas columnas.
--
-- vistas_por_producto(desde): cuántas fichas abrió la gente desde esa fecha, por
-- producto. Se cuenta en la base para no bajar miles de eventos.
-- Idempotente.

alter table productos_web add column if not exists vendidos_30d integer not null default 0;
alter table productos_web add column if not exists puntaje_destacado numeric not null default 0;
alter table productos_web add column if not exists motivo_destacado text null;
alter table productos_web add column if not exists destacado_calculado_en timestamptz null;

create or replace function public.vistas_por_producto(desde timestamptz)
returns table (producto_pos_id integer, vistas bigint)
language sql stable
set search_path = public
as $$
  select e.producto_pos_id, count(*)::bigint
  from eventos_web e
  where e.tipo = 'vista_producto' and e.producto_pos_id is not null and e.creado_en >= desde
  group by e.producto_pos_id
$$;

-- Solo la usa el servidor de la tienda (service_role): nadie más la llama.
revoke all on function public.vistas_por_producto(timestamptz) from public, anon, authenticated;
grant execute on function public.vistas_por_producto(timestamptz) to service_role;

select count(*) as productos_con_vistas_30d from public.vistas_por_producto(now() - interval '30 days');
