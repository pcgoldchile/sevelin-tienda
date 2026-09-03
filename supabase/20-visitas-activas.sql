-- Visitantes activos AHORA MISMO en la tienda.
-- ------------------------------------------------------------
-- `eventos_web` (tipo='visita') solo cuenta cargas de página acumuladas
-- (visitas totales), sin ningún identificador de sesión — no hay forma de
-- saber "cuántas de esas visitas siguen conectadas". Esta tabla es aparte
-- a propósito: un id de sesión por navegador (sessionStorage, ver
-- src/components/visit-tracker.tsx) que manda un "latido" cada ~25s
-- mientras la pestaña sigue abierta. "Activos ahora" = filas con
-- ultima_actividad reciente (ver GET /api/pos/metricas en el POS).
--
-- Se reescribe la MISMA fila en cada latido (upsert por session_id), así
-- que la tabla no crece sin límite con el tiempo — un visitante que vuelve
-- reutiliza su id de sesión mientras dure la pestaña.
CREATE TABLE IF NOT EXISTS visitas_activas (
  session_id text PRIMARY KEY,
  ultima_actividad timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visitas_activas_actividad ON visitas_activas(ultima_actividad);
