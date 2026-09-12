-- 28 · "Por llegar" + lista de espera de productos
-- ================================================
-- Contraparte de sevelin-pos-oficial/sql/42.
--
-- UNA SOLA TABLA PARA DOS COSAS QUE SON LA MISMA
-- "Avísame cuando vuelva" (producto agotado) y "Resérvalo" (producto por
-- llegar) parecen funciones distintas y no lo son: alguien quiere algo que
-- no está, deja cómo ubicarlo, y cuando llega se le avisa. Lo único que
-- cambia es si pagó o no. Separarlas habría significado dos tablas, dos
-- correos y dos veces la lógica de "ya llegó".
--
--   tipo AVISO   → solo quiere que le avisen. No compromete plata.
--                  También cubre a quien prefiere pagar presencial: se
--                  entera de que llegó y pasa por la tienda.
--   tipo RESERVA → pagó el 100% y el producto queda a su nombre. Se
--                  vincula al pedido con numero_pedido.
--
-- LEY 21.719
-- Guardar un correo para avisar después es tratamiento de datos
-- personales. Por eso: consentimiento explícito y fechado al momento de
-- anotarse, finalidad única (avisar de ESTE producto), y la fila se marca
-- NOTIFICADO cuando se cumple — no queda una lista de correos creciendo
-- para siempre sin propósito. Un aviso no autoriza a mandar promociones:
-- el consentimiento de marketing es otro y vive en perfiles_clientes.
--
-- Sin RLS abierta: se escribe desde el servidor con la service_role (el
-- endpoint valida), nunca desde el navegador del cliente.
--
-- Idempotente.

-- Espejo del POS
alter table productos_web
  add column if not exists por_llegar boolean not null default false;

alter table productos_web
  add column if not exists fecha_llegada_estimada date;

-- Lista de espera
create table if not exists avisos_producto (
  id                bigserial primary key,
  producto_pos_id   bigint not null,
  sku               text not null,
  nombre_producto   text not null,
  tipo              text not null default 'AVISO'
                    check (tipo in ('AVISO', 'RESERVA')),
  email             text not null,
  nombre            text,
  telefono          text,
  -- Solo en las RESERVA: el pedido pagado que respalda la reserva.
  numero_pedido     text,
  estado            text not null default 'PENDIENTE'
                    check (estado in ('PENDIENTE', 'NOTIFICADO', 'CANCELADO')),
  notificado_en     timestamptz,
  -- Trazabilidad del consentimiento (Ley 21.719).
  consentimiento    boolean not null default true,
  version_politica  text,
  creado_en         timestamptz not null default now()
);

-- La consulta caliente: "¿a quién le aviso que llegó este producto?".
create index if not exists avisos_producto_pendientes_idx
  on avisos_producto (producto_pos_id)
  where estado = 'PENDIENTE';

-- Una persona no se anota dos veces al mismo producto. Parcial sobre
-- PENDIENTE a propósito: si ya se le avisó y el producto se vuelve a
-- agotar, tiene todo el derecho a anotarse de nuevo.
create unique index if not exists avisos_producto_unico_pendiente_idx
  on avisos_producto (producto_pos_id, lower(email))
  where estado = 'PENDIENTE';

comment on table avisos_producto is
  'Lista de espera de un producto: AVISO (solo avisar, gratis) o RESERVA (pagado al 100%). Finalidad única y acotada — avisar de ESTE producto. No habilita marketing.';
