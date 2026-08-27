# SNAPSHOT — Sevelin Tienda

> Léelo al abrir un chat nuevo. Actualiza SOLO este archivo al cerrar una sesión. El plano de
> arquitectura completo (todas las fases) vive en `README-ECOMMERCE-SEVELIN.md`, en el repo del POS
> (`sevelin-pos-oficial`) — este documento es el estado de ESTE repo (`sevelin-tienda`) nada más.

**Fecha:** 27-08-2026 · **Versión activa:** v8 (orden de catálogo, toast del carrito, paleta de
marca azul eléctrico, umbral de stock — ver `docs/CHANGELOG-V08.md`). **Pendiente antes de que el
umbral de stock funcione en producción:** correr `supabase/04-stock-umbral-web.sql` en el Supabase
Web real (agrega `productos_web.stock_umbral_web`) — debe correr ANTES de que el POS (v27,
módulo "Página Web → Categorías") empiece a mandar ese campo, o el trigger de sync fallaría. ·
**Estado (a la fecha de v7):** solo desarrollo local, no desplegado
todavía. El usuario ya creó el proyecto Supabase Web real y consiguió credenciales sandbox de
Flow — la conexión a Supabase Web **funciona** (solo faltan correr las migraciones SQL, ahora 3) y
`POST /payment/create` de Flow está **verificado** contra la API real (se encontró y corrigió un
bug real en la firma). OpenFactura se **deshabilitó a propósito** (decisión de costo). **Shipit se
descartó por completo** (decisión de negocio: no operan retiros desde Arica) y se reemplazó por
Chilexpress (convenio corporativo) — con una tarifa mock mientras se consiguen las API keys. El
modelo de envío cambió: dentro de la comuna de Arica el cliente ahora **elige** entre Retiro en
tienda (gratis) o Despacho local (tarifa plana); ya no se usa Haversine/geocodificación. Sigue
faltando: proyecto Vercel real y correr las migraciones SQL — ver "Pendiente" abajo.

---

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind v4 · `@supabase/supabase-js`.

## Arquitectura (resumen — ver README-ECOMMERCE-SEVELIN.md para el detalle completo)
- Proyecto **separado** del POS (`sevelin-pos-oficial`), repo Git propio, deploy Vercel propio.
- Conecta a su **propio** proyecto Supabase ("Supabase Web": `productos_web`, `pedidos_web`) — NUNCA
  al Supabase del POS directo.
- Se sincroniza desde el POS vía Database Webhook → `POST /api/sync/producto` (push, no polling).

## Estado: qué está HECHO (v7 — rediseño visual, ver `docs/CHANGELOG-V07.md`)
- Sistema de diseño propio (paleta navy/coral/teal, tipografía Bricolage Grotesque + IBM Plex Sans,
  sombras multicapa, glow) reemplaza el Tailwind por defecto (`zinc`, Geist) en toda la tienda.
- `framer-motion` (nueva dependencia): microinteracciones en header, hero, tarjetas de producto,
  carrito, checkout. `MotionConfig reducedMotion="user"` en `layout.tsx` respeta
  `prefers-reduced-motion` para toda la app de una vez.
- El usuario instaló por su cuenta (yo me negué a correr `npx skills@latest add ...`, es ejecutar
  código de terceros sin poder revisarlo antes) 2 skills de diseño/animación en `.agents/skills/` —
  se leyeron y se aplicó su guía de curvas de easing y accesibilidad de movimiento. `.agents/**` está
  en los ignores de ESLint.
- No cambia nada del backend, checkout, ni modelo de datos — es una capa visual sobre lo ya
  construido. No bloquea el despliegue.

## Estado: qué está HECHO (v6 — no es una fase nueva, ver `docs/CHANGELOG-V06.md`)
- **Shipit descartado, reemplazado por Chilexpress** (decisión del usuario: no operan retiros desde
  Arica; tiene convenio corporativo con Chilexpress). `src/lib/shipit.ts` borrado.
  `src/lib/chilexpress.ts` (nuevo): endpoints y campos sacados del código fuente real del plugin
  oficial de WooCommerce de Chilexpress (no hay portal de docs público legible como el de Shipit) —
  TODO crítico: validar contra `developers.wschilexpress.com` en cuanto haya API key real.
- **Modelo de envío rediseñado, sin Haversine**: dentro de la comuna de Arica, el cliente ahora
  **elige** entre "Retiro en tienda" ($0) o "Despacho a domicilio en Arica" (`COSTO_ENVIO_PLANO`) —
  ya no se geocodifica ni se calcula distancia, la decisión pasó de "¿está a ≤10 km?" a una
  elección directa del cliente. Fuera de Arica, cotización automática vía Chilexpress (o
  `COSTO_ENVIO_CHILEXPRESS_MOCK` mientras no haya API key — pedido explícito del usuario para
  poder probar el checkout ya). `src/lib/envio.ts` reescrito: `cotizarOpcionesEnvio()` (vista
  previa, puede devolver 2 opciones) / `confirmarEnvio()` (autoridad real, recibe cuál eligió el
  cliente y recalcula el costo desde cero — nunca confía en un monto que mande el cliente).
- **`pedidos_web.costo_envio` ahora permite $0** (`supabase/03-permitir-envio-gratis.sql`, todavía
  sin correr en Supabase Web real) — el retiro en tienda rompe a propósito la regla "nunca gratis"
  de la Fase 1, es una decisión de negocio nueva.
- `src/components/formulario-checkout.tsx`: si `POST /api/cotizar-envio` devuelve 2 opciones,
  aparecen como radio buttons y el cliente tiene que elegir una antes de habilitar "Pagar"; si
  devuelve 1 (Chilexpress), se preselecciona sola como antes.
- **Probado real de punta a punta en el navegador**: comuna "Arica" → las 2 opciones con los
  montos reales configurados por el usuario ($0 / $2.000); comuna "Santiago" → Chilexpress mock
  ($6.000); submit real falla con el error genuino de Supabase (faltan las migraciones), no un
  500 crudo.

## Estado: qué está HECHO (v5 — ver `docs/CHANGELOG-V05.md`)
- **OpenFactura deshabilitado a propósito** (costo ~$30.000/mes, decisión del usuario): el
  respaldo de una venta web es el comprobante de pago de Flow; boleta/factura se emite manual si
  el cliente la pide. `src/lib/openfactura.ts::openFacturaHabilitada()` controla esto —
  `POST /api/flow-webhook` ya ni intenta emitir boleta si es `false` (antes lo intentaba y fallaba
  silenciosamente en cada pago). `/pedido/[numero]` muestra un aviso + link de WhatsApp en vez de
  un link de boleta que no existe. Reactivarlo en el futuro es solo volver a poner
  `OPENFACTURA_API_KEY`.
- **Bug real encontrado y corregido en la firma de Flow**: con credenciales sandbox reales, el
  primer intento de `crearPagoFlow()` contra la API real dio "Invalid Signature" — el README
  maestro describía mal el algoritmo ("clave=valor" en vez de "claveValor", sin el `=`). Corregido
  en `src/lib/flow.ts::firmarParametrosFlow()` y verificado contra
  developers.flow.cl/en/docs/tutorial-basics/create-order. `POST /payment/create` respondió 200
  real con `url`/`token`/`flowOrder`. `getStatus`/`FLOW_ESTADO_PAGADO` siguen sin probar (hace
  falta completar un pago real, no solo crear la orden).
- **`SUPABASE_WEB_URL` en `.env.local` estaba mal formado** (solo el project ref, sin
  `https://...supabase.co`) — corregido. Con eso, la conexión a Supabase Web real **funciona**:
  el único bloqueante que queda para ver el catálogo es correr las migraciones SQL (ver
  "Pendiente" #1 abajo).

## Estado: qué está HECHO (Fase 4 — histórico, ver nota)
> **Nota (v6):** el diseño Haversine + Shipit descrito abajo fue **reemplazado** por el modelo de
> retiro/local/Chilexpress — ver "v6" arriba y `docs/CHANGELOG-V06.md`. Se deja el texto original
> como registro histórico de lo que se construyó en la Fase 4 y por qué cambió.
- Cotización real de envío, reemplaza la tarifa plana fija de la Fase 3 (ver
  `docs/CHANGELOG-V04.md` para el detalle completo):
  - `src/lib/envio.ts` (reescrito en la Fase 4, y de nuevo en v6): `cotizarEnvio(direccion, items)`
    — si la comuna es "Arica", geocodifica con OpenStreetMap/Nominatim (gratis, sin cuenta) y
    calcula Haversine contra la tienda (San Rafael 896, Arica); si da ≤10 km, tarifa LOCAL plana
    (`COSTO_ENVIO_PLANO`). Si no (otra comuna, o geocodificación falló/fuera de rango), cotiza con
    Shipit. Es la única fuente de verdad: la usan tanto `POST /api/cotizar-envio` (vista previa)
    como `POST /api/checkout` (autoridad real — nunca confía en la cotización que vio el cliente).
  - `src/lib/shipit.ts` (nuevo en la Fase 4, **borrado en v6**): cliente de Shipit (`buscarComunaId()`,
    `cotizarTarifasShipit()`). La API real sí se pudo verificar contra documentación pública
    (developers.shipit.cl) — a diferencia de Flow/OpenFactura en la Fase 3 — pero sin token real
    nunca se llegó a probar de punta a punta antes de descartarlo.
  - `POST /api/cotizar-envio` (nuevo), `crearPedido()` ya no calcula envío internamente (lo recibe
    resuelto del llamador).
  - `src/components/formulario-checkout.tsx`: paso nuevo "Calcular envío" antes de habilitar
    "Pagar"; se invalida si el cliente edita la dirección después de cotizar.
  - **Probado real de punta a punta en el navegador** (única parte de las Fases 3-4 que no depende
    de credenciales): dirección cerca de la tienda → LOCAL con el valor de `COSTO_ENVIO_PLANO`.

## Estado: qué está HECHO (Fase 3)
- Checkout de invitado + pago con Flow + boleta electrónica con OpenFactura (ver
  `docs/CHANGELOG-V03.md` para el detalle completo):
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
1. **Correr las migraciones SQL en el proyecto Supabase Web real** (ya existe — `ekxwavsnocwxtzxqxbbi`,
   la conexión ya funciona): `supabase/01-productos-web-pedidos-web.sql`,
   `supabase/02-numeracion-pedidos.sql` y **`supabase/03-permitir-envio-gratis.sql` (nueva, v6 —
   permite `costo_envio = 0` para "Retiro en tienda")**, en ese orden, en el SQL Editor. Ahora mismo
   `productos_web`/`pedidos_web` no existen todavía en ese proyecto (`npm run build` lo confirma:
   `Could not find the table 'public.productos_web' in the schema cache`) — es el único paso que
   falta para ver el catálogo funcionando en local.
2. Crear el proyecto Vercel (`sevelin-tienda`, separado del proyecto Vercel del POS) y desplegar —
   quedó a medio hacer en una sesión anterior (se vio la pantalla de creación, sin confirmar si se
   completó). Bloquea: Flow necesita URLs públicas reales para `urlConfirmation`/`urlReturn` (hoy
   `NEXT_PUBLIC_SITE_URL` apunta a `http://localhost:3000`, inalcanzable para Flow) — el pago no se
   puede probar de punta a punta hasta que la tienda esté desplegada. También hace falta plan
   Vercel Pro para el `maxDuration=60` de `POST /api/flow-webhook` (el plan Hobby limita a 10s).
3. Configurar el Database Webhook en el Supabase del **POS** apuntando a
   `https://<dominio-de-esta-tienda>/api/sync/producto` (ver `docs/README-WEBHOOK-POS.md`) — solo
   tiene sentido una vez que este proyecto ya está desplegado en una URL real.
4. Primera carga del catálogo: el webhook solo sincroniza cambios futuros. Los productos ya marcados
   `publicado_web=true` en el POS ANTES de configurar el webhook necesitan un re-guardado (o un script
   de sincronización masiva, no incluido en esta fase) para aparecer acá.
5. Confirmar que `SYNC_SECRET` esté configurado con el mismo valor en las variables de entorno de
   Vercel del **POS** (no se verificó desde esta sesión) — sin eso, `POST /api/interno/ajustar-stock`
   y `POST /api/sync/producto` rechazan todo.
6. **Flow: falta probar el flujo completo de pago**, no solo crear la orden — `POST /payment/create`
   ya está verificado (v5, ver arriba), pero `obtenerEstadoPagoFlow()` (`getStatus`) y
   `FLOW_ESTADO_PAGADO` siguen sin confirmarse contra un pago real completado. Requiere el punto 2
   (URL pública) para que Flow pueda llamar de vuelta al webhook.
7. **Credenciales de Chilexpress** (v6, reemplaza a Shipit — ver `docs/CHANGELOG-V06.md`). Mientras
   no exista `CHILEXPRESS_API_KEY`, el checkout usa `COSTO_ENVIO_CHILEXPRESS_MOCK` (tarifa
   referencial, pedido explícito del usuario). Cuando el usuario consiga las credenciales del
   convenio corporativo: (a) configurar `CHILEXPRESS_ORIGIN_COUNTY_CODE`, (b) resolver el TODO de
   `src/lib/chilexpress.ts` — mapear comuna → `countyCode` de destino necesita saber primero el
   código de región de Chilexpress de esa comuna, sin acceso real a la API no se pudo verificar,
   (c) validar el contrato completo contra `developers.wschilexpress.com` o soporte de Chilexpress
   (se implementó a partir del código fuente de su plugin de WooCommerce, no de documentación
   oficial). También falta confirmar que los datos de `peso_kg`/`alto_cm`/`ancho_cm`/
   `profundidad_cm` de `productos_web` estén completos (la auditoría de la Fase 0 del POS,
   `GET /api/productos/auditoria-envio`, diagnostica pero no corrige) — solo hace falta para
   Chilexpress real, el mock no los usa.
8. ~~OpenFactura~~ — ya no es un pendiente: deshabilitado a propósito por costo (ver v5 arriba).
   ~~Shipit~~ — ya no es un pendiente: descartado por completo, reemplazado por Chilexpress (v6).

## Pendiente (backlog, siguientes fases)
- **Fase 5 — ✅ hecha, pero en el otro repo:** panel "Pedidos Web" (`sevelin-pos-oficial`
  `docs/CHANGELOG-V26.md`). Sin cambios de código en este repo. El POS ahora tiene sus propias
  credenciales `service_role` de este proyecto Supabase Web (mismas que usa `sevelin-tienda`) para
  leer/actualizar `pedidos_web` directo — decisión confirmada con el usuario.
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
  carrito; el submit real contra `POST /api/checkout` falla con el error real de Supabase (faltan
  las migraciones) sin Supabase Web con las tablas creadas, pero sirve para confirmar que el
  formulario, el manejo de errores y el botón "Calcular envío" funcionan de punta a punta: comuna
  "Arica" → aparecen las 2 opciones (retiro/local) para elegir; cualquier otra comuna → una tarifa
  Chilexpress (mock mientras no haya API key) — ver `docs/CHANGELOG-V06.md` sección 7.
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
- **(Histórico, ya no aplica desde v6 — Shipit se descartó)** Shipit cotizaba por comuna
  (`GET /v/communes`), no por dirección exacta ni coordenadas, lo que en su momento obligó a
  geocodificar con Nominatim para el radio de 10 km. Chilexpress (su reemplazo) también cotiza por
  comuna, pero el modelo de envío ya no depende de distancia — ver "v6" arriba.
- Chilexpress cotiza por región + comuna (`countyCode`), no hay un listado plano de toda su
  cobertura como el `GET /v/communes` de Shipit — resolver el `countyCode` de una comuna cualquiera
  necesita saber primero su código de región en el sistema de Chilexpress, que no se pudo mapear
  sin acceso real a la API (ver `docs/CHANGELOG-V06.md` punto 2, TODO en `src/lib/chilexpress.ts`).
- `developers.wschilexpress.com` es una SPA sin contenido estático accesible por herramientas de
  lectura automática (a diferencia de developers.shipit.cl) — para Chilexpress hubo que sacar los
  endpoints reales del código fuente de su plugin oficial de WooCommerce en GitHub en vez de su
  portal de documentación.
- La firma de Flow descrita en el README maestro ("ordenar alfabéticamente, concatenar
  `clave=valor`, HMAC-SHA256") es **incorrecta** — el `=` no va. La forma real, verificada contra
  developers.flow.cl, es concatenar `claveValor` sin separador (ej. `amount5000apiKeyXXXX`). Ver
  `docs/CHANGELOG-V05.md`. Cualquier otro campo de Flow que se agregue en el futuro, verificar
  contra la documentación real antes de asumir lo que dice el README maestro.
- `SUPABASE_WEB_URL` necesita la URL completa (`https://<ref>.supabase.co`), no solo el project
  ref — con solo el ref, `createClient()` no puede conectarse y falla con `TypeError: fetch failed`,
  un error genérico que no deja claro cuál es el problema real.
