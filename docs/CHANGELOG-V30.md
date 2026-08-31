# CHANGELOG v30 — Carrito y checkout estilo MercadoLibre + dirección de facturación (31-08-2026)

## Qué se hizo

Pedido explícito del dueño sobre 3 capturas reales (checkout con el número de cantidad "escapándose"
del óvalo, y una captura de MercadoLibre como referencia de estilo):

- **Confirmado el fix del pill de cantidad**: se midió con `getBoundingClientRect()` en el navegador
  real — los 3 elementos (botón/input/botón) miden exactamente 36px de alto, sin desfase. El bug de
  v28/v29 ya no puede reproducirse porque el control de cantidad **ya no vive en `/checkout`** (se
  movió por completo a `/carrito`, ver abajo).
- **`/carrito` (nueva página)**: reemplaza el drawer lateral (`carrito-drawer.tsx`, eliminado). Cada
  ítem tiene un checkbox de selección — estilo MercadoLibre: lo que no se va a comprar ahora se puede
  dejar en el carrito sin llevarlo al pago. "Seleccionar todos", cantidad editable, "Quitar", y
  "Compartir carrito" (portado del drawer, mismo popup de duración de 24h). Botón "Ir a pagar"
  (deshabilitado si no hay nada seleccionado) navega a `/checkout`.
- **`/checkout` ya no tiene controles de cantidad**: "Tu pedido" quedó de solo lectura (nombre,
  cantidad, precio) con un link "Editar" que vuelve a `/carrito`. Solo se paga lo que llegó
  seleccionado (`itemsSeleccionados`).
- **"Tu pedido" va primero en mobile**: pedido explícito del dueño ("al comprar por teléfono la
  sección tu pedido sale al final, y debería quedar al principio"). En el DOM el resumen va antes que
  el formulario; en escritorio se reordena a la derecha con `sm:order-2` para conservar el layout de
  dos columnas de siempre (el formulario usa `sm:order-1`).
- **Carrito guardado por cuenta (estilo MercadoLibre)**: para clientes con sesión, el carrito se
  guarda en `perfiles_clientes.carrito` (columna jsonb nueva, `supabase/16-carrito-guardado.sql`,
  aplicada) — mismo carrito en cualquier dispositivo donde inicien sesión. Al iniciar sesión se trae
  el guardado del servidor (reemplaza el local si existe); cada cambio se guarda de vuelta con
  debounce de 800ms, mejor esfuerzo (si falla, el carrito local sigue funcionando igual). Sin sesión
  sigue siendo 100% `localStorage`, sin cambios.
- **Dirección de facturación**: al marcar "Solicitar factura" ahora también se piden Región, Comuna,
  Calle, Número y Piso/Departamento (opcional) — independiente de la dirección de envío (puede ser
  la casa matriz de la empresa). Nuevas columnas en `pedidos_web`
  (`supabase/17-facturacion-direccion.sql`, aplicada): `factura_region`, `factura_comuna`,
  `factura_calle`, `factura_numero`, `factura_piso_depto`. Todo-o-nada igual que antes: si se marca
  la casilla, todo el grupo es obligatorio salvo piso/depto.

## Cómo se probó

- `tsc --noEmit`, `npm run lint`, `npm run build` (producción) — limpios, `/carrito` y `/checkout`
  generados como rutas propias.
- `npm run dev` real + Browser pane, escritorio y mobile (375px):
  - Medido `getBoundingClientRect()` del pill de cantidad en `/carrito`: los 3 elementos dan
    exactamente 36px, sin desfase — confirmado también con captura de pantalla (el "3" queda
    centrado en el óvalo).
  - `/checkout`: en mobile, "Tu pedido" aparece antes que el formulario; en escritorio, formulario a
    la izquierda y resumen a la derecha (layout preservado).
  - Se marcó "Solicitar factura" (vía evento `click` real, no solo estado) y se confirmó que
    aparecen los 5 campos de dirección de facturación con los `name` correctos
    (`facturaRegion`/`facturaComuna`/`facturaCalle`/`facturaNumero`/`facturaPisoDepto`), y que el
    combo de comuna se habilita al elegir una región (misma lógica que la dirección de envío).

## Pendiente

1. Confirmar con el dueño que el pill de cantidad ya no se escapa en su navegador real (capturas
   anteriores mostraban el problema en producción, no en desarrollo).
2. No se probó el flujo completo de pago real (Flow sandbox) en esta sesión — el checkout llega
   hasta el submit, no se completó un pago de punta a punta.
3. El carrito guardado por cuenta no se probó con una cuenta real con sesión iniciada en esta
   sesión — la lógica se revisó por código, no se verificó en el navegador con dos "dispositivos".
