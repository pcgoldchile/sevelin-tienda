# CHANGELOG V05 — 26 de agosto de 2026

> Quinto changelog de este repo. No es una fase nueva del plan: son tres cosas que pasaron en la
> misma sesión — una decisión de negocio (apagar OpenFactura), una revisión del `.env.local` que el
> usuario configuró con credenciales reales, y lo que esa revisión permitió probar por primera vez.

---

## 1. OpenFactura deshabilitado a propósito (decisión del negocio)

OpenFactura cuesta ~$30.000/mes y por ahora no se justifica. El respaldo de una venta web pasa a
ser el comprobante de pago de Flow; si un cliente pide boleta o factura, se emite manual desde el
POS. Esto **no es una credencial que falta por circunstancia** (como Shipit o antes Flow) — es una
decisión explícita de no usar la integración todavía, y el código lo refleja así:

- `src/lib/openfactura.ts`: nueva función `openFacturaHabilitada()` (`true` si hay
  `OPENFACTURA_API_KEY`).
- `src/app/api/flow-webhook/route.ts`: ya NO intenta `emitirBoleta()` si `openFacturaHabilitada()`
  es `false` — antes lo intentaba igual, fallaba (`Falta OPENFACTURA_API_KEY`), y quedaba logueado
  como error en cada pago. Ahora simplemente no se ejecuta esa rama: nunca frenó el checkout (el
  `try/catch` ya lo aislaba desde la Fase 3), pero ahora tampoco ensucia los logs pretendiendo ser
  un fallo.
- `src/app/pedido/[numero]/page.tsx`: si el pago está confirmado y no hay `url_boleta_sii`, muestra
  "Tu comprobante de pago de Flow respalda esta compra" + un link a WhatsApp para pedir boleta o
  factura manual — nunca se inventa un link de boleta que no existe.
- `.env.local(.example)`: comentarios actualizados explicando que es una decisión, no un pendiente.

El código de OpenFactura queda completo y listo: reactivarlo en el futuro es solo configurar
`OPENFACTURA_API_KEY` de nuevo, sin tocar código.

## 2. Revisión del `.env.local` que configuró el usuario

El usuario ya tiene el proyecto Supabase Web real y credenciales sandbox de Flow. Dos problemas
encontrados y corregidos:

- **`SUPABASE_WEB_URL` estaba mal formado**: tenía solo el project ref
  (`ekxwavsnocwxtzxqxbbi`) en vez de la URL completa. Corregido a
  `https://ekxwavsnocwxtzxqxbbi.supabase.co` — con el ref solo, `createClient()` de
  `@supabase/supabase-js` no puede conectarse.
- `SHIPIT_EMAIL`/`SHIPIT_ACCESS_TOKEN` siguen vacíos (esperado, sin cambios).

## 3. Lo que la corrección permitió probar — y un bug real encontrado en Flow

Con `SUPABASE_WEB_URL` corregida, `npm run build` pasó de `TypeError: fetch failed` (no había
conexión) a `Could not find the table 'public.productos_web' in the schema cache` — **la conexión
al proyecto Supabase Web real funciona**. Lo único que falta para ver el catálogo real es correr
las migraciones SQL (`supabase/01-productos-web-pedidos-web.sql` y
`supabase/02-numeracion-pedidos.sql`) en el SQL Editor de ese proyecto — ver "Siguiente sesión".

Con credenciales reales de Flow disponibles, se probó `crearPagoFlow()` contra el sandbox real por
primera vez (`POST /payment/create`) — **y falló con "Invalid Signature"**. La firma que describía
el README maestro ("ordenar alfabéticamente, concatenar `clave=valor`, HMAC") era incorrecta.
Verificado contra la documentación real de Flow
(developers.flow.cl/en/docs/tutorial-basics/create-order): la concatenación correcta es
`claveValor`, **sin** el signo `=`. Corregido en `src/lib/flow.ts::firmarParametrosFlow()`. Tras el
fix, Flow respondió 200 con `url`/`token`/`flowOrder` reales — `POST /payment/create` queda
**verificado**. `obtenerEstadoPagoFlow()` (`getStatus`) y los códigos de estado
(`FLOW_ESTADO_PAGADO`) siguen sin probarse: hace falta completar un pago real en el checkout de
Flow, no solo crear la orden — ver TODO en el propio archivo.

Dato suelto encontrado durante la prueba: Flow rechaza emails con pinta de prueba (`test@...`)
como inválidos. No afecta el checkout real (el cliente pone su email real), solo importa si se
vuelve a probar a mano.

## 4. Pruebas

- `npm run lint` / `npm run build`: sin errores.
- Diagnóstico puntual contra Flow sandbox real (`npx tsx`, archivo temporal, borrado después):
  confirmó el bug de firma, confirmó el fix, confirmó que `/payment/create` funciona de punta a
  punta con las credenciales reales del usuario.

## 5. Siguiente sesión

1. Correr `supabase/01-productos-web-pedidos-web.sql` y `supabase/02-numeracion-pedidos.sql` en el
   SQL Editor del proyecto Supabase Web real (`ekxwavsnocwxtzxqxbbi`) — es el único paso que falta
   para ver el catálogo funcionando localmente.
2. Confirmar que `SYNC_SECRET` esté configurado igual en el POS (Vercel) — no se verificó desde
   esta sesión.
3. Fase 6 (QA end-to-end + dominio) sigue esperando el proyecto Vercel real: sin una URL pública,
   Flow no puede llamar de vuelta a `POST /api/flow-webhook`, así que el flujo de pago completo
   (más allá de crear la orden) no se puede probar todavía.
