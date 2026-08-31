-- Carritos persistentes con expiración de 24 horas.
-- Dos usos con el mismo esquema (columna `origen`):
--   'compartido' — creado al tocar "Compartir carrito" (antes viajaba codificado
--                  en la URL sin vencimiento; ahora vive acá con un token corto
--                  y expira, así el link deja de servir pasadas 24h).
--   'checkout'   — creado/actualizado apenas el cliente completa el correo en el
--                  checkout (antes de pagar), para poder mandarle un recordatorio
--                  si no vuelve a completar la compra dentro de esas 24h.
-- Idempotente — puede correr varias veces sin romper nada.

create table if not exists carritos_web (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  origen text not null check (origen in ('compartido', 'checkout')),
  items jsonb not null,
  correo text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  expira_en timestamptz not null,
  -- Se marca cuando el cron ya mandó (o intentó mandar) el recordatorio de
  -- abandono, para no mandarlo dos veces. Nunca se usa en origen='compartido'.
  recordatorio_enviado_en timestamptz,
  -- Se llena si el mismo carrito terminó en un pedido pagado — apaga el
  -- recordatorio de abandono (ver POST /api/checkout).
  numero_pedido text
);

create unique index if not exists idx_carritos_web_token on carritos_web (token);
create index if not exists idx_carritos_web_expira on carritos_web (expira_en);
create index if not exists idx_carritos_web_pendientes_recordatorio
  on carritos_web (actualizado_en)
  where origen = 'checkout' and recordatorio_enviado_en is null and numero_pedido is null;

-- Mismo criterio que productos_web/pedidos_web: RLS activo sin políticas
-- públicas, solo la service_role (backend) toca esta tabla.
alter table carritos_web enable row level security;
