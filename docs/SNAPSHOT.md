# SNAPSHOT — Sevelin Tienda

> Léelo al abrir un chat nuevo. Actualiza SOLO este archivo al cerrar una sesión. El plano de
> arquitectura completo (todas las fases) vive en `README-ECOMMERCE-SEVELIN.md`, en el repo del POS
> (`sevelin-pos-oficial`) — este documento es el estado de ESTE repo (`sevelin-tienda`) nada más.

**Fecha:** 29-08-2026 · **Versión activa:** v15 (cierre de brechas Art. 14 ter + documentos de
seguridad e incidentes — ver "v12-v15" abajo) ·
**En producción:** desplegado en Vercel, dominio `sevelin.cl` **todavía apunta a Tiendanube** (la
tienda nueva vive en la URL de Vercel por ahora — decidir cuándo migrar el DNS, ver "Pendiente").

**Estado real (verificado en producción, no de memoria):** Supabase Web real
(`ekxwavsnocwxtzxqxbbi`) con las **8 migraciones** aplicadas, catálogo con **86 productos reales**
publicados y categorizados en 12 categorías, **75 de esos 86 con fotos reales**, header con
categorías principales fijas + "Más categorías", carrito con toast de confirmación (foto+precio),
paleta de marca azul eléctrico. Flow: `POST /payment/create` **verificado contra sandbox real** (no
producción todavía). Chilexpress: **sigue en mock**, sin API key real. **Cuentas de cliente reales**
(Supabase Auth, `/cuenta/**`) YA IMPLEMENTADAS — revierte la decisión anterior de "sin cuentas".
**Cumplimiento Ley 21.719**: consentimiento explícito + trazabilidad + ARCO + Centro de Privacidad
construidos y probados contra Supabase real, y en v15 se cerraron las brechas del Art. 14 ter
(política v1.2) + se documentaron 14 quáter/quinquies/sexies. Lo que queda es operativo, no de
código (ver "Pendiente" #1-3).

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
  `contacto@sevelin.cl` como valor por defecto en el código, la variable solo lo sobreescribe.
  Documentos internos nuevos (no se publican): `docs/POLITICA-SEGURIDAD-DATOS.md` (mapeo requisito →
  control → evidencia del 14 quinquies, decisiones de diseño del 14 quáter, y la justificación
  escrita de por qué **no** corresponde EIPD) y `docs/PROCEDIMIENTO-INCIDENTES-DATOS.md` (los 9
  pasos del 14 sexies + bitácora con los campos exactos que exige el inciso 2º).

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

**Ley 21.719 — lo que queda es operativo, no de código (v15, 29-08-2026):**
1. **Verificar que el buzón `contacto@sevelin.cl` exista y se lea de verdad.** Es el canal que el
   Art. 11 exige para recibir solicitudes sobre datos personales, y ahora está publicado en
   `/privacidad`. El dominio `sevelin.cl` todavía apunta a Tiendanube (pendiente #12), así que hay
   que confirmar que el correo llega. **Un canal publicado que nadie lee es peor que no tenerlo.**
   Si el buzón no existe, la salida rápida es apuntar la política a un correo que sí se lea (ver
   #2), no dejarla apuntando a uno muerto.
2. **`NEXT_PUBLIC_PRIVACIDAD_EMAIL` NO está configurada en Vercel** (confirmado por el usuario el
   29-08-2026). No es un bug ni bloquea nada: desde v15 el código trae `contacto@sevelin.cl` como
   valor por defecto, así que producción muestra ese correo igual — justamente para que la página
   nunca quede sin canal de contacto. Solo hay que agregar la variable si se quiere publicar una
   dirección distinta (por ejemplo, seguir con la de Gmail mientras el dominio no migre).
3. **Prueba de restauración de respaldo, documentada.** La letra c) del Art. 14 quinquies exige la
   *capacidad* de restaurar, y una capacidad nunca probada no se puede acreditar. Restaurar un
   respaldo de Supabase a un proyecto de prueba, verificar que las tablas vuelven completas, y
   anotar fecha y resultado en la bitácora de `docs/POLITICA-SEGURIDAD-DATOS.md`. Es el único
   requisito técnico del cumplimiento que sigue abierto.
4. **Antes del 01-12-2026:** revisar en qué canal concreto la Agencia recibirá los reportes del
   Art. 14 sexies (a la fecha de redacción no los ha publicado) y anotarlo en
   `docs/PROCEDIMIENTO-INCIDENTES-DATOS.md`. Revisión anual de seguridad agendada para el
   29-08-2027 (lista de chequeo ya escrita en ese mismo documento).
5. **Validación jurídica externa** — todo lo de Ley 21.719 es implementación técnica de buena fe
   contra el texto de la BCN, no asesoría legal. Conviene que un abogado revise el texto final de
   `/privacidad` y `/terminos`, y un contador confirme el criterio de conservación tributaria que
   se publicó ("mientras esté pendiente el plazo de revisión del SII, por regla general tres
   años"). **Ya verificado y NO pendiente:** no existe obligación de inscribirse ante la Agencia
   para un responsable privado común (el Registro Nacional de Sanciones y Cumplimiento anota
   modelos de prevención voluntarios y sanciones, no responsables).
6. **Cuando se implemente la creación real de envíos con Chilexpress**: hoy la política declara que
   solo se le consulta la tarifa de la comuna, lo cual es cierto. Al crear envíos de verdad pasará
   a recibir nombre, dirección y teléfono → hay que actualizar `/privacidad` y subir la versión de
   la política **antes** de ese cambio, no después.

**Resto de pendientes (sin cambios desde sesiones anteriores):**
7. **Chilexpress**: sigue sin API key real, el checkout usa `COSTO_ENVIO_CHILEXPRESS_MOCK` para todo
   envío fuera de Arica. Cuando el usuario consiga las credenciales del convenio corporativo: (a)
   configurar `CHILEXPRESS_API_KEY`/`CHILEXPRESS_API_BASE`/`CHILEXPRESS_ORIGIN_COUNTY_CODE` en
   Vercel, (b) resolver el TODO de `src/lib/chilexpress.ts` (mapear comuna → `countyCode`, nunca
   verificado contra la API real), (c) confirmar el contrato completo (se implementó a partir del
   código fuente del plugin de WooCommerce de Chilexpress, no de documentación oficial).
8. **Flow en producción**: `POST /payment/create` está verificado solo contra **sandbox**. Falta (a)
   cambiar a credenciales de producción reales en Vercel cuando el usuario las tenga, (b) probar el
   flujo completo con un pago real (`getStatus`/`FLOW_ESTADO_PAGADO` nunca se confirmaron contra un
   pago completado de verdad, solo contra la creación de la orden).
9. **28 productos sin SKU** en el POS quedan sin publicar (el receptor de sync exige SKU) — hay que
   cargarles SKU desde el modal de producto del POS. Lista completa en
   `sevelin-pos-oficial docs/CHANGELOG-V29.md` (o el changelog de la sesión que hizo la clasificación
   masiva).
10. **10 productos con SKU sin foto real** (no tenían coincidencia confiable en `sevelin.cl`) — subirles
   foto a mano desde el modal del POS.
11. **Banners de categoría del home siguen con placeholder** ("Foto de X pendiente") — subir fotos
   reales de Monitores/Componentes PC/Periféricos (no hay mecanismo de carga todavía, hay que
   decidir cómo: ¿reusar el pipeline de fotos de producto, o algo aparte?).
12. **Dominio `sevelin.cl` sigue apuntando a Tiendanube**, no a esta tienda nueva (que vive en su URL
    de Vercel) — decidir cuándo hacer el cambio de DNS, y qué pasa con la tienda Tiendanube vieja
    (¿se da de baja, se deja como respaldo?).
13. Confirmar en el POS (Vercel) que `SUPABASE_WEB_URL`/`SUPABASE_WEB_SERVICE_ROLE_KEY` y
    `SYNC_SECRET` están configurados — hubo un episodio de "fetch failed" en el panel Pedidos Web por
    estas variables faltantes, se dieron instrucciones para agregarlas pero no se reconfirmó que
    quedaran puestas.
14. ~~OpenFactura~~, ~~Shipit~~, ~~migraciones SQL~~, ~~despliegue Vercel~~, ~~webhook del POS~~,
    ~~primera carga del catálogo~~, ~~sistema de cuentas de cliente~~ — todo esto ya no es
    pendiente, quedó resuelto en sesiones anteriores (ver versiones abajo).

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
