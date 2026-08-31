-- Eventos de catálogo (búsquedas y vistas de producto) — para el panel
-- "Más buscados" del POS (lee esta tabla directo con su propio cliente
-- Supabase Web, dbWeb en sevelin-pos-oficial/api/index.js, mismo patrón que
-- pedidos_web). Solo 2 tipos de evento a propósito: lo que pidió el dueño
-- fue "más buscados" y "más cotizados/clickeados", no un tracking genérico.
-- Idempotente.

create table if not exists eventos_web (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('busqueda', 'vista_producto')),
  -- Solo uno de los dos según el tipo — no se fuerza con un check adicional
  -- porque no aporta seguridad real (esta tabla es interna, solo la escribe
  -- el propio backend de la tienda) y sí complica migraciones futuras.
  termino text,
  producto_pos_id integer,
  creado_en timestamptz not null default now()
);

create index if not exists idx_eventos_web_tipo_creado on eventos_web (tipo, creado_en desc);

-- Mismo criterio que productos_web/pedidos_web: RLS activo sin políticas
-- públicas, solo la service_role (tienda al escribir, POS al leer) la toca.
alter table eventos_web enable row level security;
