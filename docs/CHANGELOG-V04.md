# CHANGELOG V04 — 26 de agosto de 2026

> Cuarto changelog de este repo. Fase 4 del e-commerce Sevelin (ver `README-ECOMMERCE-SEVELIN.md`,
> documento maestro en `sevelin-pos-oficial`, sección 8 fila "4" y sección 5).

Cotización real de envío: reemplaza la tarifa plana fija de la Fase 3
(`docs/CHANGELOG-V03.md` punto 0.1) por la lógica real ya planeada — Haversine para envío local,
Shipit para courier. Nunca $0.

---

## 0. Antes de empezar: dirección real de la tienda y decisiones confirmadas

El usuario dio la dirección real: **San Rafael 896, Arica, Arica y Parinacota, Chile**. Se
geocodificó con OpenStreetMap/Nominatim a `lat -18.4462918, lon -70.2879656` (precisión de calle —
Nominatim no tiene el número 896 exacto; el margen de error, de cientos de metros, es
insignificante frente al radio de 10 km).

Tres decisiones confirmadas antes de programar:
1. Tarifa LOCAL: **un valor plano único** dentro de los 10 km (no escalonado por distancia) —
   sigue siendo `COSTO_ENVIO_PLANO`, el mismo de la Fase 3, ahora aplicado solo tras confirmar
   distancia real.
2. Credenciales Shipit: no existen todavía — mismo criterio que Flow/OpenFactura en la Fase 3.
3. Geocodificación de la dirección del cliente: **OpenStreetMap/Nominatim** (gratis, sin cuenta),
   solo cuando la comuna ya es "Arica" (cualquier otra comuna es evidentemente COURIER).

## 1. Hallazgo: la API de Shipit sí se pudo verificar contra documentación real

A diferencia de Flow en la Fase 3 (solo había una descripción genérica en el README maestro),
`developers.shipit.cl` tiene documentación pública concreta:
- Auth: headers `X-Shipit-Email` + `X-Shipit-Access-Token` (no un solo "API key" genérico).
- `GET https://api.shipit.cl/v/communes` → lista completa de comunas (`id`/`name`), sin filtro de
  búsqueda del lado servidor.
- `POST https://api.shipit.cl/v/rates` con `{ parcel: { length, height, width, weight, origin_id,
  destiny_id, type_of_destiny: "domicilio" } }` → `{ prices: [...], lower_price: {...} }`.

Fuente: [developers.shipit.cl](https://developers.shipit.cl/reference/consultar-precio-version-estable).
Aun así, sin token real no se pudo confirmar el contrato 100% — queda marcado con TODO en
`src/lib/shipit.ts`, mismo criterio que Flow/OpenFactura.

## 2. `src/lib/envio.ts` (reescrito — antes era solo la tarifa plana de la Fase 3)

`cotizarEnvio(direccion, items)`: si `comuna == "Arica"`, geocodifica con Nominatim y calcula
Haversine contra `ORIGEN_TIENDA`; si da ≤10 km, `LOCAL` con `COSTO_ENVIO_PLANO`. En cualquier otro
caso (otra comuna, geocodificación falló, o quedó fuera de rango) cotiza con Shipit — **nunca se
asume LOCAL por defecto** si la geocodificación falla, ante la duda cotiza con Shipit.

Es la única fuente de verdad: la llaman tanto `POST /api/cotizar-envio` (vista previa) como
`POST /api/checkout` (autoridad real al crear el pedido) — el costo de envío SIEMPRE se recalcula
en el servidor al pagar, nunca se confía en la cotización previa mostrada en pantalla (mismo
principio que ya aplicaba precio/stock de los ítems).

Para Shipit, agrega el paquete de todo el carrito: peso = suma de `peso_kg×cantidad`, dimensiones =
las del ítem de mayor volumen entre todos (aproximación conservadora, no hay lógica de empaquetado
real en esta fase). Si a cualquier ítem le falta un dato de peso/dimensiones (auditado pero no
garantizado desde la Fase 0 del POS), se rechaza con un mensaje claro pidiendo contactar por
WhatsApp — nunca se inventa un valor por defecto.

## 3. `src/lib/shipit.ts` (nuevo — cliente delgado, mismo patrón que `flow.ts`/`openfactura.ts`)

`buscarComunaId()` (con caché en memoria del proceso, la lista de comunas no cambia seguido) y
`cotizarTarifasShipit()`.

## 4. Route Handlers

- `POST /api/cotizar-envio` (nuevo): vista previa antes de pagar.
- `POST /api/checkout` (editado): vuelve a llamar `cotizarEnvio()` server-side antes de crear el
  pedido — no confía en lo que el cliente vio en la vista previa.
- `crearPedido()` (`src/lib/pedidos.ts`, editado): ya no calcula el envío internamente, lo recibe
  resuelto (`metodoEnvio`/`costoEnvio`) del llamador. Sin cambios de schema — `pedidos_web` ya
  tenía `metodo_envio`/`costo_envio` desde la Fase 1.

## 5. Frontend (`src/components/formulario-checkout.tsx`)

Paso nuevo explícito: botón "Calcular envío" (separado de "Pagar"). El botón "Pagar" queda
deshabilitado hasta tener una cotización válida. Si el cliente edita calle/número/comuna después de
cotizar, la cotización se invalida automáticamente (evita pagar con un envío que ya no corresponde
a la dirección actual). `src/app/checkout/page.tsx` simplificado: ya no precalcula envío
server-side.

## 6. Variables de entorno nuevas

`SHIPIT_EMAIL`, `SHIPIT_ACCESS_TOKEN` (sin credenciales todavía). `COSTO_ENVIO_PLANO` se mantiene,
ahora es la tarifa LOCAL real.

## 7. Pruebas

- `npm run lint` / `npm run build`: sin errores.
- **La rama LOCAL sí se probó de punta a punta en el navegador** (a diferencia de todo lo demás en
  las Fases 3-4: Nominatim es público, no requiere cuenta): carrito sembrado en `localStorage` →
  `/checkout` → dirección real cerca de la tienda ("San Rafael 850", comuna "Arica") → "Calcular
  envío" → devolvió `LOCAL` con `$3.990` (`COSTO_ENVIO_PLANO`), total `$23.980` correcto, botón
  "Pagar" habilitado.
- La rama COURIER se probó con una comuna lejana ("Santiago") → cae a Shipit → falla de forma
  controlada (`TypeError: fetch failed` al buscar peso/dimensiones en `productos_web`, porque
  Supabase Web no está configurado todavía) — mismo patrón de error controlado que Flow/OpenFactura
  en la Fase 3, sin 500 crudo y sin dejar el botón "Calculando…" colgado.
- No se pudo probar Shipit contra la API real (sin credenciales) ni con datos de peso/dimensiones
  reales (sin Supabase Web real) — bloqueantes ya documentados en `docs/SNAPSHOT.md`.

## 8. Siguiente sesión

Lee `docs/SNAPSHOT.md` primero. Antes del primer despacho real por courier: conseguir credenciales
Shipit y verificar el contrato exacto de `POST /v/rates` contra la API real (TODO en
`src/lib/shipit.ts`). Fase 5 (panel "Pedidos Web" en el POS) es la siguiente fase de código.
