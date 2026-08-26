@AGENTS.md

# CLAUDE.md — Sevelin Tienda

Storefront público de Sevelin (Arica, Chile). Proyecto **separado** de `sevelin-pos-oficial` (el POS
real, en otro repo/carpeta) — aísla el blast radius: un bug acá nunca debe poder afectar la caja
física. El documento maestro de arquitectura (`README-ECOMMERCE-SEVELIN.md`) vive en el repo del POS;
este `CLAUDE.md` solo tiene las reglas específicas de este proyecto.

## Stack
Next.js (App Router) · TypeScript · Tailwind v4 · `@supabase/supabase-js`.

## Regla crítica: dos Supabase distintos, nunca mezclarlos
- **Supabase Web** (este proyecto): `src/lib/supabase-web.ts`, tablas `productos_web` / `pedidos_web`
  (ver `supabase/01-productos-web-pedidos-web.sql`). RLS activo, sin políticas públicas — solo la
  `service_role` (usada SOLO en Server Components / Route Handlers, nunca en código `'use client'` ni
  en una env var `NEXT_PUBLIC_*`) las toca.
- **Supabase POS** (`sevelin-pos-oficial`, otro proyecto/repo): esta tienda **nunca** se conecta ahí
  directo. Se sincroniza vía Database Webhook → `POST /api/sync/producto` (ver
  `docs/README-WEBHOOK-POS.md`), protegido con `SYNC_SECRET` (no JWT de staff).
- Si algo que vas a construir necesita leer o escribir el Supabase del POS directamente, DETENTE y
  pregunta: es casi seguro una señal de que el catálogo debería sincronizarse en vez de leerse cruzado.

## Variables de entorno
Ver `.env.local.example`. `SUPABASE_WEB_URL` / `SUPABASE_WEB_SERVICE_ROLE_KEY` (Supabase Web propio),
`SYNC_SECRET` (compartido con el POS, protege el webhook). Las de Flow/OpenFactura/Shipit son de
fases futuras (3 y 4) — no configurarlas todavía.

## Alcance por fase (ver README-ECOMMERCE-SEVELIN.md sección 8)
- **Fase 1 (esta):** estructura del proyecto, cliente Supabase Web, servicio de catálogo
  (`publicado_web=true AND stock_web>0`), receptor de sincronización (`/api/sync/producto`).
- **Fase 2:** frontend público completo (home, listado, ficha, carrito). Hoy solo hay una grilla de
  catálogo de solo lectura en `src/app/page.tsx` — no hay carrito ni "agregar al carro" todavía.
- **Fase 3:** checkout + Flow (pago) + OpenFactura (boleta). **No implementar antes de esa fase.**
- **Fase 4:** cotización de envío (Haversine + Shipit).
- **Fase 5/6:** panel "Pedidos Web" (vive en el POS, no acá) y QA final.

## Convenciones
- Todo el código, comentarios y mensajes al usuario en español (igual que el POS).
- `productos_web.precio_web` es `NOT NULL`: siempre un número concreto (el POS puede tener
  `precio_web = NULL`, que significa "usa el precio normal" — la sincronización ya resuelve eso antes
  de escribir acá; ver `src/app/api/sync/producto/route.ts`).
- Validaciones críticas (secreto del webhook, filtros de catálogo) van siempre en el servidor
  (Route Handlers / Server Components), nunca solo en el cliente.
