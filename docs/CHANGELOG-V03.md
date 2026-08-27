# CHANGELOG V03 — 26 de agosto de 2026

> Tercer changelog de este repo. Fase 3 del e-commerce Sevelin (ver `README-ECOMMERCE-SEVELIN.md`,
> documento maestro en `sevelin-pos-oficial`, sección 8 fila "3" y sección 6).

Checkout de invitado + pago con Flow + boleta electrónica con OpenFactura, con la secuencia de
verificación de la sección 6 (nunca confiar en el body del webhook de Flow).

---

## 0. Antes de empezar: tres decisiones confirmadas con el usuario

1. **Envío:** `pedidos_web.costo_envio` exige `> 0`, pero la cotización real (Haversine + Shipit)
   es Fase 4 y no existe todavía. Se usa una **tarifa plana fija** (`COSTO_ENVIO_PLANO`,
   `src/lib/envio.ts`) hasta esa fase — no distingue zona, es un placeholder honesto, no un
   cálculo inventado.
2. **DTE:** solo **boleta electrónica** (checkout de invitado, sin pedir RUT). Factura queda fuera
   de alcance.
3. **Credenciales Flow/OpenFactura:** no existen todavía. Todo el código de `src/lib/flow.ts` y
   `src/lib/openfactura.ts` se escribió según la sección 6 del README maestro, pero **sin poder
   probarlo contra las APIs reales** en esta sesión — ver los TODO marcados en ambos archivos y el
   punto 5 más abajo.

## 1. Bloqueo real descubierto: `/api/interno/ajustar-stock` no existía

El checkout necesita que el POS descuente stock tras confirmar un pago, pero esa ruta quedó
pendiente desde la Fase 0 del POS (`sevelin-pos-oficial/docs/CHANGELOG-V24.md`, sección 0.1) y
nunca se construyó. Confirmado con el usuario: se construyó ahora, como único cambio en el repo del
POS (`docs/CHANGELOG-V25.md` de ese repo) — `POST /api/interno/ajustar-stock`, protegida con
`authSync` (secreto compartido `SYNC_SECRET`, no JWT de staff), reutilizando
`descontarStockNoLotes()` que ya existía.

## 2. SQL — numeración de pedidos

`supabase/02-numeracion-pedidos.sql`: `SEQUENCE` + `generar_numero_pedido()` → `"WEB-000001"`.
Atómico entre checkouts concurrentes (mismo espíritu que `descontar_stock_venta` del POS) — evita
que dos compras casi simultáneas generen el mismo correlativo y choquen contra el `UNIQUE` de
`numero_pedido`.

## 3. Libs nuevas (`src/lib/`)

- `envio.ts`: `costoEnvioPlano()`.
- `pedidos.ts`: `crearPedido()`, `obtenerPedidoPorNumero()`, `guardarPagoFlow()`,
  `marcarPedidoFallido()`, `guardarDatosBoleta()`, y `marcarPedidoPagado()` — esta última es el
  **mutex** contra reintentos del webhook de Flow: `UPDATE ... SET estado='PAGADO' WHERE
  numero_pedido=$1 AND estado='CREADO'`. Si Flow reenvía la misma confirmación, la segunda
  actualización no afecta ninguna fila y el webhook no vuelve a descontar stock ni emitir boleta.
- `flow.ts`: `crearPagoFlow()`, `obtenerEstadoPagoFlow()`. Firma HMAC-SHA256 según la sección 6 del
  README (parámetros ordenados alfabéticamente, concatenados `clave=valor`).
- `openfactura.ts`: `emitirBoleta()`, con header `Idempotency-Key: numero_pedido`.
- `pos-interno.ts`: `ajustarStockPos()` — llama a la ruta nueva del POS (punto 1).

## 4. Route Handlers nuevos

- `POST /api/checkout`: server-side vuelve a consultar cada producto por SKU contra
  `productos_web` (nunca confía en precio/stock del carrito del cliente — mismo principio que el
  POS nunca confía en los totales que manda el navegador en una venta), valida stock, crea el
  pedido en `CREADO`, crea la orden de pago en Flow, y retorna `url_pago` para que el cliente
  redirija. Si Flow falla después de crear el pedido, el pedido pasa a `FALLIDO` (no queda
  colgado en `CREADO` para siempre).
- `POST /api/flow-webhook`: `urlConfirmation` de Flow. Orden exacto de la sección 6: confirma con
  `getStatus` (credenciales propias, nunca el body) → mutex `CREADO→PAGADO` → ajustar stock en el
  POS → emitir boleta. Si el pago ya se confirmó pero el ajuste de stock o la boleta fallan, queda
  logueado fuerte para revisión manual — no hay panel de reconciliación en esta fase (limitación
  conocida, no un fallo silencioso). `maxDuration = 60` (nota en código: requiere Vercel Pro, no
  aplica hasta que exista el proyecto Vercel real).
- `GET /api/pedido/:numero`: estado público de un pedido (checkout de invitado, sin auth).

## 5. Frontend

- `src/components/carrito-drawer.tsx`: el botón "Ir a pagar" pasa de deshabilitado a un `Link` real
  hacia `/checkout` (deshabilitado visualmente solo si el carrito está vacío).
- `src/app/checkout/page.tsx` + `src/components/formulario-checkout.tsx`: formulario de datos +
  dirección, resumen del carrito (subtotal + envío plano + total), llama a `POST /api/checkout` y
  redirige a Flow. Carrito vacío → mensaje + link a `/productos`, mismo criterio que el resto de
  la tienda.
- `src/app/pedido/[numero]/page.tsx`: estado del pedido por número, con mensaje según `estado`
  (incluye el caso `CREADO` mientras se espera el webhook — sin polling/websockets, botón manual
  de recargar). Mismo patrón try/catch de `productos/[sku]/page.tsx`: nunca un 500 crudo.

## 6. Variables de entorno nuevas

`.env.local.example` y `.env.local`: `NEXT_PUBLIC_SITE_URL`, `POS_INTERNAL_API_URL`,
`FLOW_API_KEY`/`FLOW_SECRET_KEY`/`FLOW_API_BASE`, `OPENFACTURA_API_KEY`/`OPENFACTURA_API_BASE`,
`COSTO_ENVIO_PLANO`.

## 7. Pruebas

- `npm run lint`: sin advertencias. `npm run build`: compila, tipa y prerenderiza sin errores
  (mismo manejo de falta de credenciales que fases anteriores).
- `node --check api/index.js` en `sevelin-pos-oficial`: sin errores.
- **Verificación visual en navegador** (`next dev` + Browser pane): carrito sembrado en
  `localStorage` → drawer con botón "Ir a pagar" habilitado → `/checkout` con resumen correcto
  ($19.990 + $3.990 envío = $23.980 en la prueba) → submit real contra `POST /api/checkout`:
  responde 409 con el error esperado (`TypeError: fetch failed`, porque Supabase Web no existe
  todavía) y el formulario vuelve a estado usable, sin quedar colgado. `/pedido/WEB-000001` (pedido
  inexistente, Supabase Web no configurado): muestra el fallback "No pudimos consultar tu pedido en
  este momento." en vez de un 500 crudo.
- **No se probó de punta a punta** (checkout real → Flow → webhook → POS → boleta): imposible sin
  el proyecto Supabase Web real, sin credenciales Flow/OpenFactura, y sin el proyecto Vercel real
  para que Flow pueda llamar de vuelta al webhook — los tres bloqueantes ya documentados en
  "Pendiente" abajo.

## 8. TODO críticos sin verificar (marcados en el código)

- `src/lib/flow.ts`: algoritmo exacto de firma HMAC y códigos de estado (`FLOW_ESTADO_PAGADO = 2`)
  implementados según la sección 6 del README maestro, sin poder probarlos contra la API real de
  Flow. El propio README advierte "confirmar el código exacto vigente... no asumirlo de memoria".
- `src/lib/openfactura.ts`: `TipoDTE` de boleta electrónica (`39`, código estándar del SII) sin
  verificar contra la documentación vigente de Haulmer.
- Verificar ambos en cuanto existan credenciales sandbox reales, antes del primer pago/boleta real.

## 9. Siguiente sesión

Lee `docs/SNAPSHOT.md` de este repo primero. Bloqueantes para probar de punta a punta (ninguno se
puede resolver desde una sesión de Claude): proyecto Supabase Web real, proyecto Vercel real (Flow
necesita URLs públicas reales para `urlConfirmation`/`urlReturn`, y el checkout necesita
`maxDuration` de un plan Pro), y credenciales sandbox de Flow y OpenFactura. Con esos tres, el
punto 8 (verificar firma de Flow y `TipoDTE` de OpenFactura) es el primer paso antes de un pago
real. Fase 4 (cotización de envío real) es la siguiente fase de código.
