# CHANGELOG v23 — Tracking de visitas de página (31-08-2026)

## Qué se hizo

Lado tienda del "total de visitas en la página web" — ver `sevelin-pos-oficial/docs/CHANGELOG-V44.md`
para el panel completo de métricas que lo lee, junto con carritos y usuarios.

- **`supabase/14-eventos-visita.sql`** (aplicada): agrega `'visita'` al check de `eventos_web.tipo`
  (junto a `busqueda`/`vista_producto` de v22).
- **`src/components/visit-tracker.tsx`** (nuevo): componente cliente sin renderizado propio, montado
  una vez en `layout.tsx`. Usa `usePathname()` — el truco estándar para contar navegaciones en el App
  Router, porque el layout raíz persiste entre rutas y NO se re-ejecuta en cada cambio de página (a
  diferencia de `productos/[sku]/page.tsx`, que sí es un Server Component nuevo en cada visita a una
  ficha). El `useEffect` con `[pathname]` como dependencia se dispara en la carga inicial y en cada
  navegación por `Link`.
- **`src/app/api/eventos/visita/route.ts`** (nuevo): `POST` sin body ni autenticación — es un contador
  simple, no algo sensible.
- **`src/lib/eventos-web.ts::registrarVisita()`**: mismo patrón mejor-esfuerzo que
  `registrarBusqueda()`/`registrarVistaProducto()`.

## Cómo se probó

- `tsc --noEmit`, `npm run lint`, `npm run build` (producción) — limpios.
- `npm run dev` real + Browser pane, contra Supabase Web de producción: se navegó a la home y se
  confirmó con SQL directo que quedó un evento `visita`. **Se registraron 2 filas por una sola carga**
  — confirmado que es React StrictMode duplicando el efecto en desarrollo (`useEffect` se monta/
  desmonta/remonta una vez a propósito, comportamiento documentado de React 18+ en dev), NO pasa en
  producción. Datos de prueba borrados al terminar.
- De paso se encontró y limpió **un dato de prueba real que había quedado de la sesión anterior** (1
  fila en `carritos_web` con `origen='compartido'`, de cuando se probó el botón "Compartir carrito" —
  nunca se borró) — inflaba el conteo de "carritos compartidos" del panel de métricas del POS.

## Pendiente

1. **Desplegar este repo a Vercel** para que `VisitTracker` empiece a contar visitas reales — mismo
   pendiente que v21/v22.
