# Webpay Plus: validación con Transbank y paso a producción

Estado al 13-10-2026. Contrato firmado ese día (folio 676755: "Ventas por Internet" y "Webpay Plus -
Webservices"). El código de comercio todavía no llega: en el contrato ese campo está en blanco.

## El camino completo

| Paso | Qué es | Quién | Estado |
|---|---|---|---|
| 1 | Hazte cliente y firma del contrato | Carlos | Hecho el 13-10-2026 |
| 2 | Código de comercio (12 dígitos, empieza con 5970) | Transbank lo manda por correo desde `soporte@transbank.cl` | **Esperando** (revisar también spam) |
| 3 | Integración en la tienda | Claude | Hecha, sin publicar (commit `32ce25f`) |
| 4 | Pagos de prueba para la validación | Claude | Hechos el 13-10-2026 (abajo). **Sirven hasta el 20-10-2026** |
| 5 | Formulario de validación | Carlos (con lo de abajo) | Falta: necesita el código del paso 2 |
| 6 | Transbank manda la llave secreta | Transbank, 24 horas hábiles | — |
| 7 | Poner código y llave en Vercel | Carlos (la llave no la escribe Claude) | — |
| 8 | Compra real de $50 | Carlos, con su tarjeta | — |

Transbank rechaza la validación si los pagos de prueba tienen más de 7 días. Si el código llega
después del 20-10-2026, hay que repetir el paso 4 (son 10 minutos).

## Paso 5: el formulario

Hay dos entradas y sirve cualquiera. Las dos piden lo mismo.

- Nuevo: <https://validador.transbankdevelopers.cl>
- Antiguo: <https://form.typeform.com/to/ibXdg6Av> (el de "SDK o API"; el otro es para plugins)

| Pregunta | Respuesta |
|---|---|
| Código de comercio | El que llegue por correo. Si trae 8 dígitos, se le antepone `5970` |
| RUT asociado | El tuyo, sin puntos y con guion |
| Nombre, correo y teléfono | Los tuyos |
| ¿Validas para un PSP? | No |
| ¿Eres integrador? | No |
| Logo (GIF o PNG de 130x59) | `docs/transbank/logo-sevelin-130x59.png` |
| ¿Aplicación nativa para teléfonos? | No |
| ¿Tu sitio cumple los requisitos? | Sí, cumplo con todos los requisitos |
| URL para revisar el e-commerce | `https://sevelin.cl` |
| URL de producción | `https://sevelin.cl` |
| Moneda | Pesos Chilenos (CLP) |
| Tipo de desarrollo | Desarrollo propio usando el API de Transbank |
| Lenguaje | Node.js |
| Producto | Webpay Plus |
| ¿Implementaste anulaciones (refunds)? | No |

### Los 6 pagos de prueba

Hechos en el ambiente de integración (código de comercio de pruebas `597055555532`), desde la tienda
corriendo en este computador. En cada casilla se pega el **token**.

| Lo que pide el formulario | Token |
|---|---|
| Crédito, sin cuotas, **aprobar** | `01ab1eae01068a43f5fd7de667fa0f9e8b32480f857a30e58e8e1e8b3e7f0222` |
| Crédito, sin cuotas, **rechazar** | `01abcd76b6a6514bfdd0ca8b0bffaad52a9529f1fcaf87aa3f9908501e208f12` |
| Crédito, con cuotas, **aprobar** | `01ab3b71ab83e91a801106fe686e03f25db6bb65c83d7ca8e2ba75d3399965b0` |
| Débito o prepago, **aprobar** | `01ab7c475d7e9be9a1950949f43b73bece9ffcdf1d76f43fc0275dc599334b55` |
| Débito o prepago, **rechazar** | `01abb632e9cd2275bcb160be72d150824823d5b6c84f2e8a5b911456951e93ae` |
| Transacción **cancelada** ("Anular compra y volver") | `01ab9c61edd3afa1e6c875eddcdb56cf1b8f484fc216064a7a0f294c96f748d0` |

Cómo los tiene registrados Transbank (consultado a su API el mismo día, después de las pruebas):

| Caso | Orden de compra | Estado | Código | Tipo | Cuotas | Autorización | Hora (UTC) |
|---|---|---|---|---|---|---|---|
| Crédito aprobado | `WEB-900001.mv6r206u` | AUTHORIZED | 0 | VN | 0 | 1213 | 14:01:42 |
| Crédito rechazado | `WEB-900001.mv6qxbma` | FAILED | -1 | VN | 0 | — | 13:58:04 |
| Crédito en cuotas | `WEB-900002.mv6r4lcj` | AUTHORIZED | 0 | SI | 3 | 1213 | 14:03:43 |
| Débito aprobado | `WEB-900003.mv6r72sp` | AUTHORIZED | 0 | VD | 0 | 1415 | 14:05:39 |
| Débito rechazado | `WEB-900001.mv6qzr0n` | FAILED | -1 | VD | 0 | — | 13:59:57 |
| Cancelada | `WEB-900001.mv6r1cz5` | INITIALIZED (sin confirmar, como piden) | — | — | — | — | 14:01:12 |

Todos por $4.000. La hora de Chile es 3 horas menos.

### Nota para el último cuadro ("notas adicionales"), si se quiere

> Integración propia en Next.js contra la API REST v1.2. Las pruebas se hicieron en el ambiente de
> integración desde un entorno local de la tienda. En sevelin.cl el pago con Webpay se enciende al
> recibir la llave de producción. Las anulaciones se harán desde el portal de clientes.

## Pasos 7 y 8: encender Webpay

1. El código de la tienda y del POS tiene que estar publicado (hoy no lo está) y aplicadas
   `supabase/42` en la base de la tienda y `sql/91` en la del POS.
2. En Vercel, proyecto de la tienda, ambiente Production:
   `WEBPAY_AMBIENTE=produccion`, `WEBPAY_COMMERCE_CODE` y `WEBPAY_API_KEY_SECRET`. Después, un
   redeploy.
3. Con eso el checkout ofrece Webpay y el link de pago de Haulmer se apaga solo
   (`linkPagoHabilitado()` en `src/lib/link-pago.ts`).
4. Compra real de $50, que exige Transbank para cerrar el trámite. Hace falta un producto de $50
   con retiro en tienda, publicado solo mientras dura la prueba.

## Lo que hay que mirar en el portal de Transbank

- **Cuotas sin interés ("cuotas comercio"): apagadas.** En el ambiente de pruebas, 3 cuotas salen
  "sin interés" porque el comercio de pruebas las tiene activas. Si quedaran activas en el comercio
  real, las paga Sevelin. Las cuotas normales del banco del cliente no cuestan nada.
- **La tarifa.** El contrato no trae la comisión. Lo publicado al 11-10-2026 era 1,49% débito y
  2,29% crédito, más IVA. El POS calcula la comisión de cada venta con esos números.
- **Boleta de garantía.** El contrato la deja en blanco ("solo si procede"). Si la piden, avisar.

## Lo que exige el contrato y cómo se cumple

| Exigencia | Dónde |
|---|---|
| Número de orden único por operación | `ordenDeCompraWebpay()`: pedido + hora, distinta en cada intento |
| Informar el monto total, con despacho | Checkout y página del pedido |
| Comprobante disponible para el cliente | Página del pedido, "Comprobante de pago con tarjeta" |
| Página propia para el rechazo | Página del pedido con `?pago=rechazado` |
| Guardar las operaciones un año | `pedidos_web.pago_detalle` y la venta en el POS |
| Nunca pedir los datos de la tarjeta | Los escribe el cliente en el formulario de Transbank |
