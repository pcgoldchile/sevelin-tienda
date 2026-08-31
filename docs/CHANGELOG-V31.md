# CHANGELOG v31 — Método de envío más visible + retiro en tienda desde cualquier región (31-08-2026)

## Qué se hizo

Tres pedidos sobre el checkout ya desplegado en v30:

- **"Método de envío" ya no queda invisible**: antes, mientras la dirección no estaba completa, esa
  zona quedaba en blanco sin ninguna pista de que ahí iba a aparecer algo. Ahora hay un subtítulo fijo
  "Método de envío" debajo de "Referencia", y mientras falte completar la dirección se muestra un
  texto profesional invitando a hacerlo ("Completa tu dirección para ver los métodos de envío
  disponibles, incluido el retiro en tienda.").
- **Retiro en tienda ya no depende de la comuna de envío**: antes solo aparecía si la dirección de
  envío era comuna "Arica" — pensado originalmente para gente que vive ahí. El dueño aclaró el caso
  real: alguien que compra desde otra ciudad, pero quiere que un familiar que vive en Arica pase a
  retirar el pedido. Ahora "Retiro en tienda" aparece como opción sin importar qué región/comuna haya
  puesto el cliente (`src/lib/envio.ts::cotizarOpcionesEnvio` y `confirmarEnvio` — ambas, la vista
  previa y la autoridad real del servidor, se actualizaron igual para no dejar un hueco de validación).
- **Selección de método SIEMPRE manual**: se sacó la preselección automática que existía para el caso
  de una sola opción disponible fuera de Arica (antes, si solo había Chilexpress, se marcaba solo). El
  dueño pidió explícitamente que la elección sea siempre manual del cliente — ahora ninguna opción
  llega premarcada, sin importar cuántas haya. El botón "Pagar" ya estaba bloqueado sin un método
  elegido (v28); sigue igual, solo que ahora nunca hay un método "regalado" por defecto que lo
  desbloquee sin que el cliente haga clic.

## Cómo se probó

- `tsc --noEmit`, `npm run lint`, `npm run build` — limpios.
- `npm run dev` real + Browser pane: se completó una dirección de Providencia, Región Metropolitana
  (fuera de Arica) y se confirmó que aparecen DOS opciones — "Retiro en tienda (San Rafael 896,
  Arica)" y "Chilexpress · Básico" — ninguna marcada por defecto (`radio.checked` en ambas era
  `false`, botón "Pagar" deshabilitado). Se hizo clic manual en "Retiro en tienda" y se confirmó que
  el resumen actualiza correctamente ("Envío (Retiro en tienda...)" · Gratis · Total sin cambios).

## Pendiente

- Ninguno nuevo — sigue pendiente lo que ya estaba anotado en v30 (probar un pago real de punta a
  punta en Flow, y el carrito guardado por cuenta con una sesión real de dos dispositivos).
