-- 43 · Etiqueta "Liquidación" (dueño, 15-10-2026)
-- Productos antiguos o fuera de temporada que el dueño quiere sacar. NO es una
-- categoría: el producto sigue en la suya y además lleva el sello, y la página
-- /liquidacion los junta. Pareja de sevelin-pos-oficial/sql/97. Idempotente.

alter table productos_web
  drop constraint if exists productos_web_etiqueta_web_check;

alter table productos_web
  add constraint productos_web_etiqueta_web_check
  check (etiqueta_web is null or etiqueta_web in ('NOVEDAD', 'TENDENCIA', 'OFERTA', 'LIQUIDACION'));

select etiqueta_web, count(*) from productos_web group by 1 order by 1;
