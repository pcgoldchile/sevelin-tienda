# SNAPSHOT — Sevelin Tienda

> Léelo al abrir un chat nuevo. Actualiza SOLO este archivo al cerrar una sesión. El plano de
> arquitectura completo (todas las fases) vive en `README-ECOMMERCE-SEVELIN.md`, en el repo del POS
> (`sevelin-pos-oficial`) — este documento es el estado de ESTE repo (`sevelin-tienda`) nada más.

**Fecha:** 26-08-2026 · **Versión activa:** v3 (Fase 3) · **Estado:** solo desarrollo local, no
desplegado todavía. No hay proyecto Supabase Web real creado, ni proyecto Vercel, ni webhook
configurado, ni credenciales de Flow/OpenFactura — ver "Pendiente" abajo (sin cambios desde la Fase
1 salvo agregar los bloqueantes propios de la Fase 3, sigue bloqueando probar cualquier flujo de
punta a punta con datos reales).

---

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind v4 · `@supabase/supabase-js`.

## Arquitectura (resumen — ver README-ECOMMERCE-SEVELIN.md para el detalle completo)
- Proyecto **separado** del POS (`sevelin-pos-oficial`), repo Git propio, deploy Vercel propio.
- Conecta a su **propio** proyecto Supabase ("Supabase Web": `productos_web`, `pedidos_web`) — NUNCA
  al Supabase del POS directo.
- Se sincroniza desde el POS vía Database Webhook → `POST /api/sync/producto` (push, no polling).

## Estado: qué está HECHO (Fase 3)
- Checkout de invitado + pago con Flow + boleta electrónica con OpenFactura (ver
  `docs/CHANGELOG-V03.md` para el detalle completo):
  - `src/lib/envio.ts`: `costoEnvioPlano()` — tarifa plana fija (`COSTO_ENVIO_PLANO`) mientras la
    cotización real (Haversine + Shipit) no exista (Fase 4). Confirmado con el usuario.
  - `src/lib/pedidos.ts`: `crearPedido()`, `obtenerPedidoPorNumero()`, `guardarPagoFlow()`,
    `marcarPedidoFallido()`, `guardarDatosBoleta()`, `marcarPedidoPagado()` (mutex
    `CREADO→PAGADO` contra reintentos del webhook de Flow).
  - `src/lib/flow.ts` / `src/lib/openfactura.ts`: clientes de Flow y OpenFactura. **Sin verificar
    contra las APIs reales** (no hay credenciales) — ver TODO marcados en ambos archivos y sección
    "Pendiente" abajo.
  - `src/lib/pos-interno.ts`: llama a `POST /api/interno/ajustar-stock`, ruta **nueva** que se
    agregó a `sevelin-pos-oficial/api/index.js` (no existía, quedó pendiente desde la Fase 0 del
    POS — ver `sevelin-pos-oficial/docs/CHANGELOG-V25.md`).
  - `supabase/02-numeracion-pedidos.sql`: numeración atómica de pedidos (`generar_numero_pedido()`).
  - `POST /api/checkout`, `POST /api/flow-webhook`, `GET /api/pedido/:numero`: Route Handlers
    nuevos, mismas convenciones que los existentes.
  - `src/app/checkout/page.tsx` + `src/components/formulario-checkout.tsx`, `src/app/pedido/[numero]/page.tsx`:
    frontend del checkout y de estado del pedido. Botón "Ir a pagar" del carrito ya no está
    deshabilitado.

## Estado: qué está HECHO (Fase 2)
- Frontend público completo (ver `docs/CHANGELOG-V02.md` para el detalle):
  - `src/context/carrito-context.tsx`: carrito en `localStorage` (sin cuentas de cliente, checkout
    como invitado), `CarritoProvider` / `useCarrito()`.
  - `src/components/`: `header.tsx` (categorías, buscador, carrito, menú móvil), `carrito-drawer.tsx`
    (drawer lateral, solo subtotal — sin envío, botón de pago deshabilitado hasta la Fase 3/4),
    `tarjeta-producto.tsx`, `galeria-producto.tsx`, `acciones-producto.tsx`, `hero-carrusel.tsx`
    (3 slides fijos, sin gestión de banners — fuera de alcance a propósito), `franja-confianza.tsx`,
    `whatsapp-flotante.tsx`, `footer.tsx`.
  - `src/app/page.tsx` (home: hero + destacados + franja), `src/app/productos/page.tsx` (listado con
    filtro de categoría y búsqueda), `src/app/productos/[sku]/page.tsx` (ficha de producto).
  - `src/lib/catalogo.ts`: `listarCategorias()`, `buscarCatalogo({ categoria, q })` (con
    sanitización del texto de búsqueda antes de armar el filtro `.or()` de PostgREST).
  - `src/lib/formato.ts`: `formatoCLP` compartido (antes duplicado en `page.tsx`).
  - `NEXT_PUBLIC_WHATSAPP_NUMBER` (`56935750828`) y `NEXT_PUBLIC_INSTAGRAM_URL`
    (`https://instagram.com/sevelin.cl`): datos reales de contacto, ya configurados en
    `.env.local.example` y `.env.local`. Si se dejan vacíos, el botón flotante de WhatsApp y el
    enlace de Instagram del footer se ocultan en vez de mostrar un dato inventado.
  - Navegación por categoría es un **filtro plano** (no mega-menú jerárquico): el schema de
    `productos_web` no tiene subcategoría — decisión confirmada con el usuario, ver changelog.

## Estado: qué está HECHO (Fase 1)
- Proyecto Next.js inicializado (`create-next-app`, TypeScript + Tailwind v4 + App Router).
- `src/lib/supabase-web.ts`: cliente Supabase Web (`service_role`, solo server-side).
- `src/lib/tipos.ts`: tipos `ProductoWeb` (espejo de `productos_web`) y `ProductoPOS` (payload que
  manda el webhook).
- `src/lib/catalogo.ts`: `listarCatalogo()` / `obtenerProductoPorSku()`, filtran siempre
  `publicado_web=true AND stock_web>0`.
- `GET /api/productos`, `GET /api/productos/:sku`: exponen el catálogo (contrato de la sección 5 del
  README maestro).
- `POST /api/sync/producto`: receptor del webhook del POS. Protegido con `SYNC_SECRET` (header
  `x-sync-secret`). Resuelve `precio_web` NULL → precio normal, `stock_ilimitado` → stock alto
  (999999), y evita romper si el producto no tiene SKU (responde 200 con `motivo: 'sin_sku'`, no
  inserta nada).
- `src/app/page.tsx`: grilla de catálogo de solo lectura (Server Component, `revalidate=60`). Sin
  carrito ni "agregar" — eso es Fase 2.
- `supabase/01-productos-web-pedidos-web.sql`: schema completo de Supabase Web, idempotente.
- `docs/README-SUPABASE-WEB.md`, `docs/README-WEBHOOK-POS.md`: pasos manuales para crear el proyecto
  Supabase Web y configurar el webhook.

## Pendiente (bloqueante para desplegar)
1. **Crear el proyecto Supabase Web real** y correr `supabase/01-productos-web-pedidos-web.sql` (ver
   `docs/README-SUPABASE-WEB.md`). Nada de esto se pudo hacer desde la sesión de desarrollo: requiere
   la cuenta de Supabase del dueño.
2. Configurar `.env.local` con `SUPABASE_WEB_URL` / `SUPABASE_WEB_SERVICE_ROLE_KEY` / `SYNC_SECRET`
   reales (ver `.env.local.example`).
3. Crear el proyecto Vercel (`sevelin-tienda`, separado del proyecto Vercel del POS) y desplegar.
4. Configurar el Database Webhook en el Supabase del **POS** apuntando a
   `https://<dominio-de-esta-tienda>/api/sync/producto` (ver `docs/README-WEBHOOK-POS.md`) — solo
   tiene sentido una vez que este proyecto ya está desplegado en una URL real.
5. Primera carga del catálogo: el webhook solo sincroniza cambios futuros. Los productos ya marcados
   `publicado_web=true` en el POS ANTES de configurar el webhook necesitan un re-guardado (o un script
   de sincronización masiva, no incluido en esta fase) para aparecer acá.
6. **Credenciales sandbox de Flow y OpenFactura** (Fase 3, nuevo). Sin ellas no se puede probar
   `POST /api/checkout` ni `POST /api/flow-webhook` contra las APIs reales — ver
   `docs/CHANGELOG-V03.md` sección 8: el algoritmo de firma de Flow (`src/lib/flow.ts`) y el
   `TipoDTE` de OpenFactura (`src/lib/openfactura.ts`) están implementados según el README maestro
   pero **sin verificar contra la documentación vigente real** — hacerlo antes del primer pago real.
7. **Proyecto Vercel real** (Fase 3, agrava el punto 3 de arriba): Flow necesita URLs públicas
   reales para `urlConfirmation`/`urlReturn` (hoy `NEXT_PUBLIC_SITE_URL` apunta a
   `http://localhost:3000`, inalcanzable para Flow) — el checkout no se puede probar de punta a
   punta hasta que la tienda esté desplegada. También hace falta plan Vercel Pro para el
   `maxDuration=60` de `POST /api/flow-webhook` (el plan Hobby limita a 10s).

## Pendiente (backlog, siguientes fases)
- **Fase 4:** cotización de envío (Haversine local + Shipit), reemplazando la tarifa plana fija
  (`COSTO_ENVIO_PLANO`) de la Fase 3.
- **Fase 5:** panel "Pedidos Web" — vive en el POS, no en este repo.
- **Fase 6:** QA end-to-end + dominio `sevelin.cl`.

## Cómo probar (mientras no haya Supabase Web real)
- `npm run build`: compila TypeScript, corre el linter implícito, prerenderiza `/` (con manejo de
  error si Supabase no está configurado — no rompe el build).
- `npm run lint`: ESLint.
- `npm run dev` + Browser pane (sí hay Chromium disponible en el entorno de la Fase 2, a diferencia
  de la Fase 0/1): sirve para ver hero/header/drawer/estados de error reales. Sin un Supabase Web
  real no se ven productos reales — para probar el carrito con contenido, sembrar un carrito de
  prueba directo en `localStorage` (clave `sevelin-carrito`, ver `docs/CHANGELOG-V02.md` sección 6
  para el formato exacto de los items). El checkout (`/checkout`) se prueba igual, sembrando el
  carrito; el submit real contra `POST /api/checkout` falla con 409 sin Supabase Web real, pero
  sirve para confirmar que el formulario, el cálculo de envío/total y el manejo de errores
  funcionan (ver `docs/CHANGELOG-V03.md` sección 7).
- No hay suite de tests versionada en el repo todavía (mismo criterio ad hoc que el POS): se verificó
  con un doble en memoria de Supabase (monkey-patch del cliente ya creado, no del import) en un
  archivo temporal, corrido con `npx tsx` y borrado después — ver `docs/CHANGELOG-V01.md` para el
  detalle de qué se probó en la Fase 1.

## Trampas ya descubiertas (no repetir)
- El `.gitignore` que genera `create-next-app` trae `.env*` (ignora TODO archivo que empiece con
  `.env`, incluido `.env.local.example`). Se cambió a listar los archivos reales uno por uno
  (`.env`, `.env.local`, etc.) para que el `.example` sí quede versionado — mismo criterio que
  `sevelin-pos-oficial/.gitignore`.
- `productos_web.precio_web` es `NOT NULL` aunque `productos.precio_web` (POS) sí permite `NULL`: la
  resolución (NULL → precio normal) tiene que pasar en `POST /api/sync/producto`, no asumir que llega
  resuelta.
- Los módulos ESM de Next.js no se pueden mockear con el truco de `require.cache` que usa el POS
  (CommonJS): en su lugar, se monkey-patchea el objeto ya exportado por `supabase-web.ts` (los
  módulos ESM son singletons, así que el resto del código ve el mismo objeto parchado).
- **Estado que viene de `localStorage` (carrito) nunca va en el inicializador `lazy` de `useState`**:
  el servidor no tiene `localStorage`, así que si el primer render del cliente ya trae el valor
  guardado, difiere del HTML que mandó el servidor (que partió vacío) y React marca un hydration
  mismatch. Va en un `useEffect` que corre después de montar — un re-render extra es aceptable, un
  mismatch no.
- El filtro `.or()` de PostgREST (usado en `buscarCatalogo` para buscar por nombre/SKU) usa
  coma/paréntesis/punto como separadores estructurales del filtro compuesto. Un texto de búsqueda de
  usuario con esos caracteres tal cual puede romper o alterar el filtro — sanitizar antes de
  interpolarlo (ver `src/lib/catalogo.ts`).
- Un error de conexión a Supabase en `/productos/[sku]` (sin `try/catch`) da un 500 crudo en vez del
  mismo fallback de "catálogo no disponible" que usan home y listado — hay que capturarlo ahí
  también, no solo en las páginas de listado.
- Un `next dev` dejado corriendo varias horas entre sesiones (puerto 3000 ocupado por un PID viejo)
  puede degradar hasta crashear con "Jest worker encountered N child process exceptions" al primer
  cambio nuevo — no es un bug del código, es el proceso de dev acumulando estado de HMR. Si
  `preview_start` reporta el puerto 3000 ocupado y no es un servidor nuestro reconocible, matar ese
  PID y levantar de nuevo resuelve el problema (mismo criterio: siempre revisar qué es el proceso
  antes de matarlo, no asumir).
- El mutex `UPDATE ... WHERE estado='CREADO'` (`marcarPedidoPagado()`) depende de que nada más
  cambie `pedidos_web.estado` entre `CREADO` y `PAGADO` por otro camino. Si en una fase futura se
  agrega alguna forma de cancelar un pedido en `CREADO` (ej. un cron de limpieza), hay que revisar
  que no compita con este mutex.
