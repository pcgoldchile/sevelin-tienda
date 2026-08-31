# CHANGELOG v27 — Chilexpress activado en producción + Vercel CLI conectado (01-09-2026)

## Qué se hizo

El dueño conectó la Vercel CLI a su cuenta (`vercel login`, flujo OAuth por dispositivo, lo completó
él) y me dio acceso para gestionar el proyecto `sevelin-tienda` directamente.

- Las 4 variables de Chilexpress (`CHILEXPRESS_API_KEY_COBERTURAS`/`_COTIZADOR`/`_ENVIOS`,
  `CHILEXPRESS_API_BASE=https://services.wschilexpress.com`) se agregaron a Vercel → Production con
  `vercel env add ... --sensitive` (las 3 keys como Secret, la URL como config).
- **Se encontró un bug de despliegue real y grave**: el intento de redeploy falló con
  `"Hobby accounts are limited to daily cron jobs. This cron expression (*/15 * * * *) would run more
  than once per day."` — el cron de `vercel.json` (agregado en v19 para el recordatorio de carrito
  abandonado, cada 15 minutos) **bloqueaba CUALQUIER despliegue nuevo** en este proyecto desde que se
  agregó, porque el plan es Hobby (confirmado también en el payload del token OIDC:
  `"plan":"hobby"`). Esto significa que **ningún push a git de v19 en adelante llegó a producción de
  verdad** — Vercel intentaba redesplegar automáticamente con cada push y fallaba en silencio (o
  quedaba pendiente), sin que hubiera ninguna señal visible desde el repo.
  - `vercel.json` corregido: `"*/15 * * * *"` → `"0 15 * * *"` (una vez al día, 15:00 UTC ≈ 11:00
    Arica). El recordatorio de carrito abandonado va a ser menos oportuno que lo diseñado
    originalmente (podía tardar hasta 24h en vez de ~1h), pero es lo que permite el plan actual.
- **Redespliegue manual con `vercel deploy --prod --yes`** — esta vez terminó bien. Confirmado con
  `curl` real: `https://sevelin-tienda.vercel.app/` y `/api/eventos/visita` responden 200 — la primera
  vez que TODO lo de v19-v26 (carritos persistentes, etiquetas de producto, más buscados, métricas,
  tracking de visitas, Chilexpress) queda de verdad en producción.

## Cómo se probó

- `vercel whoami` confirmó la sesión de CLI activa (usuario `pcgoldchile`, scope `sevelin1`).
- `vercel link --project sevelin-tienda` vinculó el directorio local al proyecto real.
- `vercel env ls production` confirmó las 4 variables de Chilexpress guardadas (valores ocultos,
  `Hidden`, como corresponde a Secret).
- `vercel deploy --prod --yes` — primer intento falló por el cron (ver arriba), segundo intento
  (con el cron corregido) terminó `"readyState": "READY"` y quedó aliaseado a
  `sevelin-tienda.vercel.app`.
- `curl` real contra la home y contra `/api/eventos/visita` en producción — ambos 200. Se generó 1
  evento de prueba real (`tipo='visita'`) al verificar, borrado al terminar.

## Pendiente

1. **Ya no hay pendiente de "código listo pero sin desplegar"** — todo lo de v19-v26 está en
   producción de verdad ahora. Revisar el panel "Métricas"/"Más buscados" del POS en los próximos días
   para confirmar que empiezan a acumular datos reales.
2. El recordatorio de carrito abandonado corre una vez al día (15:00 UTC), no cada 15 minutos como se
   diseñó — considerar si vale la pena el plan Pro de Vercel para recuperar la frecuencia original, o
   aceptar el recordatorio diario.
