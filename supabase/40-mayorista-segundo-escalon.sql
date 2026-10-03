-- 40 · Precio mayorista con un segundo escalón (03-10-2026) — pendiente #28 del POS
-- ============================================================
-- El dueño pidió escalones por cantidad: "de 3 a 9 unidades un precio y de 10
-- en adelante otro más bajo". El POS (sql/81) manda precio_mayorista_2 y
-- mayorista_desde_2 por el webhook de siempre; acá se guardan junto al primer
-- escalón, en la misma tabla sin políticas (solo la service_role la toca).
--
-- Van los dos o ninguno; el segundo siempre es más barato y desde más
-- unidades que el primero. Idempotente.

alter table precios_mayoristas add column if not exists precio_mayorista_2 numeric null;
alter table precios_mayoristas add column if not exists desde_cantidad_2 integer null;

alter table precios_mayoristas drop constraint if exists precios_mayoristas_escalon_2_check;
alter table precios_mayoristas
  add constraint precios_mayoristas_escalon_2_check
  check (
    (precio_mayorista_2 is null and desde_cantidad_2 is null)
    or (precio_mayorista_2 > 0 and precio_mayorista_2 < precio_mayorista
        and desde_cantidad_2 is not null and desde_cantidad_2 > desde_cantidad
        and desde_cantidad_2 <= 1000)
  );

comment on column precios_mayoristas.precio_mayorista_2 is
  'Segundo escalón: precio por unidad desde desde_cantidad_2 unidades. NULL = un solo escalón.';
