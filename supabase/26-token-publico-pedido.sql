-- 26 · Token público para la página de estado del pedido
-- =====================================================
-- POR QUÉ
-- La URL del estado del pedido era /pedido/WEB-000009, y los números son
-- CORRELATIVOS. Cualquiera podía restar uno y ver el pedido de otra
-- persona: qué compró, cuánto pagó, en qué estado va. El 10-09-2026 ya se
-- había tapado lo peor (el endpoint dejó de devolver nombre, correo, RUT,
-- teléfono y dirección — ver src/app/api/pedido/[token]/route.ts), pero eso
-- fue blindar los datos uno por uno dejando la puerta abierta: cualquier
-- campo que se agregue mañana vuelve a quedar expuesto, y el link a la
-- boleta del SII —que sí lleva nombre y RUT— ya estaba contemplado en la
-- página.
--
-- La corrección de fondo es que la URL deje de ser adivinable. El número de
-- pedido sigue siendo el identificador para hablar con el cliente y para el
-- POS; el token es solo la llave de la página pública.
--
-- 32 caracteres hexadecimales = 128 bits de entropía. Adivinar uno por
-- fuerza bruta no es viable, y a diferencia de un correlativo, conocer un
-- token no da ninguna pista sobre los demás.
--
-- Idempotente: se puede correr más de una vez sin romper nada.

-- 1) La columna. Nace nullable para poder rellenar las filas que ya existen.
alter table pedidos_web
  add column if not exists token_publico text;

-- 2) Relleno de los pedidos anteriores a este cambio. gen_random_uuid() es
--    nativo en PostgreSQL 13+, así que no hace falta la extensión pgcrypto.
--    Se hace fila por fila (no un valor único para todas) justamente para
--    que cada pedido tenga su propia llave.
update pedidos_web
   set token_publico = replace(gen_random_uuid()::text, '-', '')
 where token_publico is null;

-- 3) Desde ahora, todo pedido nuevo nace con token sin que el código tenga
--    que acordarse de generarlo. Que el default viva en la base y no en la
--    aplicación es deliberado: un pedido sin token sería un pedido al que
--    su dueño no puede llegar.
alter table pedidos_web
  alter column token_publico set default replace(gen_random_uuid()::text, '-', '');

-- 4) Ahora que no queda ninguno en null, se exige para siempre.
alter table pedidos_web
  alter column token_publico set not null;

-- 5) Único + índice. El índice además es el que hace barata la búsqueda por
--    token, que pasa a ser la consulta de la página de estado del pedido.
create unique index if not exists pedidos_web_token_publico_key
  on pedidos_web (token_publico);

comment on column pedidos_web.token_publico is
  'Llave impredecible para /pedido/<token>. NUNCA exponer numero_pedido en una URL pública: es correlativo y deja enumerar los pedidos de otros clientes.';
