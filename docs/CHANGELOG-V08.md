# v08 — orden de catálogo, toast del carrito, paleta de marca, umbral de stock

## 1. Selector de orden en `/productos`
`src/lib/catalogo.ts` agrega una whitelist de orden (`ORDEN_CATALOGO`) — nunca se interpola el
query param crudo en `.order()`. Opciones: relevancia (default), nombre A-Z/Z-A, precio menor/mayor
a mayor/menor. "Más recientes" quedó fuera de alcance a propósito: `sincronizado_en` se actualiza en
cada sync (incluso por solo cambio de stock), no refleja antigüedad real. Nuevo componente
`src/components/selector-orden.tsx`.

## 2. Toast de confirmación al agregar al carrito, sin abrir el drawer
Se quitó el único `setAbierto(true)` dentro de `agregarItem` (`src/context/carrito-context.tsx`) —
antes abría el drawer automáticamente y el usuario tenía que cerrarlo a mano para seguir comprando.
Nuevo `src/context/toast-context.tsx` (Context + Framer Motion, sin dependencia externa) muestra un
toast breve (~2.2s) en `tarjeta-producto.tsx` y `acciones-producto.tsx`.

## 3. Nueva paleta de marca
`src/app/globals.css` reemplaza navy/coral/teal por azul eléctrico (`--color-primary`, tomado del
logo de la marca) sobre fondo azul marino casi negro (`--color-paper`). `--color-coral` pasa a
`--color-accent` (se conserva como contraste cálido). `--color-teal` se retira: sus usos decorativos
migraron a `primary`, y los usos semánticos de "éxito" (confirmación de agregado, botón de
WhatsApp, estados de pedido pagado/enviado/entregado) migraron a un token nuevo `--color-success`
en vez de forzarlos al azul de marca, que hubiera sido confuso como color de acción/estado.
Renombrar los tokens (no solo cambiar valores) evita que `navy`/`coral` sigan nombrados así cuando
ya no describen el color real.

## 4. Umbral de stock configurable por producto
Recibe `stock_umbral_web` (nuevo, sincronizado desde el POS — ver `sevelin-pos-oficial` v28: módulo
"Página Web → Categorías"). Migración `supabase/04-stock-umbral-web.sql`. Nueva función
`formatoStock()` en `src/lib/formato.ts`: si `stock_web >= umbral` (`umbral ?? 5` por defecto)
muestra "Más de N disponibles"; si no, el stock exacto. El tope real del selector de cantidad y la
validación de stock en el carrito siguen usando `stock_web` real sin cambios — el umbral es solo de
presentación.

## Pendiente
- Correr `supabase/04-stock-umbral-web.sql` en el Supabase Web real ANTES de que el POS empiece a
  mandar `stock_umbral_web` (si no, el trigger de sync fallaría contra una columna inexistente).
