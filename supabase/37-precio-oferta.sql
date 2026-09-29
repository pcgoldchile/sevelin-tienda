-- 37 · Precio de oferta con fecha de inicio y fin (29-09-2026)
-- ============================================================
-- Lo manda el POS (sql/71 de sevelin-pos-oficial: precio_oferta_web,
-- oferta_desde, oferta_hasta) por el mismo webhook de siempre
-- (POST /api/sync/producto).
--
-- precio_web sigue siendo el precio NORMAL. Si hay oferta vigente, la tienda
-- la aplica al leer el producto (src/lib/oferta.ts): cobra precio_oferta y
-- muestra precio_web tachado. "Vigente" se decide en cada lectura comparando
-- con la hora actual, así la oferta empieza y termina sola, sin cron.
--
-- No crea tablas (RLS de productos_web sin cambios). Idempotente.

alter table productos_web add column if not exists precio_oferta numeric null;
alter table productos_web add column if not exists oferta_desde timestamptz null;
alter table productos_web add column if not exists oferta_hasta timestamptz null;

alter table productos_web drop constraint if exists productos_web_oferta_check;
alter table productos_web
  add constraint productos_web_oferta_check
  check (
    (precio_oferta is null and oferta_desde is null and oferta_hasta is null)
    or (precio_oferta > 0 and oferta_desde is not null and oferta_hasta is not null and oferta_hasta > oferta_desde)
  );

comment on column productos_web.precio_oferta is
  'Precio rebajado entre oferta_desde y oferta_hasta (lo aplica src/lib/oferta.ts). precio_web sigue siendo el normal.';
