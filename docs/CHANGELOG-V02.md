# CHANGELOG V02 — 26 de agosto de 2026

> Segundo changelog de este repo. Fase 2 del e-commerce Sevelin (ver `README-ECOMMERCE-SEVELIN.md`,
> documento maestro, en el repo `sevelin-pos-oficial`, sección 8 fila "2" y sección 7).

Frontend público completo: home, listado con filtro, ficha de producto y carrito (drawer lateral),
con el patrón de UX de la sección 7 (inspirado en sipoonline.cl, identidad propia de Sevelin).

---

## 0. Antes de empezar: dos discrepancias con el README maestro, resueltas con el usuario

1. **Carrito con "subtotal, envío y total" (sección 7):** cotizar envío es Fase 4 y el checkout/pago
   es Fase 3, ninguno existe todavía en este repo. Se confirmó con el usuario que el drawer de esta
   fase muestra **solo subtotal** (sin línea de envío) y un botón "Ir a pagar" **deshabilitado** con
   texto "Próximamente" — el layout queda listo para conectar envío y pago reales en las próximas
   fases, sin prometer algo que no funciona todavía.
2. **Mega-menú "categoría → subcategoría" (sección 7):** el schema real de `productos_web` (Fase 1)
   solo tiene una columna plana `categoria`, sin subcategoría. Se confirmó mantener el schema como
   está (no se amplía el alcance de esta fase al repo del POS) y navegar por categoría con un
   **filtro plano** (dropdown en el header + chips en `/productos`), no un mega-menú jerárquico.

## 1. Carrito (Context + localStorage)

`src/context/carrito-context.tsx` — `CarritoProvider` / `useCarrito()`. Sin cuentas de cliente
(checkout como invitado, README sección 2), así que el carrito vive **solo en el navegador**
(`localStorage`, clave `sevelin-carrito`). Expone items, cantidad total, subtotal, abrir/cerrar
drawer, agregar/quitar/cambiar cantidad — todas las cantidades quedan topadas a `stock_web` del
producto.

La carga inicial desde `localStorage` pasa por un `useEffect` (no por el inicializador `lazy` de
`useState`): el servidor no tiene `localStorage`, así que el primer render del cliente debe partir
igual de vacío que el HTML del servidor o React marca un hydration mismatch. El efecto sincroniza el
valor real justo después de montar.

## 2. Componentes nuevos (`src/components/`)

- `header.tsx` — logo, dropdown de categorías, buscador, ícono de carrito con badge, menú móvil
  (hamburguesa) con las mismas categorías y buscador.
- `carrito-drawer.tsx` — drawer lateral: lista de items con stepper de cantidad y quitar, subtotal,
  botón de pago deshabilitado (ver punto 0.1).
- `tarjeta-producto.tsx` — tarjeta de producto reutilizada en Destacados (home) y en `/productos`:
  imagen, SKU, nombre, precio, selector de cantidad + "Agregar".
- `galeria-producto.tsx` — imagen principal + miniaturas clicleables, para la ficha de producto.
- `acciones-producto.tsx` — selector de cantidad + "Agregar al carrito" de la ficha de producto
  (separado de la galería porque solo esta parte necesita el carrito).
- `hero-carrusel.tsx` — 3 slides fijos con autoplay (5s) y controles manuales. Sin gestión de
  banners desde un panel (fuera de alcance a propósito, README sección 2.1): el copy vive
  hardcodeado acá, se edita directo en el archivo cuando cambie la promo.
- `franja-confianza.tsx` — 4 íconos con texto (Pago seguro / Atención por WhatsApp / Garantía /
  Despacho a todo Arica y Chile), adaptado del patrón de Sipo a lo que Sevelin realmente ofrece.
- `whatsapp-flotante.tsx` — botón flotante persistente. Usa `NEXT_PUBLIC_WHATSAPP_NUMBER`; si no
  está configurada, **no se muestra** (no se inventó un número real en ningún archivo del repo).
- `footer.tsx` — navegación, contacto (mismo criterio de `NEXT_PUBLIC_WHATSAPP_NUMBER`).

## 3. Páginas

- `src/app/page.tsx` (home): hero + sección "Destacados" (primeros 8 productos publicados) + franja
  de confianza. Reemplaza la grilla de solo lectura de la Fase 1.
- `src/app/productos/page.tsx` (listado): grilla completa, filtro por categoría (`?categoria=`,
  chips) y búsqueda de texto (`?q=`, desde el buscador del header).
- `src/app/productos/[sku]/page.tsx` (ficha): breadcrumb, galería, nombre, precio, descripción,
  selector de cantidad + agregar. `notFound()` si el SKU no existe o no está publicado; estado de
  error (no 500) si Supabase Web no responde — mismo criterio que home/listado.
- `src/app/layout.tsx`: ahora async, carga las categorías (`listarCategorias()`) y envuelve todo en
  `CarritoProvider` + `Header` + `Footer` + `CarritoDrawer` + `WhatsappFlotante`.

## 4. Backend/lib — funciones nuevas en `src/lib/catalogo.ts`

- `listarCategorias()`: categorías distintas del catálogo publicado, para el dropdown del header.
- `buscarCatalogo({ categoria, q })`: reemplaza el uso directo de `listarCatalogo()` en `/productos`.
  El texto de búsqueda (`q`) se sanitiza (solo letras/números/espacios) antes de armar el filtro
  `.or()` de PostgREST: esa sintaxis usa coma/paréntesis/punto como separadores estructurales, así
  que un texto de búsqueda con esos caracteres tal cual podía romper o alterar el filtro compuesto.
- `src/lib/formato.ts`: `formatoCLP` (antes vivía duplicado dentro de `page.tsx`), ahora compartido
  entre home, listado y ficha.

## 5. Variables de entorno nuevas

- `NEXT_PUBLIC_WHATSAPP_NUMBER` — número de WhatsApp de contacto, formato internacional sin "+".
  `NEXT_PUBLIC_INSTAGRAM_URL` — URL del perfil de Instagram (enlace nuevo en el footer). Ambas son
  datos públicos del negocio, no secretos: van con el **valor real** por defecto en
  `.env.local.example` (`56935750828` / `https://instagram.com/sevelin.cl`, confirmados por el
  usuario) en vez de quedar vacías, y ya están en `.env.local` (no versionado) para que funcionen en
  desarrollo. Si se dejan vacías, el botón flotante de WhatsApp y el enlace de Instagram del footer
  se ocultan en vez de mostrar un dato inventado.

## 6. Pruebas

- `npm run lint`: sin advertencias.
- `npm run build`: compila, tipa y prerenderiza sin errores (con el mismo manejo de falta de
  credenciales reales que la Fase 1 — ver `docs/SNAPSHOT.md`).
- **Verificación visual en navegador** (`next dev` + Browser pane, algo que no fue posible en la
  Fase 0/1 por falta de Chromium en ese entorno):
  - Home: hero con autoplay y controles manuales, sección Destacados con el fallback de "catálogo no
    disponible" (sin Supabase Web real todavía), franja de confianza, footer.
  - Header: dropdown de categorías, buscador, ícono de carrito con badge de cantidad, menú móvil
    (viewport 375×812) — confirmado que abre y muestra buscador + navegación.
  - Carrito: se sembró un carrito de prueba directo en `localStorage` (2 SKUs falsos) para probar el
    drawer con contenido real sin depender de Supabase — stepper de cantidad, quitar, subtotal
    calculado bien ($47.970 = 2×$19.990 + 1×$7.990), botón de pago deshabilitado.
  - `/productos`: filtro "Todas" + chips de categoría, fallback sin catálogo.
  - `/productos/[sku]` con un SKU inexistente: **se encontró y corrigió un bug real** — la página no
    capturaba el error de conexión a Supabase, así que un Supabase Web caído daba un 500 crudo en vez
    del mismo mensaje de "catálogo no disponible" que usan home y listado. Ya corregido y verificado.
  - Sin errores de hidratación ni errores de consola nuevos (los únicos `console.error` son los
    esperados por falta de credenciales reales, iguales a los de la Fase 1).
- **No se probó con productos reales** (imágenes, precios, categorías reales): no existe todavía el
  proyecto Supabase Web real (ver "Pendiente" en `docs/SNAPSHOT.md`, sin cambios desde la Fase 1).

## 7. Siguiente sesión

Lee `docs/SNAPSHOT.md` de este repo primero. Sigue bloqueado, fuera de cualquier sesión de Claude,
lo mismo que al cerrar la Fase 1: crear el proyecto Supabase Web real, el proyecto Vercel, y
configurar el Database Webhook — recién con eso se puede ver el catálogo real funcionando.
`README-ECOMMERCE-SEVELIN.md` sección 8 fila "3" (checkout + Flow + OpenFactura) es la siguiente
fase de código.
