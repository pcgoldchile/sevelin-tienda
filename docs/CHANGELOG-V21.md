# CHANGELOG v21 — Etiqueta destacada de producto (31-08-2026)

## Qué se hizo

Lado tienda del pedido "que puedan aparecer tanto en el POS como en la página web" (ver
`sevelin-pos-oficial/docs/CHANGELOG-V42.md` para el lado POS, dueño del dato).

- **`supabase/12-etiqueta-web.sql`** (aplicada): columna `productos_web.etiqueta_web` (texto,
  nullable, check `NULL | 'NOVEDAD' | 'TENDENCIA' | 'OFERTA'`) — espejo de `productos.etiqueta_web`
  del POS.
- **`src/lib/tipos.ts`**: tipo nuevo `EtiquetaProducto`, agregado a `ProductoWeb` y `ProductoPOS`.
- **`POST /api/sync/producto`**: mapea `producto.etiqueta_web` al guardar/actualizar.
- **`src/components/etiqueta-producto-badge.tsx`** (nuevo): badge reutilizable, un color por etiqueta
  (NOVEDAD cian, TENDENCIA magenta, OFERTA ámbar) — usado en `tarjeta-producto.tsx` (esquina superior
  izquierda de la foto) y en la ficha de producto (junto al título).

## Cómo se probó

- `tsc --noEmit`, `npm run lint`, `npm run build` (producción) — limpios.
- `npm run dev` real + Browser pane: se puso `etiqueta_web = 'TENDENCIA'` directo en un producto real
  con stock (`UPDATE productos_web ... WHERE sku = 'JIRV31783'`) — el badge apareció tanto en la
  tarjeta de la grilla de `/productos` como en la ficha de producto. Dato de prueba revertido al
  terminar.
- **No probado con datos reales de punta a punta desde el POS**: el receptor (`POST
  /api/sync/producto`) tiene el mapeo nuevo en el código local, pero **este repo no está desplegado en
  Vercel con este cambio todavía** — se confirmó que el trigger del POS sigue sincronizando bien
  (`sincronizado_en` se actualiza), pero mientras no se despliegue, `etiqueta_web` va a llegar vacío
  aunque se marque en el POS.

## Pendiente

1. **Desplegar este repo a Vercel** para que el mapeo de `etiqueta_web` quede activo end-to-end.
