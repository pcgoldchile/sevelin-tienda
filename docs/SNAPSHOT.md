# SNAPSHOT — Sevelin Tienda

> Léelo al abrir un chat nuevo. Actualiza SOLO este archivo al cerrar una sesión. El plano de
> arquitectura completo (todas las fases) vive en `README-ECOMMERCE-SEVELIN.md`, en el repo del POS
> (`sevelin-pos-oficial`) — este documento es el estado de ESTE repo (`sevelin-tienda`) nada más.

**Fecha:** 26-08-2026 · **Versión activa:** v1 (Fase 1) · **Estado:** solo desarrollo local, no
desplegado todavía. No hay proyecto Supabase Web real creado, ni proyecto Vercel, ni webhook
configurado — ver "Pendiente" abajo.

---

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind v4 · `@supabase/supabase-js`.

## Arquitectura (resumen — ver README-ECOMMERCE-SEVELIN.md para el detalle completo)
- Proyecto **separado** del POS (`sevelin-pos-oficial`), repo Git propio, deploy Vercel propio.
- Conecta a su **propio** proyecto Supabase ("Supabase Web": `productos_web`, `pedidos_web`) — NUNCA
  al Supabase del POS directo.
- Se sincroniza desde el POS vía Database Webhook → `POST /api/sync/producto` (push, no polling).

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

## Pendiente (backlog, siguientes fases)
- **Fase 2:** frontend público completo — home real, ficha de producto, carrito (drawer lateral),
  diseño inspirado en sipoonline.cl (ver README maestro sección 7).
- **Fase 3:** checkout + Flow (pago) + OpenFactura (boletas).
- **Fase 4:** cotización de envío (Haversine local + Shipit).
- **Fase 5:** panel "Pedidos Web" — vive en el POS, no en este repo.
- **Fase 6:** QA end-to-end + dominio `sevelin.cl`.

## Cómo probar (mientras no haya Supabase Web real)
- `npm run build`: compila TypeScript, corre el linter implícito, prerenderiza `/` (con manejo de
  error si Supabase no está configurado — no rompe el build).
- `npm run lint`: ESLint.
- No hay suite de tests versionada en el repo todavía (mismo criterio ad hoc que el POS): se verificó
  con un doble en memoria de Supabase (monkey-patch del cliente ya creado, no del import) en un
  archivo temporal, corrido con `npx tsx` y borrado después — ver `docs/CHANGELOG-V01.md` para el
  detalle de qué se probó.

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
