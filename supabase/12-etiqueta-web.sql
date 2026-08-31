-- Etiqueta destacada de producto (NOVEDAD / TENDENCIA / OFERTA), marcada
-- desde el POS (sevelin-pos-oficial/sql/28-etiqueta-web.sql) y sincronizada
-- por POST /api/sync/producto. Idempotente.

alter table productos_web
  add column if not exists etiqueta_web text;

alter table productos_web
  drop constraint if exists productos_web_etiqueta_web_check;

alter table productos_web
  add constraint productos_web_etiqueta_web_check
  check (etiqueta_web is null or etiqueta_web in ('NOVEDAD', 'TENDENCIA', 'OFERTA'));
