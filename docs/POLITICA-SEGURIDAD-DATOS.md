# Política de seguridad de datos personales — Sevelin

> **Documento interno.** No se publica en la tienda. Su función es poder *acreditar* el
> cumplimiento: el inciso final del Art. 14 quinquies de la Ley 21.719 pone la carga de la prueba
> en el responsable ("corresponderá al responsable acreditar la existencia y el funcionamiento de
> las medidas de seguridad adoptadas"). Lo que se publica de cara al cliente es la sección "Cómo
> protegemos tus datos" de `/privacidad`, en un nivel de detalle deliberadamente menor: publicar el
> inventario técnico completo no lo exige la ley y sí ayudaría a quien quisiera atacarnos.

- **Responsable de datos:** Carlos Silva, RUT 21.961.387-3.
- **Encargado del cumplimiento en la práctica:** Carlos Silva (Administrador). No hay encargado de
  prevención designado — la letra b) del Art. 14 ter solo obliga a identificarlo "si existiere".
- **Alcance:** el storefront `sevelin-tienda` y su base de datos propia (Supabase Web,
  `productos_web` / `pedidos_web` / `perfiles_clientes` / `solicitudes_arco`). El POS
  (`sevelin-pos-oficial`) es un sistema separado con su propio alcance.
- **Versión:** 1.0 · **Vigente desde:** 29-08-2026 · **Próxima revisión:** 29-08-2027.

---

## 1. Estándar aplicable: proporcionalidad (Art. 14 septies)

El Art. 14 septies ordena que los estándares mínimos de los deberes de información (14 ter) y de
seguridad (14 quinquies) se determinen considerando el tipo de dato, si el responsable es persona
natural o jurídica, **el tamaño de la empresa según el artículo segundo de la ley N° 20.416**, la
actividad que desarrolla y el volumen, naturaleza y finalidades de los datos tratados.

Sevelin es una microempresa de venta de computación, persona natural, que trata datos de contacto y
despacho de un volumen bajo de compradores, sin datos sensibles. Ése es el estándar contra el que
se midieron las medidas de este documento: son las adecuadas al riesgo real, no las de una
plataforma masiva. Cualquier medida que se decida no implementar debe justificarse acá, no
simplemente omitirse.

---

## 2. Datos tratados y dónde están

| Dato | Dónde vive | Ubicación física |
|---|---|---|
| Correo, contraseña cifrada, sesión | Supabase Auth (`auth.users`) | AWS `sa-east-1` — São Paulo, **Brasil** |
| Nombre, apellido, teléfono, consentimientos | `perfiles_clientes` | Ídem |
| Pedido: contacto, dirección de envío, ítems, montos, datos de factura | `pedidos_web` | Ídem |
| Registro de solicitudes sobre datos personales | `solicitudes_arco` | Ídem |
| Datos del formulario, en tránsito, y logs de solicitud | Vercel (renderizado y Route Handlers) | Infraestructura hospedada en **Estados Unidos** |

**Transferencia internacional:** existe y está declarada en `/privacidad`, como exige la letra h)
del Art. 14 ter. No se afirma que estos países cuenten con nivel adecuado de protección, porque esa
determinación corresponde a la Agencia (Art. 28) y a esta fecha no ha sido emitida.

**Lo que NO sale de acá:**

- Datos de tarjeta: nunca llegan a este sistema. Los trata Flow, que recibe únicamente el correo
  del cliente, el monto y el número de pedido (`src/lib/flow.ts`).
- Chilexpress recibe hoy solo códigos de comuna y medidas del bulto para cotizar tarifa
  (`src/lib/chilexpress.ts`). **El día que se implemente la creación de envíos reales pasará a
  recibir nombre, dirección y teléfono: hay que actualizar `/privacidad` ANTES de ese cambio.**
- El POS recibe solo `producto_id` y `cantidad` para descontar stock (`src/lib/pos-interno.ts`).
- No hay analítica, píxeles ni cookies de terceros. La única cookie es la de sesión de Supabase
  Auth. Las tipografías se auto-hospedan en el build (`next/font/google`), el navegador del cliente
  nunca llama a Google.

---

## 3. Art. 14 quáter — protección desde el diseño y por defecto

Decisiones de diseño ya tomadas, con su evidencia en el código:

| Decisión | Dónde |
|---|---|
| No se piden datos de tarjeta: el pago se delega íntegro a Flow | `src/lib/flow.ts` |
| No se pide el RUT personal del comprador para la boleta | formulario de checkout |
| Comprar no obliga a crear cuenta (checkout de invitado completo) | `src/app/checkout` |
| La casilla de consentimiento va **desmarcada** por defecto y se valida también en el servidor | checkout y registro |
| El consentimiento de marketing es una casilla **separada** y opcional; rechazarlo no impide comprar | `perfiles_clientes.consentimiento_marketing` |
| Solo se recolectan los campos necesarios para despachar y facturar | `supabase/01`, `05` |
| El SKU nunca se expone al cliente; el código de barras nunca viaja a este proyecto | `src/components/tarjeta-producto.tsx` |
| La eliminación de cuenta anonimiza los pedidos anteriores en vez de romper la contabilidad | `POST /api/cuenta/eliminar` |

---

## 4. Art. 14 quinquies — medidas de seguridad

El artículo enumera cuatro capacidades. Estado real de cada una:

### a) Seudonimización y cifrado

- Contraseñas cifradas por Supabase Auth; nunca se almacenan ni se registran en texto plano.
- Todo el tráfico va sobre HTTPS (Vercel y Supabase lo fuerzan).
- Cifrado en reposo del almacenamiento gestionado de Supabase.
- Anonimización real al eliminar una cuenta: los pedidos pasados pierden el vínculo con la persona.
- **No aplicado:** cifrado a nivel de columna. Justificación: no se tratan datos sensibles y
  agregarlo impediría operar los pedidos sin reducir un riesgo real. Art. 14 septies.

### b) Confidencialidad, integridad, disponibilidad y resiliencia

- RLS activo en todas las tablas. `productos_web` y `pedidos_web` **sin políticas públicas de
  escritura**: solo la `service_role` las toca.
- La `service_role` vive únicamente en variables de entorno del servidor. Nunca en código
  `'use client'`, nunca bajo un prefijo `NEXT_PUBLIC_`. El navegador solo ve la anon key.
- `perfiles_clientes` y la lectura de `pedidos_web` están acotadas por `auth.uid()`
  (`supabase/06-clientes-web.sql`): un cliente no puede leer los datos de otro.
- El webhook de sincronización desde el POS exige el header `x-sync-secret`
  (`POST /api/sync/producto`).
- Integridad de la operación: numeración de pedidos atómica (`supabase/02`), mutex
  `CREADO → PAGADO` contra reintentos del webhook de Flow, y el costo de envío se **recalcula en el
  servidor** — nunca se confía en el monto que manda el cliente (`src/lib/envio.ts`).
- Disponibilidad: infraestructura gestionada, con respaldos automáticos de Supabase.

### c) Restauración rápida ante incidente

- Los respaldos automáticos de Supabase son el mecanismo de restauración.
- **Pendiente y exigible:** el artículo pide la *capacidad* de restaurar, y una capacidad no
  probada no es acreditable. Hay que hacer una **prueba de restauración documentada** (restaurar un
  respaldo a un proyecto de prueba, verificar que las tablas vuelven completas, anotar fecha y
  resultado en la bitácora del punto 6) y repetirla en cada revisión anual.

### d) Verificación y evaluación periódica

Revisión **anual**, y además cada vez que se agregue un proveedor nuevo que reciba datos personales
o cambie el modelo de datos. Lista de chequeo:

1. ¿Las variables de entorno con secretos siguen siendo solo del servidor?
2. ¿Alguna tabla nueva quedó sin RLS o con una política más amplia de lo necesario?
3. ¿Hay algún proveedor nuevo recibiendo datos personales que no esté en `/privacidad`?
4. ¿Sigue siendo cierto todo lo que dice `/privacidad`? (en especial la sección de Chilexpress)
5. ¿Se hizo la prueba de restauración de respaldo del año?
6. ¿Quién tiene acceso al panel de Supabase y de Vercel? ¿Sigue correspondiendo?
7. ¿Se respondieron dentro de plazo todas las solicitudes de `solicitudes_arco`?

---

## 5. Art. 15 ter — por qué NO corresponde una evaluación de impacto

La evaluación de impacto se exige cuando el tratamiento pueda producir **alto riesgo**, y siempre
en los cuatro casos que enumera el artículo. Ninguno concurre:

| Supuesto del Art. 15 ter | Situación de Sevelin |
|---|---|
| a) Evaluación sistemática y exhaustiva basada en decisiones automatizadas o perfiles, con efectos jurídicos significativos | No existe. No hay scoring, segmentación, precios personalizados ni decisión automatizada alguna. |
| b) Tratamiento masivo o a gran escala | No. Volumen de una tienda local: decenas de pedidos, no millones de titulares. |
| c) Observación o monitoreo sistemático de zona de acceso público | No aplica. |
| d) Datos sensibles bajo excepción del consentimiento | No se tratan datos sensibles, y la base es el consentimiento explícito más la ejecución del contrato. |

**Conclusión: no corresponde EIPD.** Si en el futuro se incorpora recomendación automatizada,
segmentación de clientes, precios dinámicos o cualquier forma de perfilamiento, este análisis queda
sin efecto y hay que rehacerlo **antes** de poner el tratamiento en marcha.

---

## 6. Bitácora de revisiones y pruebas

| Fecha | Qué se hizo | Resultado | Quién |
|---|---|---|---|
| 29-08-2026 | Redacción inicial de este documento; auditoría del Art. 14 ter contra `/privacidad`; verificación de la región real de la base de datos | Brechas de las letras a, d, g, h, i, j, k, l corregidas en la versión 1.2 de la política | Carlos Silva |
| _pendiente_ | Prueba de restauración de respaldo (punto 4.c) | — | Carlos Silva |
