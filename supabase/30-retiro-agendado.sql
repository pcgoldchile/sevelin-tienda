-- 30 · Retiro agendado: cuándo piensa pasar el cliente
-- ====================================================
-- QUÉ RESUELVE
-- Un pedido con retiro en tienda queda esperando sin que nadie sepa
-- cuándo lo van a buscar. El cliente se olvida, y el dueño no sabe para
-- qué día dejarlo preparado.
--
-- El cliente declara al comprar cuándo piensa pasar, y el día que llega se
-- le manda un recordatorio. Es una ORIENTACIÓN, no una cita: si le queda
-- mejor otro momento, pasa igual o coordina por WhatsApp, y así está
-- escrito en el checkout y en el correo. Prometerle una hora reservada
-- sería mentirle sobre cómo funciona la tienda.
--
-- POR QUÉ UN BLOQUE Y NO UNA HORA EXACTA
-- Nadie sabe a qué minuto va a llegar. Pedir "15:47" obliga a inventar una
-- precisión que no existe y después a incumplirla. Un bloque de dos horas
-- es lo que la persona sí puede estimar de verdad.
--
-- Todo es OPCIONAL: quien no quiere comprometerse a nada compra igual.
-- Un campo obligatorio más en el checkout cuesta ventas, y este dato es
-- una comodidad, no un requisito.
--
-- Idempotente.

alter table pedidos_web
  add column if not exists retiro_fecha date;

alter table pedidos_web
  add column if not exists retiro_bloque text;

-- Marca de que ya se avisó. Es lo que evita que el cron mande el mismo
-- recordatorio en cada corrida, y se escribe DESPUÉS de enviar: si el
-- correo falla, la fila sigue pendiente para el próximo intento.
alter table pedidos_web
  add column if not exists recordatorio_retiro_enviado_en timestamptz;

-- La consulta del cron: "¿a quién le toca retirar hoy y no se le ha
-- avisado?". Parcial, porque la enorme mayoría de los pedidos no tiene
-- retiro agendado.
create index if not exists pedidos_web_retiro_pendiente_idx
  on pedidos_web (retiro_fecha)
  where retiro_fecha is not null and recordatorio_retiro_enviado_en is null;

comment on column pedidos_web.retiro_fecha is
  'Día en que el cliente estima pasar a retirar. Orientación, no una cita: puede venir otro día sin avisar.';

comment on column pedidos_web.retiro_bloque is
  'Franja horaria estimada (ej. "16:00-18:00"). Bloque y no hora exacta porque nadie sabe a qué minuto va a llegar.';
