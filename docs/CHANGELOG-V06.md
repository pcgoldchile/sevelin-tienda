# CHANGELOG V06 — 26 de agosto de 2026

> Sexto changelog de este repo. Rediseño del modelo de envío, a pedido del usuario: descarta Shipit
> por completo y lo reemplaza por integración directa con Chilexpress (convenio corporativo propio),
> además de agregar una opción real de retiro en tienda.

---

## 0. Contexto: decisión del usuario, con matices reales

> "Shipit queda 100% descartado: no operan retiros desde Arica y no se utilizará. Usaremos la API
> Oficial de Chilexpress porque tengo convenio corporativo activo con tarifa preferencial y línea de
> crédito. Local (Arica): Retiro en Tienda / Delivery Arica (tarifa fija o $0). Regiones: cotización
> automática vía Chilexpress. Para desbloquear la Fase 6 ahora mismo: tarifa fija/mock para
> Chilexpress mientras se configuran las API keys."

Consecuencia de diseño que se desprende de esto (no pedida explícitamente, pero necesaria): la
Fase 4 decidía LOCAL vs COURIER con Haversine (¿está a ≤10 km de la tienda?). Ese cálculo ya no
tiene sentido — dentro de la comuna de Arica ahora es el **cliente quien elige** entre retiro o
despacho (no una distancia), y fuera de Arica siempre es Chilexpress sin importar qué tan lejos.
**Se eliminó por completo la geocodificación con Nominatim y el cálculo Haversine** — si en el
futuro hace falta un segundo criterio dentro de Arica (ej. un radio de despacho a domicilio), avisar
para volver a agregarlo.

## 1. Shipit eliminado

`src/lib/shipit.ts` borrado. `SHIPIT_EMAIL`/`SHIPIT_ACCESS_TOKEN` quitados de `.env.local(.example)`.

## 2. `src/lib/chilexpress.ts` (nuevo)

A diferencia de Shipit (con portal de documentación pública legible), `developers.wschilexpress.com`
es una SPA sin contenido estático accesible. Los endpoints y campos se sacaron del **código fuente
real** del plugin oficial de WooCommerce de Chilexpress
(`github.com/whooohq/whq-woocommerce-chilexpress-shipping`, archivado en 2023) — más sólido que
adivinar de memoria, pero sigue siendo una fuente indirecta (un plugin de terceros, no la
documentación oficial vigente). Marcado con TODO crítico: validar contra
`developers.wschilexpress.com` o `soporteintegraciones@chilexpress.cl` en cuanto haya API key real.

- Base: `https://services.wschilexpress.com` (prod) / `https://testservices.wschilexpress.com` (QA).
- Auth: header `Ocp-Apim-Subscription-Key`.
- `GET /georeference/api/v1.0/coverage-areas?RegionCode=X&type=0` → comunas de una región
  (`countyCode`/`coverageName`).
- `POST /rating/api/v1.0/rates/courier` → `{ originCountyCode, destinationCountyCode, package:
  {weight,height,width,length}, productType, contentType, declaredWorth, deliveryTime }` →
  `data.courierServiceOptions[]` (`serviceTypeCode`, `serviceDescription`, `serviceValue`).
- **Sin resolver todavía**: mapear comuna → `countyCode` de destino requiere saber primero el
  código de región de Chilexpress de esa comuna (la cobertura se consulta por región, no hay un
  listado plano como en Shipit) — sin acceso real a la API no se pudo verificar ese mapeo. Queda
  como TODO explícito en el código (`CHILEXPRESS_DESTINO_COUNTY_CODE_FIJO` es un escape hatch solo
  para una prueba puntual con una comuna fija).

## 3. `src/lib/envio.ts` (reescrito)

Nuevo modelo, sin Haversine:
```
comuna == "Arica" → dos OPCIONES para que el cliente elija:
    RETIRO ($0, en tienda)
    LOCAL  (COSTO_ENVIO_PLANO, despacho a domicilio en Arica)
cualquier otra comuna → una sola opción:
    CHILEXPRESS (cotización real si CHILEXPRESS_API_KEY existe, si no COSTO_ENVIO_CHILEXPRESS_MOCK)
```
`cotizarOpcionesEnvio()` (vista previa, `POST /api/cotizar-envio`) devuelve las opciones válidas
para que el cliente elija. `confirmarEnvio()` (autoridad real, `POST /api/checkout`) recibe cuál
eligió y **recalcula el costo desde cero según el método** — nunca confía en un monto que mande el
cliente. La elección en sí (retiro vs. local) es legítima del cliente, igual que elegir método de
pago; lo que nunca se confía es el precio asociado a esa elección.

## 4. Costo de envío $0 permitido — migración SQL nueva

`pedidos_web.costo_envio` tenía `CHECK (costo_envio > 0)` desde la Fase 1 ("nunca gratis ni $0",
README maestro sección 2). El retiro en tienda rompe esa regla a propósito — es una decisión de
negocio nueva, no un descuido. `supabase/03-permitir-envio-gratis.sql` relaja el constraint a
`>= 0`. **Hay que correrla en Supabase Web además de las migraciones 01 y 02** (ver "Pendiente" en
`docs/SNAPSHOT.md`).

## 5. Variables de entorno

Quitadas: `SHIPIT_EMAIL`, `SHIPIT_ACCESS_TOKEN`.
Nuevas: `CHILEXPRESS_API_KEY`, `CHILEXPRESS_API_BASE`, `CHILEXPRESS_ORIGIN_COUNTY_CODE`,
`COSTO_ENVIO_CHILEXPRESS_MOCK` (tarifa referencial mientras no haya API key — pedido explícito del
usuario para no bloquear las pruebas).

## 6. Frontend (`src/components/formulario-checkout.tsx`)

Antes "Calcular envío" devolvía un solo número. Ahora `POST /api/cotizar-envio` devuelve
`{ opciones: [...] }`: si es una sola (Chilexpress, fuera de Arica) se preselecciona sola, igual que
antes. Si son dos (Arica), aparecen como radio buttons y el cliente tiene que elegir una a propósito
antes de que se habilite "Pagar" — el total se recalcula en vivo según cuál esté marcada.

## 7. Pruebas

- `npm run lint` / `npm run build`: sin errores.
- **Probado real en el navegador**, las dos ramas:
  - Comuna "Arica": aparecen las 2 opciones (Retiro $0 / Local $2.000 — el valor real de
    `COSTO_ENVIO_PLANO` que configuró el usuario), el total se recalcula bien al elegir cada una
    ($19.990 con retiro, $21.990 con despacho local).
  - Comuna "Santiago": una sola opción, Chilexpress mock ($6.000, `COSTO_ENVIO_CHILEXPRESS_MOCK`),
    preseleccionada sola, total $25.990 correcto.
  - Submit real contra `POST /api/checkout`: falla de forma controlada con el error real de
    Supabase (`Could not find the table 'public.productos_web'...` — faltan correr las migraciones,
    ver `docs/CHANGELOG-V05.md`), sin 500 crudo ni el botón colgado.

## 8. Siguiente sesión

1. Correr `supabase/03-permitir-envio-gratis.sql` junto con las migraciones 01 y 02 pendientes (ver
   `docs/SNAPSHOT.md`).
2. Cuando el usuario consiga las API keys de Chilexpress: resolver el TODO de mapeo comuna →
   countyCode (necesita acceso real a la API para verificar los códigos de región), configurar
   `CHILEXPRESS_ORIGIN_COUNTY_CODE`, y validar el contrato completo de `chilexpress.ts` contra la
   documentación oficial o soporte de Chilexpress.
3. El resto de los bloqueantes de Fase 6 (proyecto Vercel, `SYNC_SECRET` en el POS, prueba de pago
   Flow completa) siguen igual — ver `docs/SNAPSHOT.md`.
