# CHANGELOG v22 — Tracking de búsquedas y vistas de producto (31-08-2026)

## Qué se hizo

Lado tienda de "productos más buscados, o productos más cotizados (que han clickeado)" — ver
`sevelin-pos-oficial/docs/CHANGELOG-V43.md` para el panel que lee estos datos.

- **`supabase/13-eventos-web.sql`** (aplicada): tabla `eventos_web` (tipo `busqueda`|`vista_producto`,
  `termino`, `producto_pos_id`, `creado_en`), RLS activo sin políticas públicas (solo `service_role`,
  mismo criterio que `productos_web`/`pedidos_web`/`carritos_web`).
- **`src/lib/eventos-web.ts`** (nuevo): `registrarBusqueda(termino)` / `registrarVistaProducto(id)` —
  mejor esfuerzo, nunca lanzan (un fallo acá no puede tumbar una página real).
- **`src/app/productos/page.tsx`**: registra el término de `?q=` con `after()` (next/server) — corre
  DESPUÉS de mandar la respuesta al navegador, no le agrega latencia a la página. Se registra tenga o
  no resultados: un término sin resultados también es una señal útil ("demanda no satisfecha").
- **`src/app/productos/[sku]/page.tsx`**: registra `producto_pos_id` de cada ficha abierta, mismo
  patrón con `after()`.

## Cómo se probó

- `tsc --noEmit`, `npm run lint`, `npm run build` (producción) — limpios.
- `npm run dev` real + Browser pane, contra Supabase Web de producción: se visitó una ficha de
  producto real y se hizo una búsqueda real, y se confirmó con una consulta SQL directa que ambos
  eventos quedaron en `eventos_web` con el tipo y los datos correctos. Datos de prueba borrados al
  terminar.

## Pendiente

1. **Desplegar este repo a Vercel** para que el tracking quede activo en el sitio real — mismo
   pendiente que la etiqueta destacada (v21).
