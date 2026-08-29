-- ============================================================
-- SEVELIN TIENDA — Migración 08
-- Dos piezas que faltaban de la Ley 21.719:
--
-- 1) Consentimiento de marketing SEPARADO del consentimiento de privacidad
--    (que es obligatorio para comprar) — este es opcional, desmarcado por
--    defecto, y el cliente lo puede prender/apagar cuando quiera desde
--    /cuenta/privacidad sin afectar su capacidad de comprar.
--
-- 2) solicitudes_arco: registro auditable de CADA vez que un titular
--    ejerce un derecho ARCO (no solo el consentimiento inicial). Sobrevive
--    a la eliminación de la cuenta a propósito (usuario_id se pone en
--    NULL, pero email_snapshot y el resto del registro quedan) — el
--    objetivo es poder probar que la solicitud de cancelación se atendió,
--    aunque la cuenta ya no exista.
-- ============================================================

alter table perfiles_clientes
  add column if not exists consentimiento_marketing boolean not null default false,
  add column if not exists fecha_consentimiento_marketing timestamptz;

create table if not exists solicitudes_arco (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  -- Copia del email al momento de la solicitud: si la cuenta se elimina
  -- después (ej. una solicitud de tipo 'cancelacion'), esto sigue
  -- identificando de quién era sin depender de la fila de auth.users.
  email_snapshot text not null,
  tipo text not null check (tipo in ('acceso', 'rectificacion', 'cancelacion', 'oposicion', 'portabilidad')),
  detalle text,
  creado_en timestamptz not null default now()
);

alter table solicitudes_arco enable row level security;

-- El titular ve su propio historial mientras tenga cuenta (después de
-- eliminarla, usuario_id queda NULL y ya no matchea con auth.uid() de
-- nadie — correcto: nadie más debe poder leer ese registro tampoco).
drop policy if exists "cliente lee sus propias solicitudes arco" on solicitudes_arco;
create policy "cliente lee sus propias solicitudes arco"
  on solicitudes_arco for select
  using (auth.uid() = usuario_id);

-- El titular registra sus propias solicitudes cuando la acción se hace
-- directo desde el navegador (rectificación, cambio de preferencia de
-- marketing) — acceso/portabilidad/cancelación se registran desde las
-- Route Handlers correspondientes con la service_role, ver
-- src/app/api/cuenta/exportar/route.ts y eliminar/route.ts.
drop policy if exists "cliente registra sus propias solicitudes arco" on solicitudes_arco;
create policy "cliente registra sus propias solicitudes arco"
  on solicitudes_arco for insert
  with check (auth.uid() = usuario_id);

-- ============================================================
-- VERIFICACIÓN
--   select column_name from information_schema.columns
--    where table_name = 'perfiles_clientes'
--      and column_name in ('consentimiento_marketing', 'fecha_consentimiento_marketing');
--   select table_name from information_schema.tables where table_name = 'solicitudes_arco';
--   select policyname from pg_policies where tablename = 'solicitudes_arco';
-- ============================================================
