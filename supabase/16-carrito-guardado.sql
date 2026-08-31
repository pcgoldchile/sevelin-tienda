-- Carrito guardado por cuenta (estilo MercadoLibre: un cliente logueado ve
-- el mismo carrito en cualquier dispositivo). Va en perfiles_clientes, no en
-- una tabla aparte: ya tiene RLS de "cada usuario lee/escribe su propia
-- fila" (supabase/06-clientes-web.sql) sin restricción por columna, así que
-- no hace falta ninguna política nueva. Idempotente.

alter table perfiles_clientes
  add column if not exists carrito jsonb;
