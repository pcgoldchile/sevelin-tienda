# CHANGELOG v20 — Chilexpress: llaves reales, código validado (31-08-2026)

## Qué se hizo

El dueño consiguió 3 suscripciones reales del portal de Chilexpress (developers.wschilexpress.com):
**API-COBERTURAS-CHILEXPRESS**, **API-COTIZADOR-CHILEXPRESS**, **API-ENVIOS-CHILEXPRESS**, cada una
con su propia `Ocp-Apim-Subscription-Key`. Se probaron las 3 contra la API real (no se adivinó nada
esta vez) para resolver el TODO crítico que dejó pendiente v6.

**Hallazgo clave**: contra `https://services.wschilexpress.com` (producción) las 3 suscripciones
dieron 401 "invalid subscription key" en casi todos los endpoints. Contra
`https://testservices.wschilexpress.com` (ambiente de pruebas) las 3 funcionaron perfecto, incluida la
cotización real de tarifa. El FAQ del propio portal (`developers.wschilexpress.com/faq`) explica por
qué: **las credenciales productivas (con la tarifa preferencial real del convenio corporativo)
requieren una TCC** (Tarjeta de Cliente Chilexpress) — un trámite aparte (formulario "Quiero Ser
Cliente" en `portalempresa.chilexpress.cl`), no algo que resuelve regenerar la key del registro
self-service. Las 3 llaves que tiene el dueño hoy son de ese registro gratis y solo devuelven precios
de prueba.

**Código actualizado con lo confirmado**:
- `src/lib/chilexpress-regiones.ts` (nuevo): mapeo de las 16 regiones de Chile al código de región de
  Chilexpress — confirmado contra la API real probando la comuna cabecera de cada región (Rancagua→R6,
  Talca→R7, Valdivia→R14, Coyhaique→R11, Punta Arenas→R12, Arica→R15, Chillán→R16, Temuco→R9, Puerto
  Montt→R10, Iquique→R1, Calama→R2, Copiapó→R3, La Serena→R4, Valparaíso→R5, Santiago→RM). No está
  documentado en ninguna parte pública.
- `src/lib/envio.ts::cotizarViaChilexpress()`: ya no necesita `CHILEXPRESS_DESTINO_COUNTY_CODE_FIJO`
  (una env var temporal para pruebas puntuales) — resuelve el countyCode de destino automáticamente
  con `buscarCountyCodePorComuna()` + el mapeo de región. `region` ahora viaja también en la cotización
  previa (`POST /api/cotizar-envio`), no solo en el checkout real — antes solo se mandaba comuna.
- `src/lib/chilexpress.ts`: 3 llaves separadas en vez de una sola (`CHILEXPRESS_API_KEY_COBERTURAS`,
  `_COTIZADOR`, `_ENVIOS`) — cada suscripción del portal tiene la suya, no son intercambiables.
  `chilexpressHabilitado()` solo mira la de Cotizador (la que produce el precio).
- **Bug real encontrado y corregido**: `serviceValue` en la respuesta de
  `rating/api/v1.0/rates/courier` viene como **texto** (`"15172"`), no número. El código original
  (sacado del plugin de WooCommerce de Chilexpress, sin documentación oficial disponible) lo comparaba
  con `<` sin convertir — comparación de texto, no numérica (`"9177" > "10115"` alfabéticamente),
  hubiera elegido mal la tarifa "más barata" al ponerse en producción. Corregido con `Number()` antes
  de comparar y redondear.
- `CHILEXPRESS_API_BASE` por defecto vuelve a `testservices.wschilexpress.com` (el código original
  de v6 ya lo tenía así; se había cambiado por error a producción en un paso intermedio de esta misma
  sesión, antes de descubrir que necesitaba TCC).

## Por qué NO se activó en producción

`CHILEXPRESS_API_KEY_COTIZADOR` se deja vacío a propósito en `.env.local` y no se tocó Vercel. Si se
configurara ahora, el checkout le mostraría a un cliente real un precio de PRUEBA (no la tarifa
preferencial real) en vez de `COSTO_ENVIO_CHILEXPRESS_MOCK`. El código ya está validado de punta a
punta — cuando el dueño consiga la TCC y las credenciales productivas, activar es: cambiar
`CHILEXPRESS_API_BASE` a `services.wschilexpress.com` y poner las 3 keys nuevas en Vercel, sin tocar
más código.

## Cómo se probó

- `curl` directo contra la API real de Chilexpress (ambos ambientes, las 3 suscripciones, endpoints de
  georeferencia y rating) — no contra el código de la app, para aislar si el problema era de llaves o
  de la implementación.
- `tsc --noEmit`, `npm run lint`, `npm run build` (producción) limpios tras cada cambio.
- **No probado**: el flujo completo de checkout con Chilexpress real end-to-end (el gate
  `chilexpressHabilitado()` sigue apagado a propósito, ver arriba) ni las credenciales productivas
  (dependen de que el dueño tramite la TCC).
