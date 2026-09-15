-- RLS en avisos_producto — cierra la alerta crítica del Security Advisor de
-- Supabase (correo del 15-09-2026, "issues as of 13 Sep 2026":
-- rls_disabled_in_public, proyecto sevelin-web ekxwavsnocwxtzxqxbbi).
-- ------------------------------------------------------------
-- Mismo error que visitas_activas (ver 24-rls-visitas-activas.sql): la tabla
-- se creó en 28-por-llegar-y-avisos.sql y su comentario dice que se escribe
-- solo con service_role, pero faltó la línea que habilita RLS. Sin RLS,
-- PostgREST la expone al rol `anon`, y la anon key es PÚBLICA por diseño
-- (viaja en el navegador para las cuentas de cliente): cualquiera podía leer,
-- insertar, modificar y borrar filas.
--
-- Aquí el riesgo SÍ incluía datos personales: la lista de espera guarda el
-- correo (y opcionalmente el teléfono) de quien pide "Avísame cuando llegue".
-- Al cerrarla, la tabla tenía 0 filas: no hubo datos expuestos.
--
-- NO se crea ninguna política a propósito: todos los usos están en
-- src/lib/avisos-producto.ts con supabaseWeb (service_role, solo servidor),
-- que omite RLS por diseño. RLS habilitado sin políticas = nadie más entra.
--
-- Además se quitan los permisos de tabla a anon/authenticated (defensa en
-- profundidad): si alguien deshabilitara RLS por error en el futuro, la
-- tabla igual no quedaría abierta.
--
-- Idempotente.

ALTER TABLE avisos_producto ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE avisos_producto FROM anon, authenticated;
REVOKE ALL ON SEQUENCE avisos_producto_id_seq FROM anon, authenticated;

-- Verificación (debe devolver 0 filas: ninguna tabla de public sin RLS):
--   select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
