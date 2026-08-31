# CHANGELOG v19 — Carritos persistentes con expiración de 24h (31-08-2026)

## Qué se hizo

**Nueva tabla `carritos_web`** (`supabase/11-carritos-web.sql`, aplicada a Supabase Web real) —
reemplaza el mecanismo anterior de "carrito compartido" (que codificaba sku+cantidad en la URL sin
ningún vencimiento) y agrega el rastro necesario para recordarle a un cliente que dejó un carrito sin
pagar. Un mismo esquema, dos usos (`origen`):

- **`compartido`** — se crea al tocar "🔗 Compartir carrito" (`POST /api/carrito/compartir`). El link
  ahora es `/carrito-compartido?t=<token>` en vez de llevar los datos codificados; expira a las 24h.
  Al abrirlo pasado ese plazo, se muestra "Este carrito compartido ya expiró" en vez de intentar
  reconstruirlo. Las filas no se borran (sirven para el conteo de "carritos compartidos" que pidió el
  dueño para el panel del POS, pendiente de construir esa parte).
- **`checkout`** — se crea/actualiza apenas el cliente completa el campo correo en el checkout (blur,
  con debounce de 400ms), antes de pagar (`POST /api/carrito/abandono`). Si el pedido se completa,
  `POST /api/checkout` marca la fila con `numero_pedido` y apaga el recordatorio.

**Popup de aviso** en el carrito (`carrito-drawer.tsx`): la primera vez que se comparte un carrito en
la sesión, aparece un modal "Este link dura 24 horas ⏳" recomendando tomar una captura de pantalla si
lo necesitan para más adelante — pedido explícito del dueño.

**Recordatorio de carrito abandonado**: `GET /api/cron/recordar-carritos` (protegido con
`CRON_SECRET`, que Vercel manda solo en las ejecuciones programadas), programado en `vercel.json` cada
15 minutos. Busca carritos `origen='checkout'` con correo, sin pedido y sin recordatorio ya mandado,
que llevan más de 1 hora sin actualizarse y que todavía no expiraron (siguen dentro de las 24h). Los
ítems se revalidan contra el catálogo real antes de mandar el correo (mismo principio que el checkout:
nunca se confía en un carrito "congelado"). Reutiliza `enviarCorreo()`/Resend — mismo aviso pendiente
que la confirmación/cancelación: **mientras no haya dominio propio verificado en Resend, no le va a
llegar a un cliente real** (ver `docs/SNAPSHOT.md`, pendiente #1). El código y el flujo ya están
completos y probados; falta solo eso para que entregue de verdad.

`src/lib/compartir-carrito.ts` (el codificador de URL viejo) se borró — quedó sin uso.

## Cómo se probó

- `tsc --noEmit`, `npm run lint`, `npm run build` (Turbopack, producción) — todo limpio, las 3 rutas
  nuevas (`/api/carrito/compartir`, `/api/carrito/abandono`, `/api/cron/recordar-carritos`) quedaron
  registradas.
- `npm run dev` real + Browser pane, contra el Supabase Web de producción:
  - Migración aplicada con `npx supabase db query --file supabase/11-carritos-web.sql --linked`,
    columnas verificadas con una consulta a `information_schema`.
  - Compartir carrito real → `POST /api/carrito/compartir` devolvió token + `expiraEn` a 24h, el popup
    de aviso apareció.
  - `/carrito-compartido?t=<token-inexistente>` → "Este link de carrito no es válido".
  - `/carrito-compartido?t=<token-real>` con un SKU que no existe en el catálogo → "no está disponible
    ahora mismo" (no revienta).
  - Se forzó `expira_en` al pasado con una consulta SQL directa → recargar mostró "Este carrito
    compartido ya expiró".
  - `POST /api/carrito/abandono` dos veces con el mismo `id` → confirmado que actualiza la misma fila
    (no duplica).
  - `GET /api/cron/recordar-carritos` sin header → 401, confirma que está protegido.
  - Filas de prueba borradas de la tabla real al terminar.
- **No probado**: el envío real del correo de recordatorio (necesita `RESEND_API_KEY` configurada y
  cae en el mismo bloqueo del dominio no verificado) ni la ejecución real del cron en Vercel — Vercel
  Hobby limita los cron jobs a como mucho una vez al día; con el plan Pro corre cada 15 minutos como
  está configurado. Confirmar el plan del proyecto en Vercel antes de asumir que corre cada 15 min.

## Pendiente que esto deja

1. Verificar dominio en Resend (ya pendiente de antes) — sin eso, el recordatorio no llega a clientes
   reales aunque el código funcione.
2. Confirmar el plan de Vercel (Hobby vs Pro) — determina si el cron corre cada 15 min de verdad o
   solo una vez al día.
3. El conteo de "carritos compartidos" y "carritos abandonados" para el panel del POS (pedido del
   dueño, bloque A del roadmap) todavía no se construyó — esta sesión solo dejó la tabla y los datos
   que ese conteo va a necesitar leer.
