# CHANGELOG v26 — Chilexpress: credenciales productivas confirmadas (01-09-2026)

## Qué se hizo

Soporte de Integraciones de Chilexpress mandó las 3 credenciales PRODUCTIVAS reales (Coberturas,
Cotizador/Cotizador Empresa, Generación de OT) tras la solicitud del dueño con su TCC ya asociada
(ver `docs/CHANGELOG-V25.md`).

Se probaron los 2 endpoints de solo lectura contra `services.wschilexpress.com` (producción real):

- **Georeferencia**: `GET /georeference/.../regions` y `.../coverage-areas` — devolvieron las 16
  regiones y el countyCode de Arica ("ARIC") y Santiago, idénticos a lo ya confirmado en pruebas.
- **Cotizador Empresa**: `POST /rating/api/v1.0/rates/business` — devolvió una cotización real
  (Arica → Santiago) con `serviceValueDiscount` (precio con el descuento del convenio corporativo).

**No se probó "Generación de OT"** (`transport-orders`) a propósito — a diferencia de los otros dos,
ese endpoint crea un envío real y factura a la TCC, no es de solo lectura. Este proyecto todavía no
genera envíos reales, solo cotiza.

**Hallazgo sin impacto en el código**: el correo de soporte usa el path `/georeference/v2/api/V1.0/...`
para georeferencia; se probó que el path viejo que ya usaba el código
(`/georeference/api/v1.0/...`) también responde igual en producción — no hizo falta cambiar nada,
solo las variables de entorno.

## Qué falta para activarlo

El código ya está listo — nunca necesitó cambios funcionales, solo la corrección de v25 (endpoint
`rates/business`) y v24 (`declaredWorth` real). Falta que el dueño ponga en Vercel (proyecto
`sevelin-tienda`):

- `CHILEXPRESS_API_KEY_COBERTURAS` = la key productiva de Coberturas
- `CHILEXPRESS_API_KEY_COTIZADOR` = la key productiva de Cotizador
- `CHILEXPRESS_API_KEY_ENVIOS` = la key productiva de Envíos (sin uso todavía, pero para tenerla lista)
- `CHILEXPRESS_API_BASE` = `https://services.wschilexpress.com`

**Esto es una decisión de negocio, no solo técnica**: en cuanto `CHILEXPRESS_API_KEY_COTIZADOR` tenga
valor en Vercel, el courier fuera de Arica deja de usar `COSTO_ENVIO_CHILEXPRESS_MOCK` y empieza a
cobrar la tarifa real de Chilexpress a los clientes. Confirmar que es lo que se quiere antes de
pegarlas.

## Cómo se probó

- `curl` directo contra los 2 endpoints de producción (georeferencia y cotizador), con las keys
  productivas reales — ambos devolvieron 200 con datos reales.
- Se verificó que el path de georeferencia viejo (v1) funciona igual que el nuevo (v2) mencionado en
  el correo de soporte — no se tocó código.
- `tsc --noEmit`, `npm run lint` — limpios (solo cambiaron comentarios, ningún archivo `.ts` cambió de
  comportamiento).
- **No se probó** el endpoint de Generación de OT a propósito (crearía un envío real y factura).

## Pendiente

1. **El dueño pone las 4 variables en Vercel** cuando decida activar el cobro real — acción suya, no
   de código.
