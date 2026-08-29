@AGENTS.md

# CLAUDE.md — Sevelin Tienda

Storefront público de Sevelin (Arica, Chile), en producción. Proyecto **separado** de
`sevelin-pos-oficial` (el POS real, en otro repo/carpeta) — aísla el blast radius: un bug acá nunca
debe poder afectar la caja física. El documento maestro de arquitectura
(`README-ECOMMERCE-SEVELIN.md`) vive en el repo del POS; este `CLAUDE.md` solo tiene las reglas
específicas de este proyecto. **Lee `docs/SNAPSHOT.md` primero** — tiene el estado real y los
pendientes verdaderos, esto es solo la arquitectura fija.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind v4 · Framer Motion · `@supabase/supabase-js`.

## Regla crítica: dos Supabase distintos, nunca mezclarlos
- **Supabase Web** (este proyecto, `ekxwavsnocwxtzxqxbbi`): `src/lib/supabase-web.ts`, tablas
  `productos_web` / `pedidos_web` (ver `supabase/*.sql`, 4 migraciones aplicadas). RLS activo, sin
  políticas públicas — solo la `service_role` (usada SOLO en Server Components / Route Handlers,
  nunca en código `'use client'` ni en una env var `NEXT_PUBLIC_*`) las toca.
- **Supabase POS** (`sevelin-pos-oficial`, otro proyecto/repo): esta tienda **nunca** se conecta ahí
  directo. Se sincroniza vía un trigger Postgres del POS (`pg_net`, no un Database Webhook nativo —
  Supabase tenía un bug de aprovisionamiento) → `POST /api/sync/producto`, protegido con
  `SYNC_SECRET` (no JWT de staff).
- Si algo que vas a construir necesita leer o escribir el Supabase del POS directamente, DETENTE y
  pregunta: es casi seguro una señal de que el catálogo debería sincronizarse en vez de leerse cruzado.

## Migraciones SQL — automatizadas con Supabase CLI
La CLI (`npx supabase`) está logueada y el repo vinculado (`supabase link`). Para aplicar una
migración nueva: `npx supabase db query --file supabase/NN-nombre.sql --linked` — sin pegar nada a
mano en el SQL Editor, y sin guardar ninguna `DATABASE_URL`/contraseña en el repo (decisión
explícita del usuario). Mismo mecanismo en `sevelin-pos-oficial`.

## Variables de entorno
Ver `.env.local.example`. `SUPABASE_WEB_URL` / `SUPABASE_WEB_SERVICE_ROLE_KEY` (Supabase Web
propio), `NEXT_PUBLIC_SUPABASE_WEB_URL` / `NEXT_PUBLIC_SUPABASE_WEB_ANON_KEY` (**pendiente de
configurar** — anon key pública para Supabase Auth/cuentas de cliente; sin ella el registro/login
no funciona pero el checkout de invitado sigue igual, ver `src/lib/supabase-browser.ts`),
`SYNC_SECRET` (compartido con el POS), `FLOW_API_KEY`/`FLOW_SECRET_KEY` (sandbox
verificado, producción pendiente), `CHILEXPRESS_*` (sin configurar todavía, checkout usa
`COSTO_ENVIO_CHILEXPRESS_MOCK` mientras tanto). OpenFactura deshabilitado a propósito (costo).

## Arquitectura ya construida (todo esto YA existe, no repreguntar si falta)
- Catálogo público + carrito (`localStorage`, sigue funcionando 100% como invitado).
- **Cuentas de cliente reales** (Supabase Auth: registro/login/recuperar contraseña + "Mis
  pedidos" en `/cuenta/**`) — revierte la decisión anterior de "sin cuentas". Usa la **anon key**
  pública (`NEXT_PUBLIC_SUPABASE_WEB_URL`/`NEXT_PUBLIC_SUPABASE_WEB_ANON_KEY`, distinta de la
  `service_role`, que sigue siendo server-only sin cambios) + políticas RLS en `perfiles_clientes` y
  una política de solo-lectura en `pedidos_web` (`cliente_user_id = auth.uid()` — ver
  `supabase/06-clientes-web.sql`). El checkout invitado/logueado sigue creando pedidos SOLO vía
  `POST /api/checkout` con `service_role`; la sesión se asocia leyendo la cookie en el servidor
  (`src/lib/supabase-server.ts`), nunca desde el body.
- Carrito compartible: `src/lib/compartir-carrito.ts` codifica sku+cantidad en la URL
  (`/carrito-compartido?c=...`), sin tabla nueva — revalida cada producto contra el catálogo real al
  abrirlo.
- Checkout + pago con Flow + envío (Retiro en tienda / Despacho local en Arica / Chilexpress fuera
  de Arica, con tarifa mock mientras no haya API key real). Datos del cliente: nombre/apellido
  separados, teléfono con código de país separado del número (se concatenan antes de guardar),
  región (dentro de `direccion_envio`, no es columna aparte), nota/observación opcional, y
  "Solicitar factura" con razón social/RUT/giro (`supabase/05-checkout-datos-adicionales.sql`).
- Panel "Pedidos Web" — vive en el POS, no acá (lee este mismo Supabase Web directo).
- Categorías reales del catálogo (12, ver `src/components/header.tsx`), sincronizadas desde
  `producto_categorias` del POS vía `categoria_web`.

## Convenciones
- Todo el código, comentarios y mensajes al usuario en español (igual que el POS).
- `productos_web.precio_web` es `NOT NULL`: siempre un número concreto (el POS puede tener
  `precio_web = NULL`, que significa "usa el precio normal" — la sincronización ya resuelve eso antes
  de escribir acá; ver `src/app/api/sync/producto/route.ts`).
- Validaciones críticas (secreto del webhook, filtros de catálogo) van siempre en el servidor
  (Route Handlers / Server Components), nunca solo en el cliente.
- El SKU nunca se muestra al cliente (solo se usa como slug de URL) — el código de barras nunca
  viaja a este proyecto.
