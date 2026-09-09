# Plan: precio diferenciado por medio de pago (transferencia vs. tarjeta)

> ## ⚠️ ESTADO AL 09-09-2026: CONSTRUIDO, PROBADO Y **APAGADO**
>
> Todo lo que este documento describe está implementado y verificado en el navegador, pero
> `RECARGO_CHECKOUT_TARJETA = 0` en `src/lib/precios-medio-pago.ts`, así que **el sitio muestra un
> solo precio**. El dueño decidió postular a **Transbank Webpay Plus directo** (2,08% débito /
> 2,80% crédito con IVA) y **absorber** la comisión en vez de traspasarla: con esas tarifas un
> recargo del 3% habría excedido la comisión del débito, y el TDLC solo lo permite cuando **no la
> excede**.
>
> Para reactivarlo: cambiar ese número, **nunca por encima de la comisión con IVA de la pasarela en
> uso**. `HAY_RECARGO` apaga y enciende el segundo precio en todo el sitio de una sola vez.
> Lee igual el resto del documento antes de tocarlo: las decisiones D1-D4 y los riesgos siguen
> vigentes.
>
> Escrito el 08-09-2026, cuando el dueño iba a integrar Flow y protegerse de su comisión (3,44%)
> con precios diferenciados al estilo Tecnomás. Encaja en la **Fase 2** del
> `PLAN-CRECIMIENTO-2026.md` (Oferta y precio con criterio).

## 1. La regla del negocio

- **Precio de transferencia/efectivo = el precio que el catálogo ya tiene hoy.** No se toca ni un
  producto.
- **Precio con tarjeta = ese precio + un recargo fijo, calculado, nunca guardado a mano.**
- **Recargo propuesto: 3%.** La comisión real de Flow es 2,89% + IVA = **3,44%**, así que 3% queda
  por debajo del techo legal (el TDLC permite recargo diferenciado siempre que **no exceda la
  comisión** y se informe de forma pública y transparente). Además da números redondos: $99.990
  pasa a $102.990, exactamente el caso de Tecnomás.

**Por qué el precio actual es el BAJO y no el alto:** si el precio de hoy pasara a ser el "normal"
y la transferencia fuera 3% menos, se perdería 3 puntos de margen en el 95% de las ventas (que hoy
son efectivo y transferencia) para proteger el 5% restante. Con margen de 30,9%, regalar 3 puntos
de precio es regalar ~10% de la utilidad. Al revés funciona: el margen actual se mantiene intacto y
la comisión se recupera solo de quien la genera.

## 2. Decisiones — TODAS CERRADAS por el dueño el 08-09-2026

| # | Decisión | Respuesta |
|---|---|---|
| D1 | ¿El recargo aplica al **costo de envío**? | **No.** Solo a los productos, igual que Tecnomás |
| D2 | ¿El **POS presencial** también cobra recargo con tarjeta? | **No. En el mostrador siempre rige el precio bajo**, aunque el cliente pague con débito o crédito. Y si lo pide, se le manda un **link de pago** para acceder al precio bajo. Se explica en la FAQ |
| D3 | ¿Qué precio va al **feed de Google/Meta**? | El **más bajo** (transferencia) |
| D4 | ¿Aplica a **todo el catálogo**? | **Sí**, sin excepciones |

### ⚠️ Lo que D2 cambia (releer antes de escribir código)

El recargo **NO es "por pagar con tarjeta"**. Es **por pagar a través de la pasarela del checkout
web (Flow)**, que cuesta 2,89% + IVA. Todos los demás caminos van al precio bajo:

| Cómo paga el cliente | Precio |
|---|---|
| Efectivo o transferencia (presencial) | **Bajo** |
| Débito o crédito **en el mostrador** (TUU, 1,49%) | **Bajo** |
| **Link de pago de TUU** (a pedido, por WhatsApp) | **Bajo** |
| Transferencia en la web (Khipu, 1%) | **Bajo** |
| **Tarjeta en el checkout web (Flow, 2,89%)** | **Alto** |

Es más limpio y más defendible que "recargo por tarjeta": el precio alto refleja el costo real de
**esa** pasarela concreta, no del plástico. Y no castiga al cliente presencial, que es el 99% de la
venta real de Sevelin. También simplifica el trabajo: **la pantalla de venta del POS no se toca**
(cae el cambio de precios presenciales que este plan preveía). Lo único que sigue cruzando repos es
mostrar el recargo en el panel "Pedidos Web" del POS, para que el total de un pedido cuadre.

**Tensión a vigilar (no resuelta, decisión futura):** si la FAQ dice "pide un link de pago y accedes
al precio bajo", parte del tráfico que llegue por Ads va a preferir escribir por WhatsApp antes que
pagar en el checkout. Eso **ahorra comisión pero mata la conversión automática** que la publicidad
está pagando por generar, y agrega trabajo manual por venta. Recomendación: explicarlo en la **FAQ**
(quien lo busca, lo encuentra) pero **no ofrecerlo dentro del checkout**, donde sabotearía una venta
que ya estaba por cerrarse sola.

## 3. Diseño técnico

### 3.1 Un solo precio en la base, el otro calculado

`productos_web.precio_web` **no cambia** y sigue siendo la única fuente de verdad. El precio con
tarjeta se calcula con una función pura:

```
precioConTarjeta(precio) = redondearA10(precio × 1,03)
```

Nunca se guarda una segunda columna de precio. Motivos:
- No hay que tocar 130 productos ni arriesgar una carga masiva.
- No pueden desincronizarse dos precios (el bug clásico de este patrón).
- Cambiar el porcentaje mañana es cambiar **una constante**, no re-migrar el catálogo.
- El trigger de sincronización POS → tienda sigue funcionando exactamente igual.

Redondeo a la decena para que nunca aparezca un $102.989,7 en pantalla.

### 3.2 Dónde se muestra

| Lugar | Qué mostrar |
|---|---|
| Tarjeta de producto (catálogo) | Precio de transferencia destacado + línea chica "con tarjeta $X" — sin romper la grilla en móvil, que ya fue un problema en v17 |
| Ficha de producto | Los dos precios juntos y explícitos, con una línea que explique la diferencia |
| Carrito | Subtotal en los dos precios |
| Checkout | Los dos totales visibles **antes** de elegir medio de pago, y el total elegido resaltado al seleccionar (igual que Tecnomás) |
| `/terminos` | La política escrita: cuánto es el recargo y por qué |

### 3.3 El servidor es la autoridad (no la pantalla)

Mismo criterio que ya rige el precio, el stock y el envío en `POST /api/checkout`: el navegador
puede mandar lo que quiera, el total se **recalcula en el servidor** según el `metodoPago` que llega
y se compara contra el catálogo real. El monto que se le pide a Flow o a Khipu sale de ese cálculo,
nunca del cliente.

### 3.4 Migración necesaria

`pedidos_web` necesita una columna nueva — **`recargo_medio_pago`** (entero, default 0) — para que:
- el total del pedido cuadre con lo que efectivamente se cobró,
- el panel "Pedidos Web" del POS pueda mostrar por qué el total no es la suma simple de los ítems,
- la boleta refleje el monto real cobrado.

Sería `supabase/25-recargo-medio-pago.sql`. **Esto cruza los dos repos**: el POS muestra esos
pedidos, así que hay que tocar también `sevelin-pos-oficial`. Primero se despliega el receptor,
después se usa el campo — la lección que ya dejó el campo `marca` en v54.

### 3.5 La regla de qué precio aplica

Simple y sin excepciones:

- **Khipu (transferencia)** → precio de transferencia.
- **Flow (tarjetas, billeteras, MACH)** → precio con tarjeta.

**Por esto mismo NO hay que activar el medio "transferencia" dentro de Flow** (ids 22 y 17 del panel
de Flow, 0,99% + $100): si el cliente elige Flow y adentro paga por transferencia, se le cobró el
precio de tarjeta por un medio barato. Además duplica lo que Khipu ya hace más barato.

## 4. Riesgos anotados

1. **Google Merchant Center puede marcar discrepancia de precio.** Es el riesgo más concreto: si
   Google ve un precio en el feed y detecta otro en el checkout, puede suspender el producto o la
   cuenta. Mitigación: feed con el precio de transferencia + los dos precios visibles en la ficha.
   **Hay que vigilar el estado de la cuenta los primeros días después de publicar esto.**
2. **SERNAC / Ley del Consumidor**: no se puede cobrar más que el precio anunciado. La defensa es
   que ambos precios estén siempre visibles y juntos, nunca uno escondido en el último paso.
3. **Percepción**: se comunica como *"Oferta pago por transferencia"*, nunca como *"recargo por
   tarjeta"*. Mismo dinero, lectura opuesta — y es exactamente lo que hacen Tecnomás, MyShop y
   SipoOnline.
4. **Incoherencia web/mostrador** mientras D2 no se resuelva (ver arriba).

## 5. Orden de trabajo cuando se apruebe

1. Cerrar D1-D4.
2. Migración `25-recargo-medio-pago.sql` + receptor en el POS (desplegar el receptor **primero**).
3. Función de cálculo + constante del recargo, con pruebas del redondeo.
4. UI: ficha → tarjeta → carrito → checkout, en ese orden.
5. Recalcular en el servidor y guardar `recargo_medio_pago` en el pedido.
6. Texto en `/terminos`.
7. Ajustar el feed de catálogo (Fase 3) según D3.
8. Probar de punta a punta con una compra real chica por cada medio, y **recién ahí** anunciarlo.
