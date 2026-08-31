# SNAPSHOT — Sevelin Tienda

> Léelo al abrir un chat nuevo. Actualiza SOLO este archivo al cerrar una sesión. El plano de
> arquitectura completo (todas las fases) vive en `README-ECOMMERCE-SEVELIN.md`, en el repo del POS
> (`sevelin-pos-oficial`) — este documento es el estado de ESTE repo (`sevelin-tienda`) nada más.

**Fecha:** 31-08-2026 · **Versión activa:** v24 (Chilexpress: documentación oficial encontrada —
`declaredWorth` real en vez de 0, mapeo de regiones confirmado oficial, camino a producción claro
—ver "v24" abajo; también v23: tracking de visitas de página — `VisitTracker`,
para el panel "Métricas" del POS, código listo pero pendiente de desplegar; también
v22: tracking de búsquedas y vistas de producto — `eventos_web`, para el panel "Más buscados" del POS;
v21: etiqueta destacada de producto — NOVEDAD/TENDENCIA/OFERTA, badge en tarjeta y ficha de producto;
v20: Chilexpress: código de cotización real validado de punta a punta contra el ambiente de pruebas,
falta solo la TCC para producción;
también v19: carritos persistentes con expiración de 24h — link de "compartir carrito" con token en
vez de codificado sin vencimiento, popup avisando la duración, y recordatorio de carrito abandonado
cuando el cliente deja el correo en el checkout sin pagar; v18: rediseño de ficha de producto + fix del
sanitizador que no cargaba en Vercel + soporte de negrita/link en descripciones; v17: arreglos de
móvil, menú que se cierra solo, **envío por distancia real** con Nominatim + OSRM, valles con km
declarado, horarios de corte) ·
**En producción:** desplegado en Vercel, dominio `sevelin.cl` **todavía apunta a Tiendanube** (la
tienda nueva vive en la URL de Vercel por ahora — decidir cuándo migrar el DNS, ver "Pendiente").

**Estado real (verificado en producción, no de memoria):** Supabase Web real
(`ekxwavsnocwxtzxqxbbi`) con **9 migraciones** aplicadas, catálogo con **86+ productos reales**
publicados y categorizados en 12 categorías (más subcategorías reales expuestas como filtro, ver
v16), **75+ con fotos reales**. **Rediseño visual completo cyberpunk/gamer** (paleta cian/magenta,
coherente con el POS que también se rediseñó esta sesión) reemplaza la paleta azul eléctrico
anterior. Flow: `POST /payment/create` **verificado contra sandbox real** (no producción todavía).
Chilexpress: **sigue en mock**, sin API key real. Cuentas de cliente reales (Supabase Auth,
`/cuenta/**`) funcionando. **Cumplimiento Ley 21.719**: brechas del Art. 14 ter cerradas (política
v1.2), 14 quáter/quinquies/sexies documentados — lo que queda es operativo (ver "Pendiente" #4-6).
**Correo transaccional con Resend integrado y probado con un envío real** — confirmación de pedido
al pagar, cancelación desde el POS — pero sin dominio propio verificado en Resend todavía: los
envíos a clientes reales fallan en silencio hasta verificarlo (ver "Pendiente" #1).

---

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind v4 · `@supabase/supabase-js`.

## Estado: qué está HECHO (v09-v11 — catálogo real, categorías, fotos, header)
- **v09:** `productos_web.stock_umbral_web` (migración `supabase/04-stock-umbral-web.sql`, aplicada)
  + `formatoStock()` en `src/lib/formato.ts` ("Más de N disponibles" en vez del stock exacto).
- **v10:** `src/components/tarjeta-producto.tsx` y `src/app/productos/[sku]/page.tsx` ya no muestran
  el SKU al cliente (sigue usándose como slug de URL, invisible). `src/components/banners-categoria.tsx`
  (nuevo): 3 accesos directos en el home con placeholder de foto.
- **v11:** el catálogo del POS (114 productos) se clasificó y publicó por completo (ver
  `sevelin-pos-oficial` v29-v31): 86 con SKU quedaron publicados y categorizados, 75 con fotos reales
  importadas desde `sevelin.cl` (la tienda Tiendanube del mismo negocio — nunca se enlazan sus URLs
  directo, se descargan y realojan en Supabase Storage del POS). `header.tsx` rediseñado: franja de
  categorías principales siempre visible (inspirada en la estructura de sipoonline.cl, no en su
  diseño/branding) + "Más categorías" como overflow, reemplaza el dropdown único de antes.

## Estado: qué está HECHO (v12-v15 — cuentas de cliente, checkout ampliado, Ley 21.719)
- **v12 — fix de alineación + checkout ampliado + carrito compartible:**
  `tarjeta-producto.tsx` reserva 2 líneas para el nombre y usa `mt-auto` para que
  cantidad/"Agregar" queden siempre a la misma altura entre tarjetas. Checkout: nombre/apellido
  separados, teléfono con código de país independiente del número (`src/lib/codigos-pais.ts`),
  región de Chile (`src/lib/regiones-chile.ts`, va dentro de `direccion_envio` JSONB, sin
  migración), nota/observación opcional, "Solicitar factura" con razón social/RUT/giro
  (`supabase/05-checkout-datos-adicionales.sql`). Carrito compartible SIN base de datos
  (`src/lib/compartir-carrito.ts`, codifica sku+cantidad en la URL) — `/carrito-compartido`
  revalida cada producto contra el catálogo real antes de agregarlo.
- **v13 — cuentas de cliente reales (Supabase Auth):** registro/login/recuperar-restablecer
  contraseña + "Mis pedidos" en `/cuenta/**`, usando la **anon key pública**
  (`NEXT_PUBLIC_SUPABASE_WEB_URL`/`NEXT_PUBLIC_SUPABASE_WEB_ANON_KEY`, YA CONFIGURADAS en Vercel)
  vía `@supabase/ssr` (`src/lib/supabase-browser.ts`, `supabase-server.ts`, `middleware.ts`) — la
  `service_role` (`supabase-web.ts`) sigue siendo server-only sin cambios, `pedidos_web` sigue sin
  política pública de escritura (el checkout sigue creando pedidos solo vía
  `POST /api/checkout`). `perfiles_clientes` + RLS + `cliente_user_id` nullable en `pedidos_web`
  (`supabase/06-clientes-web.sql`). El checkout sigue funcionando 100% como invitado.
  `CampoPassword` (mostrar/ocultar con estado propio, no el nativo del navegador) y
  `errores-auth.ts` (traduce mensajes de Supabase Auth al español) en `/cuenta/**`.
- **v14 — Ley 21.719 (Protección de Datos Personales):** checkbox de consentimiento desmarcada por
  defecto en checkout y registro (bloquea envío en frontend Y servidor), consentimiento de
  marketing SEPARADO y opcional, trazabilidad completa
  (`supabase/07-consentimiento-privacidad.sql`, `08-solicitudes-arco-marketing.sql`: columnas
  `consentimiento_privacidad`/`fecha_consentimiento`/`version_politica` en `pedidos_web` y
  `perfiles_clientes`, tabla `solicitudes_arco` que sobrevive a la eliminación de la cuenta).
  Módulo ARCO completo en `/cuenta/privacidad` ("Centro de Privacidad"): editar perfil
  (rectificación, con log de qué cambió), descargar datos en JSON
  (`GET /api/cuenta/exportar`, portabilidad), eliminar cuenta con confirmación en dos pasos
  (`POST /api/cuenta/eliminar` — anonimiza pedidos pasados, borra el usuario de Supabase Auth de
  verdad vía Admin API), toggle de marketing (oposición), historial de solicitudes ARCO propias.
  `/privacidad` y `/terminos` nuevas, enlazadas desde el footer. Todo probado de punta a punta con
  cuentas de prueba reales contra Supabase de producción (creadas y eliminadas en la misma
  sesión). **Auditoría letra por letra del Art. 14 ter contra el texto oficial de la BCN
  (leychile.cl, versión vigente 01-dic-2026)**: 3/12 letras cumplen, 4 parciales, 5 no cumplen
  (~42%) — ver "Pendiente" #1-3, son las brechas concretas a cerrar en la próxima sesión. 14
  quáter/quinquies parciales (hay medidas técnicas reales — RLS, minimización — pero nada
  documentado como política formal). 14 sexies (reporte de vulneraciones) sin empezar: es un
  procedimiento operativo, no algo que se resuelva con código.

- **v15 — cierre de las brechas del Art. 14 ter + documentos de 14 quáter/quinquies/sexies:**
  `/privacidad` pasa a **versión 1.2** (con fecha visible: la letra a) exige "fecha y versión", antes
  solo estaba la versión — `FECHA_POLITICA_PRIVACIDAD` en `src/lib/politica-privacidad.ts`).
  Secciones nuevas: universo de titulares (d), fuente de los datos (j), transferencia internacional
  (h), decisiones automatizadas — declaración negativa (l), retiro del consentimiento (k), y plazos
  del Art. 11 ligados al reclamo ante la Agencia (g). Conservación (i) reemplaza "el tiempo que
  exija la ley" por el criterio real del SII. Dos correcciones de hecho: se declaraba una cesión a
  Chilexpress **que hoy no ocurre** (solo se cotiza tarifa por comuna, sin datos personales), y el
  bloque de contacto desaparecía entero si faltaba `NEXT_PUBLIC_PRIVACIDAD_EMAIL` — ahora tiene
  `sevelin.contacto@gmail.com` (Gmail real creado el 29-08-2026 para este fin) como valor por
  defecto en el código, la variable solo lo sobreescribe.
  Documentos internos nuevos (no se publican): `docs/POLITICA-SEGURIDAD-DATOS.md` (mapeo requisito →
  control → evidencia del 14 quinquies, decisiones de diseño del 14 quáter, y la justificación
  escrita de por qué **no** corresponde EIPD) y `docs/PROCEDIMIENTO-INCIDENTES-DATOS.md` (los 9
  pasos del 14 sexies + bitácora con los campos exactos que exige el inciso 2º).

## Estado: qué está HECHO (v16 — rediseño gamer, catálogo sin bloqueo de SKU, correo — 29-08-2026)
- **Rediseño visual completo cyberpunk/gamer** (paleta cian/magenta estilo Razer/ROG, coherente con
  el mismo rediseño hecho al POS en la misma sesión): tarjeta de producto con aureola de neón
  giratoria SOLO en hover (se sacó la inclinación 3D + brillo que seguía el mouse que tenía antes,
  quedaba compitiendo), precio en tono neutro (`--color-ink`, casi blanco) en vez de neón — pedido
  explícito para que no compitiera visualmente ni se leyera "fosforescente". Fondo cyberpunk
  ESTÁTICO (rejilla hexagonal + líneas de escaneo sutiles, CSS puro sin canvas/JS — antes era un
  canvas animado con nodos). Banners de categoría con foto real de un producto propio (no genérica)
  y título en su propia franja de altura fija arriba de la foto (antes se superponía a la imagen y
  quedaba ilegible con fotos de empaque con su propio texto).
- **Productos sin SKU/código de barras ya pueden sincronizarse** — antes `POST /api/sync/producto`
  los rechazaba (`productos_web.sku` es NOT NULL). Ahora, sin SKU, se genera un slug de respaldo
  desde el nombre + el `producto_pos_id` (único garantizado) — el SKU nunca se muestra al cliente,
  solo se usa como URL, así que un slug generado cumple la misma función.
- **Subcategorías reales expuestas como filtro** en `/productos` — el POS ya administraba un árbol
  de 2 niveles (categoría → subcategoría, `producto_categorias.parent_id`) desde hacía tiempo, pero
  nunca sincronizaba esa relación a la tienda (`productos_web.categoria` solo guardaba el nombre de
  nivel superior). Columna `subcategoria` nueva (`supabase/09-subcategoria.sql`); chips de
  refinamiento SOLO aparecen dentro de una categoría que de verdad tenga subcategorías en el
  catálogo publicado — no es un mega-menú del header, sigue siendo el filtro plano de siempre. De
  paso se corrigió un producto real mal clasificado ("Fuentes de poder", huérfano de 1 producto,
  invisible en el menú principal) que resultó ser justo este bug.
- **Descripción con HTML enriquecido** — el editor del POS pasó a Quill (negrita, listas, links);
  la ficha de producto ahora sanitiza (`isomorphic-dompurify`, whitelist mínima) y renderiza ese
  HTML en vez de tratarlo como texto plano. Las descripciones viejas (texto plano) se siguen viendo
  igual (se mantiene `whitespace-pre-line` para sus saltos de línea).
- **Correo de contacto real**: pasó de `pcgoldchile@gmail.com` → `contacto@sevelin.cl` (nunca
  confirmado que existiera) → **`sevelin.contacto@gmail.com`** (Gmail real creado el 29-08-2026).
  **Pendiente real**: confirmar que `NEXT_PUBLIC_PRIVACIDAD_EMAIL` en Vercel no siga con el valor
  viejo (`pcgoldchile@gmail.com`), que pisaría este default nuevo del código.
- **Correo transaccional con Resend**: `src/lib/resend.ts` (fetch directo a la API REST, sin el SDK)
  + `src/lib/correo-pedido.ts` (plantillas de confirmación/cancelación). `POST /api/flow-webhook`
  manda la confirmación al pagar (mejor esfuerzo, no bloquea el pedido). `POST /api/pos/notificar-
  cancelacion` (nuevo, protegido con `SYNC_SECRET`) — el POS lo llama al cancelar un pedido, porque
  el POS no tiene la API key de Resend ni la plantilla. **Probado con un envío real** (id de mensaje
  real devuelto por Resend). **Sin dominio propio verificado en Resend**: mientras se use el dominio
  de prueba (`onboarding@resend.dev`), solo entrega a la cuenta que creó la API key — los correos a
  clientes reales fallan en silencio hasta verificar `sevelin.cl` (o un subdominio) en Resend.
- **WhatsApp**: decidido NO implementarlo todavía con automatización "no oficial" (viola los
  términos de servicio de WhatsApp, riesgo real de que baneen el número) — requiere pasar por la
  verificación de Meta Business Manager (API oficial), sin decisión tomada sobre cuándo.

## Estado: qué está HECHO (v17 — móvil, menú y envío por distancia — 30-08-2026)
> Detalle completo en `docs/CHANGELOG-V17.md`.
- **Arreglos de móvil** (reportados con capturas del teléfono): el botón "Agregar" salía cortado
  porque la fila cantidad+botón desbordaba **66px** dentro de una tarjeta de 160px — ahora van
  apilados hasta `lg`. La franja de texto cortada bajo los nombres largos era una caja de 40px
  con 2 líneas de 17,5px: los 5px sobrantes dejaban asomar la tercera línea; ahora `h-10` +
  `leading-5` calzan exacto. El botón de WhatsApp se aparta al bajar y es más chico en móvil.
- **Menú**: se cierra solo al **cambiar de ruta** (así atrapa el "Ir a pagar" del carrito, no
  solo los enlaces del header), al abrir el carrito, con Escape, y con un botón "Cerrar" al
  final de los dos menús.
- **Envío por distancia real** — reemplaza la tarifa plana de la v6. Nominatim geocodifica y
  **OSRM** mide los km manejando desde la tienda. Escala urbana de 6 tramos hasta 9,5 km
  ($2.000 a $4.500) y sobre eso `5000 + techo((km−9,5)/1,5) × 500`. Dentro de Arica se ofrecen
  hasta 3 opciones: retiro, despacho propio y courier.
- **Azapa y Lluta: el cliente declara el kilómetro.** Nominatim ignora la numeración en caminos
  rurales y ancla al inicio del camino ("Camino Azapa 5000" daba 2,6 km → tarifa urbana mínima
  para un despacho que cruza medio valle). Ahora hay selector de sector + campo de km, y la
  distancia es entrada del valle + km (Azapa 4,5 km · Lluta 5,0 km).
- **⚠️ La coordenada de la tienda está FIJA y confirmada por el dueño** (`-18.4619, -70.2976`),
  no se geocodifica. Ver la trampa correspondiente abajo.
- **Horarios de corte**: despacho el mismo día solo antes de las **18:00**; retiro hasta las
  **20:00**. Evaluado en hora de Chile con `Intl`, nunca con la del navegador ni la del
  servidor (que corre en UTC). El aviso aparece bajo cada opción de envío.
- **Pendiente de configuración (no es código):** `COSTO_ENVIO_CHILEXPRESS_MOCK` NO está en
  `.env.local` (solo en el `.example`) — sin ella el courier no aparece dentro de Arica y falla
  la cotización fuera de Arica. `COSTO_ENVIO_PLANO` quedó **obsoleta**, el código ya no la lee.

## Estado: qué está HECHO (v18 — ficha de producto, sanitizador real, contenido — 30-08-2026)
> Detalle completo en `docs/CHANGELOG-V18.md`.
- **🔴 Bug crítico corregido: TODAS las fichas de producto daban 500 en producción.** La causa era
  `isomorphic-dompurify` (arrastra jsdom): el `import()` dinámico fallaba en tiempo de ejecución en el
  entorno serverless de Vercel — de forma silenciosa al principio (atrapado por un `catch`), y con
  500 antes de eso (import estático, ver el episodio completo abajo). **Reemplazado por
  `sanitize-html`** (JS puro, sin jsdom): `sanitizarDescripcionHtml()` volvió a ser síncrona, sin
  `serverExternalPackages` ni carga diferida. Verificado con `next build` + `next start` real
  (simulando producción), no solo `next dev` — local nunca reprodujo ninguno de los dos síntomas.
- **Rediseño de la ficha de producto**: el botón "Agregar al carrito" pasó a ir INMEDIATAMENTE
  después del precio (antes de la descripción, no al final) y queda `lg:sticky` en desktop — con
  descripciones de más de 2.500 caracteres (servicios técnicos) el botón quedaba a un scroll largo de
  distancia. La descripción en texto plano ("✅ viñeta tras viñeta" sin jerarquía) pasó a
  estructurarse de verdad: título de sección, lista de características en grid de 2 columnas con
  ícono check propio (reemplaza el emoji que haya usado cada admin), párrafos normales para el resto.
  Ver `src/lib/formatear-descripcion.ts`.
- **Soporte de `**negrita**` y `[texto](url)`** dentro de las descripciones de texto plano
  (`conEnfasis()`) — no es markdown genérico a propósito, solo lo que necesita un pie de contacto
  fijo con etiquetas en negrita y un link a la tienda.
- **"Destacados" del home = los más vendidos de verdad**, no los primeros del catálogo por orden
  alfabético. El dato (`productos_web.unidades_vendidas`) lo empuja el POS —
  `POST /api/sync/mas-vendidos` (nuevo, protegido con `SYNC_SECRET`) — porque el grueso de las ventas
  pasa por el mostrador, no por la web. Ver `supabase/10-mas-vendidos.sql`.
- **Banners de categoría = el producto más barato de cada categoría**, con foto real y "Desde $X",
  en vez de 3 SKU fijos escritos a mano que quedaban obsoletos apenas se agotaban.
- **60 fichas de producto del catálogo reescritas** con una plantilla comercial (título + intro +
  características + advertencias reales + pie fijo de envíos/contacto) — trabajo hecho desde
  `sevelin-pos-oficial` (dueño de `descripcion_web`), documentado en su propio
  `docs/CHANGELOG-V41.md`. Quedan pendientes 40 productos sin ninguna descripción guardada (esperando
  specs del usuario) y los servicios técnicos (prompt aparte, otra sesión).

## Estado: qué está HECHO (v24 — Chilexpress: documentación oficial, 31-08-2026)
> Detalle completo en `docs/CHANGELOG-V24.md`.
- El dueño encontró que `developers.wschilexpress.com/api-details` tiene documentación pública real
  (sin login) — reemplaza dos supuestos de v20 por hechos confirmados: `declaredWorth` es OBLIGATORIO
  (ahora se manda el valor real del carrito, no `0` fijo) y el mapeo de regiones
  (`chilexpress-regiones.ts`) quedó confirmado oficial vía `GET /georeference/api/v1.0/regions`.
- **Camino a producción claro**: con la TCC que el dueño ya asoció a su cuenta de Portal Empresa, el
  siguiente paso es escribir a `soporteintegraciones@chilexpress.cl` — Chilexpress responde en menos
  de 24h con las credenciales productivas reales. Ver detalle completo en la sección "Pendiente" #9.

## Estado: qué está HECHO (v23 — tracking de visitas de página, 31-08-2026)
> Detalle completo en `docs/CHANGELOG-V23.md`.
- `eventos_web.tipo` ahora acepta `'visita'` (`supabase/14-eventos-visita.sql`, aplicada).
- **`src/components/visit-tracker.tsx`** (nuevo, cliente, montado en `layout.tsx`): reacciona a
  `usePathname()` — el layout raíz (Server Component) NO se re-ejecuta en cada navegación del App
  Router, así que un componente cliente es la única forma de contar cada cambio de página real, tanto
  la carga inicial como cada navegación por `Link`. Manda `POST /api/eventos/visita` con
  `keepalive: true`.
- `src/lib/eventos-web.ts::registrarVisita()` — mismo criterio mejor-esfuerzo que las otras dos
  funciones de este archivo.
- **Cuenta cargas de página, no visitantes únicos** — a propósito, es lo que pidió el dueño ("total de
  visitas", no analítica de sesiones). En dev, React StrictMode duplica el efecto (2 inserts por
  carga) — confirmado que NO pasa en producción, es un comportamiento conocido de desarrollo.
- La lee el POS (`GET /api/pos/metricas`) para el panel nuevo "Métricas", junto con `carritos_web`
  (compartidos/abandonados/convertidos) y `perfiles_clientes` (cuentas creadas) — ver
  `sevelin-pos-oficial/docs/CHANGELOG-V44.md`. **Código listo, PENDIENTE DE DESPLEGAR** — mismo caso
  que etiquetas (v21) y más buscados (v22).

## Estado: qué está HECHO (v22 — tracking de búsquedas y vistas de producto, 31-08-2026)
> Detalle completo en `docs/CHANGELOG-V22.md`.
- `eventos_web` nueva (`supabase/13-eventos-web.sql`, aplicada): 2 tipos de evento, `busqueda`
  (término escrito en `/productos?q=...`) y `vista_producto` (cada vez que se abre una ficha,
  `/productos/[sku]`). `src/lib/eventos-web.ts::registrarBusqueda()`/`registrarVistaProducto()`, mejor
  esfuerzo (nunca lanza), llamadas con `after()` (next/server) para no retrasar la respuesta.
- La lee el POS (`GET /api/pos/mas-buscados`, `dbWeb`) para el panel nuevo "Más buscados" — ver
  `sevelin-pos-oficial/docs/CHANGELOG-V43.md`. **Código listo, probado localmente contra producción
  (se insertaron y revirtieron eventos de prueba reales), PENDIENTE DE DESPLEGAR** — mismo caso que la
  etiqueta destacada (v21): hasta desplegar, no se registra nada desde el sitio real.

## Estado: qué está HECHO (v21 — etiqueta destacada de producto, 31-08-2026)
> Detalle completo en `docs/CHANGELOG-V21.md`.
- `productos_web.etiqueta_web` nuevo (`supabase/12-etiqueta-web.sql`, aplicada) — NULL o una de
  `NOVEDAD`/`TENDENCIA`/`OFERTA`, marcada desde el modal del POS. Badge nuevo
  (`EtiquetaProductoBadge`) en `tarjeta-producto.tsx` y en la ficha de producto.
- **Código listo, probado localmente, PENDIENTE DE DESPLEGAR**: el mapeo en `POST
  /api/sync/producto` está en el repo pero no en Vercel — hasta desplegar, la etiqueta que se marque
  en el POS no va a llegar a la tienda real.

## Estado: qué está HECHO (v20 — Chilexpress validado, falta la TCC, 31-08-2026)
> Detalle completo en `docs/CHANGELOG-V20.md`.
- Con 3 suscripciones reales del portal de Chilexpress, se confirmó que el código de cotización
  (geo-referencia + tarifa) funciona de punta a punta contra el ambiente de PRUEBAS
  (`testservices.wschilexpress.com`) — incluye `src/lib/chilexpress-regiones.ts` nuevo (mapeo de las
  16 regiones de Chile, confirmado contra la API real) y la corrección de un bug real (`serviceValue`
  venía como texto, se comparaba mal). Contra producción las 3 suscripciones dan 401 en casi todo — el
  FAQ del portal explica que las credenciales productivas reales necesitan una TCC (Tarjeta de Cliente
  Chilexpress), un trámite aparte del registro self-service.
- **No se activó en producción a propósito**: `CHILEXPRESS_API_KEY_COTIZADOR` queda vacío hasta tener
  la TCC — si se pusiera ahora, el checkout mostraría precios de prueba a clientes reales.

## Estado: qué está HECHO (v19 — carritos persistentes con expiración, 31-08-2026)
> Detalle completo en `docs/CHANGELOG-V19.md`.
- **Tabla `carritos_web` nueva** (`supabase/11-carritos-web.sql`, aplicada). El link de "Compartir
  carrito" pasó de ir codificado en la URL (sin vencimiento) a `?t=<token>`, expira a las 24h; pasado
  ese plazo la página avisa que expiró en vez de reconstruir el carrito viejo. Popup "Este link dura
  24 horas" la primera vez que se comparte, recomendando captura de pantalla si se necesita después.
- **Carrito de abandono**: apenas el cliente completa el correo en el checkout (antes de pagar) se
  guarda el carrito con `POST /api/carrito/abandono`; si paga, `POST /api/checkout` lo marca
  convertido. `GET /api/cron/recordar-carritos` (programado cada 15 min en `vercel.json`, protegido
  con `CRON_SECRET`) manda el recordatorio 1h después si no volvió a comprar, revalidando los
  productos contra el catálogo real antes de mandar el correo.
- **Sigue dependiendo del mismo pendiente de Resend** (#1 abajo): el código funciona, probado de
  punta a punta contra producción, pero sin dominio verificado el correo no le llega a un cliente
  real. **Nuevo pendiente**: confirmar si el proyecto de Vercel es Hobby o Pro — Hobby limita los cron
  jobs a una vez al día, no cada 15 minutos como quedó configurado.

## Arquitectura (resumen — ver README-ECOMMERCE-SEVELIN.md para el detalle completo)
- Proyecto **separado** del POS (`sevelin-pos-oficial`), repo Git propio, deploy Vercel propio.
- Conecta a su **propio** proyecto Supabase ("Supabase Web": `productos_web`, `pedidos_web`) — NUNCA
  al Supabase del POS directo.
- Se sincroniza desde el POS vía Database Webhook → `POST /api/sync/producto` (push, no polling).

## Estado: qué está HECHO (v7 — rediseño visual, ver `docs/CHANGELOG-V07.md`)
- Sistema de diseño propio (paleta navy/coral/teal, tipografía Bricolage Grotesque + IBM Plex Sans,
  sombras multicapa, glow) reemplaza el Tailwind por defecto (`zinc`, Geist) en toda la tienda.
- `framer-motion` (nueva dependencia): microinteracciones en header, hero, tarjetas de producto,
  carrito, checkout. `MotionConfig reducedMotion="user"` en `layout.tsx` respeta
  `prefers-reduced-motion` para toda la app de una vez.
- El usuario instaló por su cuenta (yo me negué a correr `npx skills@latest add ...`, es ejecutar
  código de terceros sin poder revisarlo antes) 2 skills de diseño/animación en `.agents/skills/` —
  se leyeron y se aplicó su guía de curvas de easing y accesibilidad de movimiento. `.agents/**` está
  en los ignores de ESLint.
- No cambia nada del backend, checkout, ni modelo de datos — es una capa visual sobre lo ya
  construido. No bloquea el despliegue.

## Estado: qué está HECHO (v6 — no es una fase nueva, ver `docs/CHANGELOG-V06.md`)
- **Shipit descartado, reemplazado por Chilexpress** (decisión del usuario: no operan retiros desde
  Arica; tiene convenio corporativo con Chilexpress). `src/lib/shipit.ts` borrado.
  `src/lib/chilexpress.ts` (nuevo): endpoints y campos sacados del código fuente real del plugin
  oficial de WooCommerce de Chilexpress (no hay portal de docs público legible como el de Shipit) —
  TODO crítico: validar contra `developers.wschilexpress.com` en cuanto haya API key real.
- **Modelo de envío rediseñado, sin Haversine**: dentro de la comuna de Arica, el cliente ahora
  **elige** entre "Retiro en tienda" ($0) o "Despacho a domicilio en Arica" (`COSTO_ENVIO_PLANO`) —
  ya no se geocodifica ni se calcula distancia, la decisión pasó de "¿está a ≤10 km?" a una
  elección directa del cliente. Fuera de Arica, cotización automática vía Chilexpress (o
  `COSTO_ENVIO_CHILEXPRESS_MOCK` mientras no haya API key — pedido explícito del usuario para
  poder probar el checkout ya). `src/lib/envio.ts` reescrito: `cotizarOpcionesEnvio()` (vista
  previa, puede devolver 2 opciones) / `confirmarEnvio()` (autoridad real, recibe cuál eligió el
  cliente y recalcula el costo desde cero — nunca confía en un monto que mande el cliente).
- **`pedidos_web.costo_envio` ahora permite $0** (`supabase/03-permitir-envio-gratis.sql`, todavía
  sin correr en Supabase Web real) — el retiro en tienda rompe a propósito la regla "nunca gratis"
  de la Fase 1, es una decisión de negocio nueva.
- `src/components/formulario-checkout.tsx`: si `POST /api/cotizar-envio` devuelve 2 opciones,
  aparecen como radio buttons y el cliente tiene que elegir una antes de habilitar "Pagar"; si
  devuelve 1 (Chilexpress), se preselecciona sola como antes.
- **Probado real de punta a punta en el navegador**: comuna "Arica" → las 2 opciones con los
  montos reales configurados por el usuario ($0 / $2.000); comuna "Santiago" → Chilexpress mock
  ($6.000); submit real falla con el error genuino de Supabase (faltan las migraciones), no un
  500 crudo.

## Estado: qué está HECHO (v5 — ver `docs/CHANGELOG-V05.md`)
- **OpenFactura deshabilitado a propósito** (costo ~$30.000/mes, decisión del usuario): el
  respaldo de una venta web es el comprobante de pago de Flow; boleta/factura se emite manual si
  el cliente la pide. `src/lib/openfactura.ts::openFacturaHabilitada()` controla esto —
  `POST /api/flow-webhook` ya ni intenta emitir boleta si es `false` (antes lo intentaba y fallaba
  silenciosamente en cada pago). `/pedido/[numero]` muestra un aviso + link de WhatsApp en vez de
  un link de boleta que no existe. Reactivarlo en el futuro es solo volver a poner
  `OPENFACTURA_API_KEY`.
- **Bug real encontrado y corregido en la firma de Flow**: con credenciales sandbox reales, el
  primer intento de `crearPagoFlow()` contra la API real dio "Invalid Signature" — el README
  maestro describía mal el algoritmo ("clave=valor" en vez de "claveValor", sin el `=`). Corregido
  en `src/lib/flow.ts::firmarParametrosFlow()` y verificado contra
  developers.flow.cl/en/docs/tutorial-basics/create-order. `POST /payment/create` respondió 200
  real con `url`/`token`/`flowOrder`. `getStatus`/`FLOW_ESTADO_PAGADO` siguen sin probar (hace
  falta completar un pago real, no solo crear la orden).
- **`SUPABASE_WEB_URL` en `.env.local` estaba mal formado** (solo el project ref, sin
  `https://...supabase.co`) — corregido. Con eso, la conexión a Supabase Web real **funciona**:
  el único bloqueante que queda para ver el catálogo es correr las migraciones SQL (ver
  "Pendiente" #1 abajo).

## Estado: qué está HECHO (Fase 4 — histórico, ver nota)
> **Nota (v6):** el diseño Haversine + Shipit descrito abajo fue **reemplazado** por el modelo de
> retiro/local/Chilexpress — ver "v6" arriba y `docs/CHANGELOG-V06.md`. Se deja el texto original
> como registro histórico de lo que se construyó en la Fase 4 y por qué cambió.
- Cotización real de envío, reemplaza la tarifa plana fija de la Fase 3 (ver
  `docs/CHANGELOG-V04.md` para el detalle completo):
  - `src/lib/envio.ts` (reescrito en la Fase 4, y de nuevo en v6): `cotizarEnvio(direccion, items)`
    — si la comuna es "Arica", geocodifica con OpenStreetMap/Nominatim (gratis, sin cuenta) y
    calcula Haversine contra la tienda (San Rafael 896, Arica); si da ≤10 km, tarifa LOCAL plana
    (`COSTO_ENVIO_PLANO`). Si no (otra comuna, o geocodificación falló/fuera de rango), cotiza con
    Shipit. Es la única fuente de verdad: la usan tanto `POST /api/cotizar-envio` (vista previa)
    como `POST /api/checkout` (autoridad real — nunca confía en la cotización que vio el cliente).
  - `src/lib/shipit.ts` (nuevo en la Fase 4, **borrado en v6**): cliente de Shipit (`buscarComunaId()`,
    `cotizarTarifasShipit()`). La API real sí se pudo verificar contra documentación pública
    (developers.shipit.cl) — a diferencia de Flow/OpenFactura en la Fase 3 — pero sin token real
    nunca se llegó a probar de punta a punta antes de descartarlo.
  - `POST /api/cotizar-envio` (nuevo), `crearPedido()` ya no calcula envío internamente (lo recibe
    resuelto del llamador).
  - `src/components/formulario-checkout.tsx`: paso nuevo "Calcular envío" antes de habilitar
    "Pagar"; se invalida si el cliente edita la dirección después de cotizar.
  - **Probado real de punta a punta en el navegador** (única parte de las Fases 3-4 que no depende
    de credenciales): dirección cerca de la tienda → LOCAL con el valor de `COSTO_ENVIO_PLANO`.

## Estado: qué está HECHO (Fase 3)
- Checkout de invitado + pago con Flow + boleta electrónica con OpenFactura (ver
  `docs/CHANGELOG-V03.md` para el detalle completo):
  - `src/lib/pedidos.ts`: `crearPedido()`, `obtenerPedidoPorNumero()`, `guardarPagoFlow()`,
    `marcarPedidoFallido()`, `guardarDatosBoleta()`, `marcarPedidoPagado()` (mutex
    `CREADO→PAGADO` contra reintentos del webhook de Flow).
  - `src/lib/flow.ts` / `src/lib/openfactura.ts`: clientes de Flow y OpenFactura. **Sin verificar
    contra las APIs reales** (no hay credenciales) — ver TODO marcados en ambos archivos y sección
    "Pendiente" abajo.
  - `src/lib/pos-interno.ts`: llama a `POST /api/interno/ajustar-stock`, ruta **nueva** que se
    agregó a `sevelin-pos-oficial/api/index.js` (no existía, quedó pendiente desde la Fase 0 del
    POS — ver `sevelin-pos-oficial/docs/CHANGELOG-V25.md`).
  - `supabase/02-numeracion-pedidos.sql`: numeración atómica de pedidos (`generar_numero_pedido()`).
  - `POST /api/checkout`, `POST /api/flow-webhook`, `GET /api/pedido/:numero`: Route Handlers
    nuevos, mismas convenciones que los existentes.
  - `src/app/checkout/page.tsx` + `src/components/formulario-checkout.tsx`, `src/app/pedido/[numero]/page.tsx`:
    frontend del checkout y de estado del pedido. Botón "Ir a pagar" del carrito ya no está
    deshabilitado.

## Estado: qué está HECHO (Fase 2)
- Frontend público completo (ver `docs/CHANGELOG-V02.md` para el detalle):
  - `src/context/carrito-context.tsx`: carrito en `localStorage` (sin cuentas de cliente, checkout
    como invitado), `CarritoProvider` / `useCarrito()`.
  - `src/components/`: `header.tsx` (categorías, buscador, carrito, menú móvil), `carrito-drawer.tsx`
    (drawer lateral, solo subtotal — sin envío, botón de pago deshabilitado hasta la Fase 3/4),
    `tarjeta-producto.tsx`, `galeria-producto.tsx`, `acciones-producto.tsx`, `hero-carrusel.tsx`
    (3 slides fijos, sin gestión de banners — fuera de alcance a propósito), `franja-confianza.tsx`,
    `whatsapp-flotante.tsx`, `footer.tsx`.
  - `src/app/page.tsx` (home: hero + destacados + franja), `src/app/productos/page.tsx` (listado con
    filtro de categoría y búsqueda), `src/app/productos/[sku]/page.tsx` (ficha de producto).
  - `src/lib/catalogo.ts`: `listarCategorias()`, `buscarCatalogo({ categoria, q })` (con
    sanitización del texto de búsqueda antes de armar el filtro `.or()` de PostgREST).
  - `src/lib/formato.ts`: `formatoCLP` compartido (antes duplicado en `page.tsx`).
  - `NEXT_PUBLIC_WHATSAPP_NUMBER` (`56935750828`) y `NEXT_PUBLIC_INSTAGRAM_URL`
    (`https://instagram.com/sevelin.cl`): datos reales de contacto, ya configurados en
    `.env.local.example` y `.env.local`. Si se dejan vacíos, el botón flotante de WhatsApp y el
    enlace de Instagram del footer se ocultan en vez de mostrar un dato inventado.
  - Navegación por categoría es un **filtro plano** (no mega-menú jerárquico): el schema de
    `productos_web` no tiene subcategoría — decisión confirmada con el usuario, ver changelog.

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

## Pendiente (real, verificado al 29-08-2026 — no repetir lo ya hecho)

**Notificaciones (correo/WhatsApp) — lo más reciente, v16:**
1. **Verificar un dominio propio en Resend** (dashboard.resend.com, cuenta con
   `sevelin.contacto@gmail.com`). Mientras se use el dominio de prueba (`onboarding@resend.dev`),
   **los correos a clientes reales fallan en silencio** — ese dominio solo entrega a la cuenta que
   creó la API key. Agregar 2-3 registros DNS donde esté administrado `sevelin.cl` (no requiere
   mover el dominio ni tocar que hoy apunte a Tiendanube).
2. **Confirmar que `NEXT_PUBLIC_PRIVACIDAD_EMAIL` en Vercel no siga con el valor viejo**
   (`pcgoldchile@gmail.com`) — pisaría el default nuevo del código (`sevelin.contacto@gmail.com`).
3. **Decisión sobre WhatsApp** (notificar cancelación/confirmación también por ahí): requiere
   verificación de Meta Business Manager, sin atajo gratis — no confundir con automatizar un
   WhatsApp Web personal, que viola los términos de servicio y arriesga que baneen el número.

**Ley 21.719 — lo que queda es operativo, no de código:**
4. **Prueba de restauración de respaldo, documentada.** La letra c) del Art. 14 quinquies exige la
   *capacidad* de restaurar, y una capacidad nunca probada no se puede acreditar. Restaurar un
   respaldo de Supabase a un proyecto de prueba, verificar que las tablas vuelven completas, y
   anotar fecha y resultado en la bitácora de `docs/POLITICA-SEGURIDAD-DATOS.md`. Es el único
   requisito técnico del cumplimiento que sigue abierto.
5. **Antes del 01-12-2026:** revisar en qué canal concreto la Agencia recibirá los reportes del
   Art. 14 sexies (a la fecha de redacción no los ha publicado) y anotarlo en
   `docs/PROCEDIMIENTO-INCIDENTES-DATOS.md`. Revisión anual de seguridad agendada para el
   29-08-2027 (lista de chequeo ya escrita en ese mismo documento).
6. **Validación jurídica externa** — todo lo de Ley 21.719 es implementación técnica de buena fe
   contra el texto de la BCN, no asesoría legal. Conviene que un abogado revise el texto final de
   `/privacidad` y `/terminos`, y un contador confirme el criterio de conservación tributaria que
   se publicó ("mientras esté pendiente el plazo de revisión del SII, por regla general tres
   años"). **Ya verificado y NO pendiente:** no existe obligación de inscribirse ante la Agencia
   para un responsable privado común.
7. **Cuando se implemente la creación real de envíos con Chilexpress**: hoy la política declara que
   solo se le consulta la tarifa de la comuna, lo cual es cierto. Al crear envíos de verdad pasará
   a recibir nombre, dirección y teléfono → hay que actualizar `/privacidad` y subir la versión de
   la política **antes** de ese cambio, no después.

**Resto de pendientes:**
8. **Confirmar el plan de Vercel del proyecto (Hobby vs Pro)** — el cron de recordatorio de carrito
   abandonado (`vercel.json`, v19) quedó programado cada 15 minutos, pero Hobby limita los cron jobs a
   una vez al día. Si es Hobby, el recordatorio va a llegar mucho más tarde de lo pensado (o hay que
   ajustar el diseño) — ver `docs/CHANGELOG-V19.md`. Ambos proyectos ya están en Vercel (confirmado
   31-08-2026), falta solo el plan.
9. **Chilexpress — código validado de punta a punta, documentación oficial encontrada, camino claro
   para producción (actualizado 31-08-2026).** El dueño consiguió 3 suscripciones reales del portal de
   Chilexpress (Coberturas, Cotizador, Envíos), cada una con su propia llave. Contra
   `services.wschilexpress.com` (producción) las 3 dieron 401 en casi todo — pero contra
   `testservices.wschilexpress.com` (ambiente de PRUEBAS) las 3 funcionaron perfecto, incluida la
   cotización real de tarifa:
   - **API-COBERTURAS-CHILEXPRESS confirmada** — resuelve comuna → countyCode. El mapeo de las 16
     regiones (`src/lib/chilexpress-regiones.ts`) pasó de "inferido probando comuna por comuna" a
     **confirmado oficial**: el dueño encontró que developers.wschilexpress.com/api-details tiene
     documentación pública real (sin necesitar login) — `GET /georeference/api/v1.0/regions` devuelve
     el listado completo con el código exacto de cada región, coincide 100% con lo inferido antes.
   - **API-COTIZADOR-CHILEXPRESS confirmada** — `rating/api/v1.0/rates/courier` respondió con tarifas
     reales de prueba. Dos hallazgos de esa misma documentación oficial: (a) `serviceValue` viene como
     TEXTO ("15172"), no número — bug real corregido, el código original (adivinado de un plugin de
     WooCommerce) lo comparaba con `<` sin convertir, habría elegido mal la tarifa "más barata"; (b)
     **`declaredWorth` es un campo OBLIGATORIO** (el valor declarado del paquete) — antes se mandaba
     `0` fijo sin poder confirmarlo, ahora `agregarPaquete()` en `envio.ts` calcula el valor real del
     carrito (precio_web × cantidad) y se lo pasa a Chilexpress.
   - **Camino claro para producción**: la página "¿Cómo me integro?" del portal (pública, sin login) lo
     explica directo — con una TCC ya asociada (el dueño la vinculó el 31-08-2026 a su cuenta de Portal
     Empresa, cuenta 1215422), el siguiente paso es escribir a **soporteintegraciones@chilexpress.cl**
     solicitando las credenciales productivas y la habilitación de la cuenta empresa. Chilexpress
     promete responder **dentro de 24 horas** con las credenciales reales por correo. **No poner
     `CHILEXPRESS_API_KEY_COTIZADOR` en Vercel todavía** con las llaves de prueba — mostraría un precio
     falso a un cliente real en vez de la tarifa referencial (`COSTO_ENVIO_CHILEXPRESS_MOCK`). Cuando
     lleguen las credenciales productivas: cambiar `CHILEXPRESS_API_BASE` a
     `services.wschilexpress.com` y poner las 3 keys nuevas en Vercel — el código ya no necesita más
     cambios.
10. **Flow en producción**: `POST /payment/create` está verificado solo contra **sandbox**. Falta (a)
    cambiar a credenciales de producción reales en Vercel cuando el usuario las tenga, (b) probar el
    flujo completo con un pago real (`getStatus`/`FLOW_ESTADO_PAGADO` nunca se confirmaron contra un
    pago completado de verdad, solo contra la creación de la orden).
11. **Productos que llegaron sin SKU YA se pueden publicar** (v16, sync ya no lo exige) — sigue
    pendiente curar el catálogo: clasificarlos/marcarlos `publicado_web=true` desde el modal del POS
    si se quiere que se vean en la tienda. Ya no es un bloqueo técnico.
12. **Algunos productos con SKU sin foto real** (no tenían coincidencia confiable en `sevelin.cl`) —
    subirles foto a mano desde el modal del POS.
13. **Dominio `sevelin.cl` sigue apuntando a Tiendanube**, no a esta tienda nueva (que vive en su URL
    de Vercel) — decidir cuándo hacer el cambio de DNS, y qué pasa con la tienda Tiendanube vieja
    (¿se da de baja, se deja como respaldo?).
14. ~~OpenFactura~~, ~~Shipit~~, ~~migraciones SQL~~, ~~despliegue Vercel~~, ~~webhook del POS~~,
    ~~primera carga del catálogo~~, ~~sistema de cuentas de cliente~~, ~~confirmar SUPABASE_WEB_URL
    en el POS~~, ~~banners de categoría con placeholder~~ — todo esto ya no es pendiente, quedó
    resuelto en sesiones anteriores (ver versiones abajo).

## Cómo probar (mientras no haya Supabase Web real)
- `npm run build`: compila TypeScript, corre el linter implícito, prerenderiza `/` (con manejo de
  error si Supabase no está configurado — no rompe el build).
- `npm run lint`: ESLint.
- `npm run dev` + Browser pane (sí hay Chromium disponible en el entorno de la Fase 2, a diferencia
  de la Fase 0/1): sirve para ver hero/header/drawer/estados de error reales. Sin un Supabase Web
  real no se ven productos reales — para probar el carrito con contenido, sembrar un carrito de
  prueba directo en `localStorage` (clave `sevelin-carrito`, ver `docs/CHANGELOG-V02.md` sección 6
  para el formato exacto de los items). El checkout (`/checkout`) se prueba igual, sembrando el
  carrito; el submit real contra `POST /api/checkout` falla con el error real de Supabase (faltan
  las migraciones) sin Supabase Web con las tablas creadas, pero sirve para confirmar que el
  formulario, el manejo de errores y el botón "Calcular envío" funcionan de punta a punta: comuna
  "Arica" → aparecen las 2 opciones (retiro/local) para elegir; cualquier otra comuna → una tarifa
  Chilexpress (mock mientras no haya API key) — ver `docs/CHANGELOG-V06.md` sección 7.
- No hay suite de tests versionada en el repo todavía (mismo criterio ad hoc que el POS): se verificó
  con un doble en memoria de Supabase (monkey-patch del cliente ya creado, no del import) en un
  archivo temporal, corrido con `npx tsx` y borrado después — ver `docs/CHANGELOG-V01.md` para el
  detalle de qué se probó en la Fase 1.

## Trampas ya descubiertas (no repetir)
- **`isomorphic-dompurify` (jsdom) NO es confiable en el serverless de Vercel** — ni con
  `serverExternalPackages` ni con `import()` diferido dentro de un `try/catch`: el import puede
  fallar en tiempo de EJECUCIÓN ahí (nunca en local, ni con `next dev` ni con `next start`), y si el
  código solo lo atrapa con un `catch` sin verificarlo aparte, el síntoma es silencioso — la página
  no se cae, pero el sanitizador nunca corre de verdad, cayendo siempre al texto plano de respaldo.
  Se reemplazó por `sanitize-html` (JS puro, sin jsdom). Cualquier librería que dependa de jsdom en
  una Route Handler/Server Component de este proyecto es sospechosa por defecto — probarla con
  `next build && next start` (no `next dev`) antes de confiar en que funciona en Vercel.
- Al escapar texto plano antes de convertirlo en HTML, **escapar el "&" a ciegas rompe las
  entidades HTML reales** que algunas descripciones traen literales ("2&times; HDMI", "-5&deg;"):
  quedan como el texto "&amp;times;" en vez de decodificarse a "×". La función que arma HTML para
  re-sanitizar (`escaparParaSanitizar`, en `escapar-html.ts`) deja pasar el "&" cuando tiene pinta de
  entidad real (`&nombre;` o `&#123;`) y solo escapa los "&" sueltos.
- **NUNCA codificar a mano la coordenada de origen de la tienda, ni sacarla de un
  geocodificador.** Un origen equivocado corre TODAS las tarifas de envío a la vez y es un
  error invisible: los precios salen plausibles, solo que mal. Pasó dos veces en la misma
  sesión (v17): las coordenadas escritas de memoria quedaron a 4,7 km del local, y al
  geocodificar "San Rafael 896, Arica" Nominatim devolvió un punto ~4 km al norte. Las buenas
  (`-18.4619, -70.2976`, confirmadas por el dueño desde Google Maps) están fijas en
  `src/lib/distancia.ts`.
- **Nominatim ignora la numeración en caminos rurales** y ancla el punto al INICIO del camino:
  "Camino Azapa 5000" resolvía a 2,6 km de la tienda. El error siempre subestima, o sea cobra
  de menos. Por eso los valles no se geocodifican: el cliente declara el kilómetro.
- **OSRM espera las coordenadas como `lon,lat`**, al revés de lo habitual. Invertirlas da rutas
  silenciosamente equivocadas, no un error.
- **Nominatim exige un `User-Agent` que identifique la app** y permite 1 petición por segundo;
  sin eso bloquean. `router.project-osrm.org` es su servidor de demostración: sirve para el
  volumen de una tienda chica pero no da garantías, así que el código degrada en vez de romper.
- **`line-clamp-N` necesita que la altura de la caja sea múltiplo exacto del interlineado.** Con
  `min-h-[2.5rem]` (40px) y `leading-tight` (17,5px/línea) sobran 5px y asoma el borde de la
  línea siguiente. Además el *font boosting* de Android puede romper `line-clamp` del todo, así
  que la altura fija es la que realmente garantiza el recorte.
- Al medir un supuesto desborde horizontal en móvil, comparar
  `document.documentElement.scrollWidth` con el viewport ANTES de tocar nada: lo que se veía
  cortado en el checkout era un recorte del panel de vista previa, no de la página.
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
- **Estado que viene de `localStorage` (carrito) nunca va en el inicializador `lazy` de `useState`**:
  el servidor no tiene `localStorage`, así que si el primer render del cliente ya trae el valor
  guardado, difiere del HTML que mandó el servidor (que partió vacío) y React marca un hydration
  mismatch. Va en un `useEffect` que corre después de montar — un re-render extra es aceptable, un
  mismatch no.
- El filtro `.or()` de PostgREST (usado en `buscarCatalogo` para buscar por nombre/SKU) usa
  coma/paréntesis/punto como separadores estructurales del filtro compuesto. Un texto de búsqueda de
  usuario con esos caracteres tal cual puede romper o alterar el filtro — sanitizar antes de
  interpolarlo (ver `src/lib/catalogo.ts`).
- Un error de conexión a Supabase en `/productos/[sku]` (sin `try/catch`) da un 500 crudo en vez del
  mismo fallback de "catálogo no disponible" que usan home y listado — hay que capturarlo ahí
  también, no solo en las páginas de listado.
- Un `next dev` dejado corriendo varias horas entre sesiones (puerto 3000 ocupado por un PID viejo)
  puede degradar hasta crashear con "Jest worker encountered N child process exceptions" al primer
  cambio nuevo — no es un bug del código, es el proceso de dev acumulando estado de HMR. Si
  `preview_start` reporta el puerto 3000 ocupado y no es un servidor nuestro reconocible, matar ese
  PID y levantar de nuevo resuelve el problema (mismo criterio: siempre revisar qué es el proceso
  antes de matarlo, no asumir).
- El mutex `UPDATE ... WHERE estado='CREADO'` (`marcarPedidoPagado()`) depende de que nada más
  cambie `pedidos_web.estado` entre `CREADO` y `PAGADO` por otro camino. Si en una fase futura se
  agrega alguna forma de cancelar un pedido en `CREADO` (ej. un cron de limpieza), hay que revisar
  que no compita con este mutex.
- **(Histórico, ya no aplica desde v6 — Shipit se descartó)** Shipit cotizaba por comuna
  (`GET /v/communes`), no por dirección exacta ni coordenadas, lo que en su momento obligó a
  geocodificar con Nominatim para el radio de 10 km. Chilexpress (su reemplazo) también cotiza por
  comuna, pero el modelo de envío ya no depende de distancia — ver "v6" arriba.
- Chilexpress cotiza por región + comuna (`countyCode`), no hay un listado plano de toda su
  cobertura como el `GET /v/communes` de Shipit — resolver el `countyCode` de una comuna cualquiera
  necesita saber primero su código de región en el sistema de Chilexpress, que no se pudo mapear
  sin acceso real a la API (ver `docs/CHANGELOG-V06.md` punto 2, TODO en `src/lib/chilexpress.ts`).
- `developers.wschilexpress.com` es una SPA sin contenido estático accesible por herramientas de
  lectura automática (a diferencia de developers.shipit.cl) — para Chilexpress hubo que sacar los
  endpoints reales del código fuente de su plugin oficial de WooCommerce en GitHub en vez de su
  portal de documentación.
- La firma de Flow descrita en el README maestro ("ordenar alfabéticamente, concatenar
  `clave=valor`, HMAC-SHA256") es **incorrecta** — el `=` no va. La forma real, verificada contra
  developers.flow.cl, es concatenar `claveValor` sin separador (ej. `amount5000apiKeyXXXX`). Ver
  `docs/CHANGELOG-V05.md`. Cualquier otro campo de Flow que se agregue en el futuro, verificar
  contra la documentación real antes de asumir lo que dice el README maestro.
- `SUPABASE_WEB_URL` necesita la URL completa (`https://<ref>.supabase.co`), no solo el project
  ref — con solo el ref, `createClient()` no puede conectarse y falla con `TypeError: fetch failed`,
  un error genérico que no deja claro cuál es el problema real.
- **Resend con el dominio de prueba (`onboarding@resend.dev`) solo entrega a la cuenta que creó la
  API key** — un envío a cualquier otro correo devuelve 200 igual pero nunca llega, hasta verificar
  un dominio propio. No confundir "el código funciona" (probado con un envío real) con "ya le llega
  a los clientes" (no, hasta verificar dominio).
- El POS administraba un árbol de categoría→subcategoría (`producto_categorias.parent_id`) desde
  antes de que la tienda supiera nada de eso — un producto con SUBcategoría elegida guardaba el
  nombre de la subcategoría directo en `categoria_web` (texto plano), no el de la categoría padre,
  así que quedaba huérfano del filtro plano de categorías principales. La resolución (subir hasta
  el ancestro de nivel superior para `categoria_web`, y mandar la subcategoría aparte) tiene que
  pasar en el POS al guardar, no asumir que `categoria_web` siempre es de nivel superior.
- El contenido de la Descripción ahora puede traer HTML real (Quill) en vez de solo texto plano —
  cualquier lugar que lo renderice tiene que sanitizar antes de `dangerouslySetInnerHTML` (ver
  `src/lib/sanitizar-html.ts`). Las descripciones viejas (texto plano, de antes de Quill) siguen
  siendo válidas: no tienen tags que sanitizar, y `whitespace-pre-line` les preserva los saltos de
  línea igual que antes.
