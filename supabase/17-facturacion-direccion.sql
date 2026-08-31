-- Dirección de facturación (Región, Comuna, Calle, Número, Piso/Depto opcional)
-- cuando el cliente marca "Solicitar factura" en el checkout.
alter table pedidos_web
  add column if not exists factura_region text,
  add column if not exists factura_comuna text,
  add column if not exists factura_calle text,
  add column if not exists factura_numero text,
  add column if not exists factura_piso_depto text;
