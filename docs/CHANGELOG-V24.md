# CHANGELOG v24 — Chilexpress: documentación oficial encontrada, declaredWorth real (31-08-2026)

## Qué se hizo

El dueño encontró que `developers.wschilexpress.com/api-details` sí tiene documentación pública real
(operaciones `Rate`, `GetOffices`, `CloseCertificate` entre otras) — **no requiere login**, a
diferencia de la página de detalle de producto que se había revisado en v20 ("Tus Suscripciones" pedía
iniciar sesión, pero el detalle técnico de cada operación no). Esto reemplaza dos supuestos de v20 por
hechos confirmados:

- **`declaredWorth` es OBLIGATORIO**, no decorativo. `src/lib/envio.ts::agregarPaquete()` ahora calcula
  el valor real del carrito (suma de `precio_web × cantidad` de cada ítem) y lo pasa a
  `cotizarTarifasChilexpress()` — antes se mandaba `0` fijo porque no había forma de confirmar el
  campo. `src/lib/chilexpress.ts::cotizarTarifasChilexpress()` recibe el parámetro nuevo
  `valorDeclarado`.
- **El mapeo de regiones quedó oficial**, no solo empírico: `GET /georeference/api/v1.0/regions`
  (documentado) devuelve las 16 regiones con su código exacto — se probó contra la API real y coincide
  100% con `src/lib/chilexpress-regiones.ts` (que se había armado probando comuna por comuna en v20).
- **Camino a producción confirmado**: la página "¿Cómo me integro?" del portal explica que, con una TCC
  asociada (el dueño la vinculó a su cuenta de Portal Empresa el mismo día), el paso siguiente es
  escribir a `soporteintegraciones@chilexpress.cl` pidiendo las credenciales productivas — Chilexpress
  responde en menos de 24 horas por correo.

## Cómo se probó

- `tsc --noEmit`, `npm run lint`, `npm run build` (producción) — limpios.
- `curl` directo contra `rating/api/v1.0/rates/courier` (ambiente de pruebas) con un `declaredWorth`
  real (45990) en vez de 0 — respondió 200 igual, mismas tarifas de prueba (esperable: el ambiente de
  pruebas no calcula precio real a partir del valor declarado, pero confirma que el campo no rompe
  nada).
- `curl` directo contra `GET /georeference/api/v1.0/regions` con la llave de Coberturas — devolvió las
  16 regiones, comparadas una por una contra `chilexpress-regiones.ts`: coinciden exactas.

## Pendiente

1. **Escribir a soporteintegraciones@chilexpress.cl** solicitando las credenciales productivas —
   acción del dueño, no de código.
2. Cuando lleguen: poner las 3 keys nuevas en Vercel y cambiar `CHILEXPRESS_API_BASE` a
   `services.wschilexpress.com`. Sin cambios de código adicionales.
