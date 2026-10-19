-- 47 · Puntos Sevelin (dueño, 19-10-2026: "construir los puntos primero")
-- ===============================================================
-- Diseño y auditoría: sevelin-pos-oficial/docs/fidelizacion/DISENO-PUNTOS-SEVELIN.md.
-- 1 punto = $1. Las cuentas y los movimientos viven AQUÍ (base de la tienda); el POS los
-- lee y escribe desde su servidor con la service_role (dbWeb), igual que pedidos_web.
--
--   cuentas_puntos     una por persona: código SEV-XXXXX+dígito, teléfono único (+569…),
--                      RUT único opcional, el usuario web si se vinculó, y "es_personal"
--                      (las cuentas del personal no suman: abuso #2 de la auditoría).
--   movimientos_puntos el libro: nada se edita ni se borra; un error se corrige con otro
--                      movimiento o marcando `anulado`. Los ganados quedan "pendientes"
--                      10 días (disponible_desde) y vencen a los 12 meses (vence_en).
--   codigos_canje      el código de 6 números para canjear (se guarda solo su hash; dura
--                      10 minutos y admite 5 intentos).
--   productos_web.tasa_puntos  cuántos puntos por $ suma cada producto (0,0025 a 0,02):
--                      la calcula el sync con el costo, sin guardar el costo aquí.
--
-- RLS activo sin políticas públicas, como el resto de la tienda: solo la service_role.
-- Idempotente.

create table if not exists cuentas_puntos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^SEV-[A-HJ-NP-Z2-9]{5}[0-9]$'),
  telefono text not null unique check (telefono ~ '^\+569[0-9]{8}$'),
  rut text unique check (rut is null or rut ~ '^[0-9]{7,8}-[0-9K]$'),
  nombre text not null check (length(nombre) between 1 and 80),
  correo text check (correo is null or length(correo) <= 120),
  fecha_nacimiento date,
  user_id uuid unique references auth.users(id) on delete set null,
  es_personal boolean not null default false,
  consentimiento boolean not null default false,
  consentimiento_en timestamptz,
  bono_bienvenida boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por text
);

create table if not exists movimientos_puntos (
  id bigserial primary key,
  cuenta_id uuid not null references cuentas_puntos(id) on delete cascade,
  tipo text not null check (tipo in ('compra', 'canje', 'bienvenida', 'cumpleanos', 'ajuste', 'reverso')),
  puntos integer not null check (puntos <> 0 and abs(puntos) <= 200000),
  anulado boolean not null default false,
  disponible_desde timestamptz not null default now(),
  vence_en timestamptz,
  origen text not null check (origen in ('pos', 'web', 'sistema')),
  venta_ref text,
  detalle jsonb not null default '{}'::jsonb,
  creado_por text,
  creado_en timestamptz not null default now()
);
create index if not exists movimientos_puntos_cuenta_idx on movimientos_puntos (cuenta_id, creado_en);
create index if not exists movimientos_puntos_venta_idx on movimientos_puntos (origen, venta_ref);
/* Una venta suma una sola vez (un reintento del POS o un aviso de pago repetido no duplica). */
create unique index if not exists movimientos_puntos_compra_unica
  on movimientos_puntos (origen, venta_ref) where tipo = 'compra' and not anulado;
create unique index if not exists movimientos_puntos_canje_unico
  on movimientos_puntos (origen, venta_ref) where tipo = 'canje' and not anulado;

create table if not exists codigos_canje (
  id bigserial primary key,
  cuenta_id uuid not null references cuentas_puntos(id) on delete cascade,
  codigo_hash text not null,
  expira_en timestamptz not null,
  usado_en timestamptz,
  intentos integer not null default 0,
  creado_por text,
  creado_en timestamptz not null default now()
);
create index if not exists codigos_canje_cuenta_idx on codigos_canje (cuenta_id, creado_en desc);

alter table productos_web add column if not exists tasa_puntos numeric(6,4) not null default 0;

alter table cuentas_puntos enable row level security;
alter table movimientos_puntos enable row level security;
alter table codigos_canje enable row level security;

select
  (select count(*) from cuentas_puntos) as cuentas,
  (select count(*) from movimientos_puntos) as movimientos,
  (select relrowsecurity from pg_class where relname = 'cuentas_puntos') as rls_cuentas,
  (select relrowsecurity from pg_class where relname = 'movimientos_puntos') as rls_movimientos,
  (select relrowsecurity from pg_class where relname = 'codigos_canje') as rls_codigos;
