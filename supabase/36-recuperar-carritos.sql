-- 36 · Recuperar ventas que se quedaron en el checkout
-- ===================================================
-- POR QUÉ (dueño, 27-09-2026)
-- "Necesito alguna forma de los que se quedan en el checkout, recuperar esas
--  ventas que no se concretaron, y se les envíe a su correo un recordatorio."
--
-- El recordatorio por correo ya existía (11-carritos-web), pero solo guardaba
-- el correo: el botón de WhatsApp del POS salía sin número, y la venta real de
-- Sevelin se cierra por WhatsApp. Ahora el checkout también guarda nombre y
-- teléfono si el cliente alcanzó a escribirlos.
--
-- Y la ley del consumidor (19.496, art. 28 B) exige que un correo comercial
-- diga cómo dejar de recibirlos: correos_sin_recordatorio es esa lista.
--
-- Idempotente.

alter table carritos_web add column if not exists nombre text;
alter table carritos_web add column if not exists telefono text;

create table if not exists correos_sin_recordatorio (
  correo text primary key,
  creado_en timestamptz not null default now()
);

-- Sin políticas: solo la service_role del servidor la toca (misma regla que
-- el resto de las tablas de la tienda).
alter table correos_sin_recordatorio enable row level security;
