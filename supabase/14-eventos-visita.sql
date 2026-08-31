-- Agrega el tipo 'visita' a eventos_web (ver supabase/13-eventos-web.sql) —
-- se registra una vez por carga de página/navegación (src/components/
-- visit-tracker.tsx), para el "total de visitas" del panel de métricas del
-- POS. Idempotente.

alter table eventos_web
  drop constraint if exists eventos_web_tipo_check;

alter table eventos_web
  add constraint eventos_web_tipo_check
  check (tipo in ('busqueda', 'vista_producto', 'visita'));
