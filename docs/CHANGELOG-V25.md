# CHANGELOG v25 — Chilexpress: endpoint correcto para tarifa con descuento (31-08-2026)

## Qué se hizo

Soporte de Integraciones de Chilexpress respondió por correo con el kit completo de integración
(Postman Collection de QA, manual de webhook, listado de estados de tracking). El correo aclaró algo
importante que no estaba en la documentación pública revisada en v20/v24:

> "Cotizador Empresa (debe usar este endpoint para obtener mejores tarifas al ser cliente directo de
> Chilexpress y contar con TCC)"

**Se estaba usando el endpoint equivocado.** `rates/courier` (el que se venía usando desde v6) es la
cotización genérica, sin descuento. `rates/business` ("Cotizador Empresa") es el que hay que usar
ahora que el dueño tiene TCC — la respuesta trae un campo extra, `serviceValueDiscount`, con el precio
YA con el descuento del convenio corporativo aplicado.

- `src/lib/chilexpress.ts::cotizarTarifasChilexpress()`: cambia `rating/api/v1.0/rates/courier` →
  `rating/api/v1.0/rates/business`. La comparación de "tarifa más barata" ahora usa
  `serviceValueDiscount` cuando viene, cae a `serviceValue` si no (llaves sin descuento configurado
  devuelven los dos campos iguales — es el caso de las llaves de prueba de hoy).
- El manual de webhook y el listado de estados de tracking (adjuntos del correo) son para **recibir
  notificaciones de envíos ya creados** — no aplican todavía: este proyecto solo cotiza, no genera
  envíos reales con Chilexpress. Quedan documentados acá para cuando se implemente esa fase.

## Cómo se probó

- `curl` directo contra `rates/business` en `testservices.wschilexpress.com` (con la llave de Cotizador
  ya configurada) — respondió 200 con `serviceValueDiscount` presente (igual a `serviceValue`, sin
  descuento real todavía, esperable con llaves de prueba).
- `curl` directo contra `rates/business` en `qaservices.wschilexpress.com` (ambiente de QA de
  Chilexpress, con la key de la Postman Collection que mandó soporte) — mismo comportamiento.
- `tsc --noEmit`, `npm run lint`, `npm run build` (producción) — limpios.

## Pendiente

1. Sigue esperando las credenciales productivas (ver `docs/CHANGELOG-V24.md`) — cuando lleguen, el
   descuento real del convenio va a aparecer solo en `serviceValueDiscount`, sin tocar más código.
2. **Fuera de alcance por ahora**: generación real de envíos/etiquetas (`Generar Envíos`) y webhook de
   tracking — el dueño no ha pedido esa fase todavía, solo cotización. El manual de webhook y el
   listado de estados quedan como referencia para cuando se aborde.
