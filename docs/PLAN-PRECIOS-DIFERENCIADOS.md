# Plan: precio diferenciado por medio de pago (transferencia vs. tarjeta)

> Escrito el 08-09-2026 a pedido del dueño, que decidió integrar Flow igual y protegerse de la
> comisión con precios diferenciados, siguiendo el modelo de Tecnomás ("Precio Transferencia" /
> "Precio Normal"). **Nada de esto está construido todavía**: es el plan, con las decisiones que
> el dueño tiene que cerrar antes de escribir código. Encaja en la **Fase 2** del
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

## 2. Decisiones que el dueño tiene que cerrar (bloquean la construcción)

| # | Decisión | Recomendación | Por qué importa |
|---|---|---|---|
| D1 | ¿El recargo aplica también al **costo de envío**? | **No** (solo a los productos) | Tecnomás lo hace así: su diferencia es $3.000 tanto en el subtotal como en el total, o sea el envío no lleva recargo. Es más simple de explicar y más fácil de defender. Cuesta perder la comisión sobre el envío (~$700 en un despacho de $20.000) |
| D2 | ¿El **POS presencial** también cobra el recargo con tarjeta? | **Sí, por coherencia** — pero es cambio aparte, en el otro repo | Si la web cobra 3% más con tarjeta y el mostrador no, un cliente que compara puede reclamar con razón. Peor: TUU cobra comisión igual en el mostrador, así que hoy esa comisión se está absorbiendo entera |
| D3 | ¿Qué precio se manda al **feed de Google/Meta**? | El de **transferencia** (el bajo), que es el que se muestra destacado en la ficha | Google exige que el precio del feed coincida con el de la página. Si el feed dice uno y la página muestra otro como principal, puede rechazar el producto entero |
| D4 | ¿Se aplica a **todo el catálogo** o solo sobre cierto monto? | Todo el catálogo | Una regla con excepciones es una regla que el cliente no entiende y que hay que explicar dos veces |

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
