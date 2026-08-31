# CHANGELOG v29 — Checkout: pill de cantidad más robusto + campo RUT (01-09-2026)

## Qué se hizo

Dos pedidos sobre una captura real del checkout (v28 recién comiteado, todavía sin desplegar):

- **Selector de cantidad más robusto**: en "Tu pedido" el dueño vio el número "escapándose" del óvalo
  −/número/+. No se pudo reproducir el bug exacto en las pruebas (se veía bien en escritorio y
  mobile), pero la causa más probable es real: los 3 elementos (botón/input/botón) medían su alto por
  `padding`, que depende de la fuente/line-height del navegador — sin una altura fija podían quedar
  descalzados. Se cambió a `h-7`/`w-7` fijos con `flex items-center justify-center` en los 3, que ya
  no dependen de métricas de fuente.
- **Campo RUT (identificación, opcional)** en "Tus Datos": un solo input, no dos — el dueño preguntó
  si convenía separar el dígito verificador en otro campo; la recomendación (y lo que ya proponía él
  mismo) es un solo campo con el DV incluido, reformateado solo en cada tecla
  (`src/lib/rut.ts::formatearRut()`: `"219613873"` → `"21.961.387-3"`). Es el patrón que ya usan
  bancos/SII/retail en Chile — separar el DV solo agrega una pregunta ("¿qué pongo acá?") sin
  beneficio real. Solo formatea, no valida el dígito verificador (módulo 11) — no hacía falta para
  identificación, no facturación electrónica real.
- **Se persiste, no se descarta**: `pedidos_web.cliente_rut` nuevo (`supabase/15-cliente-rut.sql`,
  aplicada) — distinto de `factura_rut` (el de la empresa cuando se pide factura). Pasa por
  `POST /api/checkout` → `crearPedido()` igual que el resto de los datos del cliente. **No se agregó
  a la tabla "Pedidos Web" del POS** — el dato queda guardado pero no visible ahí todavía; agregarlo
  es un cambio chico si se necesita verlo en ese panel.

## Cómo se probó

- `tsc --noEmit`, `npm run lint`, `npm run build` (producción) — limpios.
- `npm run dev` real + Browser pane: se escribió `219613873` en el campo RUT y se confirmó
  (`input.value`) que quedó `21.961.387-3`, igual al ejemplo que dio el dueño.
- El pill de cantidad se revisó en escritorio y en mobile (375px) — no se logró reproducir el
  problema reportado, pero el cambio a altura fija es objetivamente más robusto (ya no depende de
  cómo el navegador del dueño renderice line-height). **Pendiente de confirmación real**: pedirle que
  revise si se ve bien ahora en su navegador.
- Un dev server quedó con `.next` corrupto durante la sesión (rutas devolviendo 404 sueltos,
  incluidas rutas que sí existen) — se resolvió borrando `.next` y reiniciando, no era un bug del
  código.

## Pendiente

1. **Confirmar con el dueño que el pill de cantidad ya se ve bien** — no se pudo reproducir el bug
   original para verificar la corrección contra el caso real.
2. Si se quiere ver el RUT del cliente en el panel "Pedidos Web" del POS, agregarlo ahí (chico).
