-- ============================================================
-- SEVELIN TIENDA — Migración 06
-- Cuentas de cliente reales (Supabase Auth), junto con el checkout de
-- invitado que sigue existiendo sin cambios.
--
-- perfiles_clientes: Supabase Auth (auth.users) solo trae email/contraseña;
-- acá van los datos propios de la tienda (nombre, apellido, teléfono) que
-- el checkout precarga cuando hay sesión. RLS: cada usuario SOLO lee/escribe
-- su propia fila — nunca se abre una política pública de verdad.
--
-- pedidos_web.cliente_user_id: nullable a propósito — un pedido de invitado
-- nunca tiene user id. Lo asocia POST /api/checkout leyendo la sesión desde
-- la cookie en el servidor (src/lib/supabase-server.ts), nunca desde algo
-- que mande el cliente. La política RLS nueva es de SOLO LECTURA (para "Mis
-- pedidos"): pedidos_web sigue sin política pública de escritura, esa sigue
-- siendo exclusiva de la service_role vía la API de checkout.
-- ============================================================

create table if not exists perfiles_clientes (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  apellido text,
  telefono text,
  creado_en timestamptz not null default now()
);

alter table perfiles_clientes enable row level security;

drop policy if exists "cliente lee su propio perfil" on perfiles_clientes;
create policy "cliente lee su propio perfil"
  on perfiles_clientes for select
  using (auth.uid() = id);

drop policy if exists "cliente escribe su propio perfil" on perfiles_clientes;
create policy "cliente escribe su propio perfil"
  on perfiles_clientes for insert
  with check (auth.uid() = id);

drop policy if exists "cliente actualiza su propio perfil" on perfiles_clientes;
create policy "cliente actualiza su propio perfil"
  on perfiles_clientes for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

alter table pedidos_web
  add column if not exists cliente_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_pedidos_web_cliente_user_id on pedidos_web(cliente_user_id);

drop policy if exists "cliente lee sus propios pedidos" on pedidos_web;
create policy "cliente lee sus propios pedidos"
  on pedidos_web for select
  using (auth.uid() = cliente_user_id);

-- ============================================================
-- VERIFICACIÓN
--   select table_name from information_schema.tables where table_name = 'perfiles_clientes';
--   select column_name from information_schema.columns where table_name = 'pedidos_web' and column_name = 'cliente_user_id';
--   select policyname from pg_policies where tablename in ('perfiles_clientes', 'pedidos_web');
-- ============================================================
