-- RUT del cliente (identificación, no facturación — esa sigue siendo
-- factura_rut, dato aparte de "Solicitar factura"). Opcional: el checkout
-- de invitado sigue funcionando igual sin él. Idempotente.

alter table pedidos_web
  add column if not exists cliente_rut text;
