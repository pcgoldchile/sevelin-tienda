# CHANGELOG V01 — 26 de agosto de 2026

> Primer changelog de este repo. Fase 1 del e-commerce Sevelin (ver `README-ECOMMERCE-SEVELIN.md`,
> documento maestro, en el repo `sevelin-pos-oficial`).

Proyecto Next.js (storefront) + sincronización básica con el POS.

---

## 0. Antes de empezar: dos discrepancias con el prompt de Fase 1, resueltas con el usuario

El prompt de esta fase pedía "conexión directa a Supabase" para leer el catálogo y no especificaba
dónde vivir el código. Ambas cosas contradecían decisiones ya tomadas en el README maestro:

1. **Conexión directa a Supabase POS** contradice la sección 2 ("Sincronización POS → Web: Database
   Webhook, push no polling") y la regla de "sin políticas públicas" en Supabase POS. Se confirmó con
   el usuario seguir el plano original: proyecto Supabase Web **separado** (`productos_web`,
   `pedidos_web`), sincronizado por webhook.
2. **Ubicación del proyecto**: no hay forma de crear un repo GitHub ni un proyecto Vercel desde esta
   sesión. Se confirmó una carpeta hermana nueva, repo Git independiente:
   `C:\Users\Usuario\Desktop\sevelin-tienda` (fuera de `sevelin-pos-oficial`).

Next.js/TypeScript como stack no contradice nada (el README no fija el frontend de la tienda) — se
aceptó tal cual se pidió. Sí es una desviación puntual de la sección 5 del README ("mismo patrón
Express monofunción que el POS" para el backend de la tienda): acá el backend son Route Handlers de
Next.js, no Express. Se mantiene el mismo CONTRATO de endpoints (`GET /api/productos`, etc.), solo
cambia el runtime — no afecta ningún principio de seguridad o aislamiento.

## 1. Estructura del proyecto

`npx create-next-app@latest` — TypeScript, Tailwind v4, App Router, ESLint, `src/`, alias `@/*`.
Repo Git propio (se inicializó solo, con el commit inicial del scaffold). `@supabase/supabase-js`
instalado.

## 2. Conexión a Supabase Web

`src/lib/supabase-web.ts`: cliente `service_role`, solo importable desde código de servidor (Server
Components / Route Handlers). Nunca se usa en un componente `'use client'` ni en una env var
`NEXT_PUBLIC_*` — igual que el POS, la llave nunca llega al navegador.

## 3. Servicio de catálogo

`src/lib/catalogo.ts` — `listarCatalogo()` y `obtenerProductoPorSku(sku)`, ambas filtran SIEMPRE
`publicado_web=true AND stock_web>0` (contrato de la sección 5 del README maestro). Expuestas también
como Route Handlers: `GET /api/productos`, `GET /api/productos/:sku`.

## 4. Sincronización (receptor del webhook)

`POST /api/sync/producto` — recibe el envelope estándar de un Database Webhook de Supabase
(`{type, table, record, old_record}`), protegido con `SYNC_SECRET` (header `x-sync-secret`, no JWT de
staff: quien llama es el propio Supabase del POS). Reglas de mapeo:
- `precio_web` NULL en el POS → usa `precio_unitario` (`productos_web.precio_web` es `NOT NULL`).
- `stock_ilimitado` (servicios) → `stock_web = 999999` (nunca se muestra agotado).
- Sin SKU → no se sincroniza, responde `200 { motivo: 'sin_sku' }` (no es un error del webhook, es un
  producto que todavía no puede publicarse en la tienda).
- `DELETE` → borra la fila de `productos_web` por `producto_pos_id`.
- Upsert por `producto_pos_id` (no duplica si el mismo producto se sincroniza dos veces).

La configuración real del webhook en el dashboard de Supabase POS es un paso manual, documentado en
`docs/README-WEBHOOK-POS.md` — no se pudo hacer desde esta sesión (requiere que el proyecto ya esté
desplegado en una URL real).

## 5. Frontend — catálogo de solo lectura

`src/app/page.tsx`: grilla de productos (imagen, SKU, nombre, precio en CLP), `revalidate=60` (ISR).
Sin carrito, sin "agregar al carro": eso es Fase 2. Si Supabase Web no responde (todavía no existe el
proyecto real), la página muestra un estado vacío en vez de un error 500 — necesario también para que
`next build` no falle sin credenciales reales.

`next.config.ts`: `images.remotePatterns` permite cualquier `*.supabase.co/storage/v1/object/public/**`
(las fotos vienen del bucket `productos-imagenes` del POS, ver `README-BUCKET-IMAGENES.md` de ese
repo).

## 6. SQL y documentación

- `supabase/01-productos-web-pedidos-web.sql`: schema completo de Supabase Web (copia ejecutable de
  la sección 4.2 del README maestro), idempotente, validado con `pglast`.
- `docs/README-SUPABASE-WEB.md`: pasos para crear el proyecto Supabase Web y correr la migración.
- `docs/README-WEBHOOK-POS.md`: pasos para configurar el Database Webhook en el POS.
- `CLAUDE.md`: reglas propias de este repo (la regla crítica: nunca conectar directo al Supabase POS).

## 7. Pruebas

- `npm run build`: compila, tipa y prerenderiza sin errores (con manejo de la falta de credenciales
  reales — ver punto 5).
- `npm run lint`: sin advertencias.
- SQL validado con `pglast` (`encoding='utf-8'` explícito: el default de Python en este entorno es
  `cp1252`, que no puede leer los acentos del archivo).
- Doble en memoria de Supabase, adaptado a ESM (en vez del truco `require.cache` del POS, que es
  CommonJS, se monkey-parcheó el objeto ya exportado por `supabase-web.ts` — los módulos ESM son
  singletons, así que `catalogo.ts` y la ruta de sync ven el mismo objeto parchado). 17
  verificaciones en un archivo temporal (`npx tsx`, borrado después, no versionado):
  - `listarCatalogo`/`obtenerProductoPorSku` filtran correctamente por `publicado_web` y `stock_web`.
  - El secreto del webhook rechaza peticiones sin header o con el valor incorrecto (401).
  - Un producto sin SKU no se sincroniza y no rompe la petición.
  - `precio_web` NULL cae al precio normal; `stock_ilimitado` sincroniza con stock alto; un `precio_web`
    explícito no se pisa.
  - Un `UPDATE` sobre el mismo `producto_pos_id` actualiza la fila existente, no duplica.
  - `DELETE` quita la fila de `productos_web`.
  Las 17 pasaron.
- **No se probó contra un Supabase Web real** ni contra un webhook real del POS: no existen todavía
  (ver "Pendiente" en `docs/SNAPSHOT.md`). Toda la verificación fue con el doble en memoria.

## 8. Siguiente sesión

Lee `docs/SNAPSHOT.md` de este repo primero (estado y pendientes bloqueantes), y
`README-ECOMMERCE-SEVELIN.md` sección 8 fila "2" para la Fase 2 (frontend público completo).
