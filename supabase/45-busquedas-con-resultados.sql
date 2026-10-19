-- 45 · Cuántos productos encontró cada búsqueda (dueño, 18-10-2026)
-- Para el panel del POS "Lo que buscan y no tenemos" (Página Web → Más buscados).
-- Medido antes: de 185 búsquedas, 59 no encontraban nada. Con el buscador nuevo
-- (src/lib/busqueda.ts) bajan a 17, y esas 17 son demanda real: cosas que la
-- tienda no tiene.
--
--   resultados   productos que encontró (0 = nada, o solo "parecidos").
--   parecidos    true = nada calzó entero y se mostraron los más parecidos.
-- Las 185 búsquedas de antes de esto se recalcularon una vez el 18-10-2026 con
-- el buscador nuevo y el catálogo de ese día (17 sin nada, 10 solo parecidos).
-- Idempotente.

alter table eventos_web add column if not exists resultados integer null;
alter table eventos_web add column if not exists parecidos boolean null;

select count(*) filter (where tipo = 'busqueda') as busquedas,
       count(resultados) as con_resultados
from eventos_web;
