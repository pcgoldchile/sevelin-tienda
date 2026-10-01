-- 39 · Venta mayorista, Fase 1 (01-10-2026) — pendiente #28 del POS
-- ============================================================
-- Cuentas mayoristas aprobadas a mano y sus precios. Diseño aprobado por el
-- dueño el 30-09-2026: la cuenta se pide desde "Mi cuenta", el dueño verifica
-- por WhatsApp o llamada y la aprueba desde el POS (Página Web → Mayoristas).
--
-- TRES TABLAS, TODAS SIN POLÍTICAS (solo la service_role las toca):
--
-- · cuentas_mayoristas: la solicitud y su estado. NO va en perfiles_clientes
--   porque esa tabla tiene una política que deja a cada cliente editar su
--   propia fila con la llave pública: podría aprobarse solo.
--
-- · precios_mayoristas: lo manda el POS (sql/76: productos.precio_mayorista y
--   mayorista_desde) por el webhook de siempre. NO va como columna de
--   productos_web porque el catálogo lee productos_web completo (select *) y
--   le pasa el producto entero a componentes del navegador: el precio
--   mayorista quedaría en el HTML público de cada ficha.
--
-- · ajustes_mayorista: el pedido mínimo (una sola fila). Lo edita el dueño
--   desde el POS. Con precios mayoristas, el pedido (sin envío) tiene que
--   llegar a este monto; si no llega, todo se cobra a precio normal.
--
-- pedidos_web.es_mayorista: el pedido se cobró con al menos una línea a
-- precio mayorista (cada línea de items lleva además precio_tipo y
-- precio_normal).
--
-- Idempotente.

create table if not exists cuentas_mayoristas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'SUSPENDIDA')),
  -- Nombre de la persona o razón social del negocio.
  nombre text not null check (char_length(nombre) between 3 and 120),
  -- RUT normalizado (12345678-9), validado con dígito verificador en la API.
  rut text not null check (rut ~ '^[0-9]{7,8}-[0-9K]$'),
  telefono text not null check (char_length(telefono) between 8 and 20),
  -- Copia del correo de la cuenta: el POS no puede leer auth.users.
  email text not null,
  ciudad text not null check (char_length(ciudad) between 2 and 80),
  -- A qué se dedica y qué compraría. Ayuda a verificar por WhatsApp.
  actividad text not null check (char_length(actividad) between 5 and 400),
  -- "Compro para revender o para usar en mi negocio o taller."
  declara_reventa boolean not null default false,
  solicitado_en timestamptz not null default now(),
  revisado_en timestamptz,
  revisado_por text,
  -- Cómo se verificó (WhatsApp, llamada...). Obligatoria para aprobar.
  nota_verificacion text,
  -- Motivo del rechazo o de la suspensión.
  motivo text,
  actualizado_en timestamptz not null default now()
);

-- Un RUT, una cuenta mayorista viva. Uno rechazado puede volver a pedir.
create unique index if not exists cuentas_mayoristas_rut_viva
  on cuentas_mayoristas (rut) where estado in ('PENDIENTE', 'APROBADA', 'SUSPENDIDA');
create index if not exists cuentas_mayoristas_estado on cuentas_mayoristas (estado, solicitado_en desc);

alter table cuentas_mayoristas enable row level security;

create table if not exists precios_mayoristas (
  producto_pos_id bigint primary key
    references productos_web(producto_pos_id) on delete cascade,
  precio_mayorista numeric not null check (precio_mayorista > 0),
  desde_cantidad integer not null check (desde_cantidad between 2 and 1000),
  actualizado_en timestamptz not null default now()
);

alter table precios_mayoristas enable row level security;

create table if not exists ajustes_mayorista (
  id smallint primary key default 1 check (id = 1),
  pedido_minimo integer not null default 100000 check (pedido_minimo between 0 and 10000000),
  actualizado_en timestamptz not null default now(),
  actualizado_por text
);

insert into ajustes_mayorista (id) values (1) on conflict (id) do nothing;

alter table ajustes_mayorista enable row level security;

alter table pedidos_web add column if not exists es_mayorista boolean not null default false;

comment on table cuentas_mayoristas is 'Cuentas mayoristas: solicitud desde Mi cuenta, aprobación a mano desde el POS. Sin políticas: solo service_role.';
comment on table precios_mayoristas is 'Precio mayorista por producto (viene del POS, sql/76). Nunca público. Sin políticas: solo service_role.';
comment on table ajustes_mayorista is 'Pedido mínimo mayorista (una fila). Lo edita el dueño desde el POS.';
comment on column pedidos_web.es_mayorista is 'El pedido se cobró con al menos una línea a precio mayorista.';
