# CHANGELOG v28 — Checkout: cantidades editables y envío automático (01-09-2026)

## Qué se hizo

Pedido explícito del dueño con una captura del checkout real: poder seguir ajustando cantidades (o
quitar productos) desde "Finalizar compra" sin volver al carrito, que el envío se calcule solo sin
botón, y reordenar los campos de dirección.

- **Cantidades editables en "Tu pedido"**: cada ítem del resumen ahora tiene el mismo selector
  −/número/+ que ya existía en el carrito lateral (`cambiarCantidad` de `useCarrito`), más un botón
  "Quitar" (`quitarItem`). El tope sigue siendo el stock disponible.
- **Envío 100% automático, sin botón**: se sacó "Calcular envío"/"Recalcular envío". Un
  `useEffect` con debounce de 600ms dispara la cotización sola apenas la dirección queda completa
  (región + comuna + calle + número, y km si es un valle de Arica), y de nuevo cada vez que cambia
  algo que afecta el costo — la dirección, o las cantidades/ítems del carrito (el peso del paquete
  cambia con ellas). `calle`/`numero`/`km_valle` pasaron de inputs no controlados (solo se leían al
  tocar el botón) a estado de React, necesario para que el efecto sepa cuándo cambiaron.
  - Si el método ya elegido sigue disponible entre las opciones nuevas (ej. solo cambió la cantidad),
    se mantiene — no tiene sentido hacer que el cliente vuelva a elegir por eso.
  - Se corrigió un error real de lint (`react-hooks/set-state-in-effect`): el reseteo de la
    cotización al tocar un campo se hace desde cada `onChange` (`invalidarEnvio()`), no
    sincrónicamente dentro del cuerpo del efecto.
- **Orden de los campos de dirección**: Región → Comuna → (Valle/km si es Arica) → Calle → Número →
  Referencia. Antes Calle/Número iban primero — pedido explícito del dueño, "se preguntaba el detalle
  antes que la ubicación general".

## Cómo se probó

- `tsc --noEmit`, `npm run lint`, `npm run build` (producción) — limpios.
- `npm run dev` real + Browser pane, contra Chilexpress y Supabase Web de **producción** (ya activados
  en v27):
  - Se agregaron 2 productos reales al carrito, se llenó región/comuna/calle/número de Iquique — la
    cotización se disparó sola, sin tocar ningún botón.
  - Uno de los productos no tiene peso/dimensiones cargadas — dio el error real y correcto
    ("contáctanos por WhatsApp"), no relacionado con este cambio.
  - Se quitó ese producto con "Quitar" → recalculó solo → mostró una tarifa Chilexpress **real**
    ($5.253, con el descuento del convenio activo desde v27).
  - Se subió la cantidad con "+" → el peso cambió → el envío se recalculó solo a $5.533, el total
    ($75.533) se actualizó de punta a punta.
  - Se cambió la región/comuna a Arica (con la misma dirección de Iquique, inválida para geocodificar
    ahí a propósito) → aparecieron **Retiro (gratis) y Chilexpress juntos**, con el aviso de que no se
    pudo ubicar la dirección para el despacho por km — confirma que las opciones se muestran en
    conjunto, como ya estaba diseñado desde v6, ahora disparado automáticamente.
- Eventos de prueba (`visita`) que se generaron contra la base real durante la prueba se borraron al
  terminar.

## Pendiente

Ninguno nuevo — el checkout queda funcionando de punta a punta con Chilexpress real.
