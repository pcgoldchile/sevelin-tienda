# Database Webhook: POS → Tienda

> Empuja los cambios de `productos` (Supabase POS) hacia `POST /api/sync/producto` de este proyecto.
> Ver README-ECOMMERCE-SEVELIN.md sección 2 ("Sincronización POS → Web") y sección 5.

No configuré esto desde la sesión de Claude que construyó la Fase 1: es un paso manual en el
dashboard del Supabase **POS** (no del Supabase Web), y requiere que `sevelin-tienda` ya esté
desplegado en una URL real (Vercel) para poder apuntarle el webhook — no tiene sentido antes de eso.

## Pasos (en el Supabase del POS, no el de la tienda)

1. Entra al proyecto Supabase de `sevelin-pos-oficial` → **Database → Webhooks → Create a new hook**.
2. **Table:** `productos`. **Events:** marca `INSERT`, `UPDATE` y `DELETE` (los tres — un producto que
   se borra en el POS debe desaparecer también de la tienda).
3. **Type:** `HTTP Request`. **URL:** `https://<tu-dominio-de-sevelin-tienda>/api/sync/producto`
   (la URL real de Vercel una vez desplegado, o `https://sevelin.cl/api/sync/producto` si ya está el
   dominio final apuntado).
4. **HTTP Headers:** agrega `x-sync-secret: <el mismo valor que SYNC_SECRET>` — debe ser IDÉNTICO al
   `SYNC_SECRET` configurado en las variables de entorno de `sevelin-tienda` (Vercel). Sin este header
   (o con un valor distinto), `POST /api/sync/producto` responde 401 y no sincroniza nada — es la
   defensa contra que cualquiera en internet pueda escribir en `productos_web`.
5. Guarda y prueba: edita un producto cualquiera en el POS (ej. cambia el nombre) y revisa en
   Supabase → Database → Webhooks → (tu webhook) → **Logs** que se haya disparado con `200`.

## Qué pasa si el webhook falla

Un fallo del webhook (URL caída, secreto incorrecto, `sevelin-tienda` sin desplegar) **no afecta al
POS**: Supabase reintenta el webhook por su cuenta según su propia política, y mientras tanto el POS
sigue vendiendo con normalidad — la tienda simplemente queda con el catálogo desactualizado hasta que
la sincronización se recupere. Esto es intencional (ver la razón de aislar los dos proyectos en
README-ECOMMERCE-SEVELIN.md sección 2.1).

## Primera carga del catálogo

El webhook solo dispara con cambios FUTUROS (INSERT/UPDATE/DELETE a partir de que se activa). Los
productos que ya existían en el POS antes de configurar el webhook no se sincronizan solos: hay que
re-guardar cada uno una vez desde el modal de producto del POS (para que dispare un UPDATE), o pedir
un script de sincronización masiva aparte si son muchos — no incluido en esta fase.
