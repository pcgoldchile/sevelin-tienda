# Proyecto Supabase Web

> Este es un proyecto Supabase **NUEVO y separado** del Supabase de `sevelin-pos-oficial` (el POS
> real). Nunca deben mezclarse ni compartir credenciales — ver README-ECOMMERCE-SEVELIN.md secciones
> 1, 2 y 4.2 (documento maestro, vive en el repo del POS).

No pude crear el proyecto ni correr la migración desde esta sesión: crear un proyecto Supabase
requiere tu cuenta, y este entorno de desarrollo no tiene credenciales ni acceso de red a un proyecto
real todavía.

## Pasos

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Nombre
   sugerido: `sevelin-web` (para distinguirlo claramente de `sevelin-pos` en el listado).
2. Una vez creado, ve a **SQL Editor** y pega el contenido completo de
   [`supabase/01-productos-web-pedidos-web.sql`](../supabase/01-productos-web-pedidos-web.sql) de
   este repo. Ejecútalo — es idempotente, puede correrse más de una vez sin romper nada.
3. Verifica: la consulta al final del script debe devolver 2 filas (`pedidos_web`, `productos_web`).
4. Ve a **Settings → API** y copia:
   - **Project URL** → `SUPABASE_WEB_URL`
   - **service_role key** (la secreta, NO la `anon`) → `SUPABASE_WEB_SERVICE_ROLE_KEY`
5. Pégalas en tu `.env.local` (copia `.env.local.example` si no lo has hecho) y, cuando despliegues,
   en las variables de entorno del proyecto Vercel de `sevelin-tienda`.

## Qué NO hacer

- No crear políticas RLS públicas en `productos_web` ni `pedidos_web`: el catálogo público pasa
  siempre por los Route Handlers de Next.js (`GET /api/productos`), que usan la `service_role` en el
  servidor — igual que el POS nunca deja que el navegador hable con Supabase directo.
- No reusar las credenciales del Supabase POS acá, ni al revés. Son dos proyectos por diseño (aísla
  el blast radius: un bug en la tienda pública no debe poder tocar la base del POS real).

## Siguiente paso: sincronización

Con este proyecto ya creado y con datos, el siguiente paso es configurar el **Database Webhook** en
el Supabase del POS para que empuje los cambios de `productos` hacia acá — ver
[`docs/README-WEBHOOK-POS.md`](README-WEBHOOK-POS.md).
