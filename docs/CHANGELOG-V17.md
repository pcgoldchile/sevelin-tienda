# CHANGELOG v17 — Arreglos de móvil, menú, y envío por distancia real

**Fecha:** 30-08-2026

---

## 1. Arreglos de móvil (reportados con capturas desde el teléfono)

### 1.1 El botón "Agregar" salía cortado
**Causa medida, no supuesta:** en la grilla de 2 columnas la tarjeta mide ~160px y su
interior ~132px, mientras que el selector de cantidad (~100px) más el botón (~92px) suman
**~198px**. La fila desbordaba 66px y "Agregar" quedaba tapado contra el borde.

**Arreglo:** cantidad y botón quedan **apilados** en móvil y vuelven a fila desde `lg`
(4 columnas, tarjetas anchas). De paso el botón queda full-width, que en pantalla táctil es
un blanco mucho más cómodo. Verificado: desborde de 66px → **0**.

### 1.2 Franja de texto cortada bajo los nombres largos
El nombre usaba `line-clamp-2 min-h-[2.5rem]` con `leading-tight`: 2 líneas de 17,5px = 35px
de texto dentro de una caja de 40px. Esos **5px sobrantes** dejaban asomar el borde superior
de la tercera línea.

**Arreglo:** `h-10` + `leading-5` — 2 líneas de 20px = exactamente 40px. Ahora el recorte cae
siempre en el límite de línea, incluso si el navegador agranda la tipografía por su cuenta
(el *font boosting* de Android rompe `line-clamp`).

### 1.3 El botón de WhatsApp tapaba el "Agregar"
Se **aparta al bajar** y vuelve al subir (con margen de 6px para que el rebote táctil no lo
haga parpadear), y es más chico en móvil (48px). Arriba del todo siempre se ve, porque ahí no
tapa ninguna tarjeta.

> **No era un bug:** en el checkout parecía que los campos se salían de la pantalla. Se midió
> (`document.documentElement.scrollWidth` vs. viewport) y **no hay desborde horizontal**: era
> un recorte del panel de vista previa, no de la página. No se tocó nada ahí.

## 2. Menú de categorías

- **Se cierra solo al ir a pagar.** El cierre se engancha al **cambio de ruta**, no a un
  `onClick` por enlace: así también atrapa las navegaciones que no nacen del header — el
  "Ir a pagar" del carrito, un banner, o el botón atrás del navegador.
- **Se cierra al abrir el carrito**, que se dibuja encima del menú.
- **Botón "Cerrar" al final** de los dos menús (el desplegable de escritorio y el de móvil):
  con la lista larga, el botón que lo abrió queda fuera de alcance visual.
- **Escape** cierra lo que esté abierto.

## 3. Envío por distancia real (reemplaza la tarifa plana de la v6)

### 3.1 Cómo se calcula
1. **Nominatim** (OpenStreetMap) convierte la dirección en coordenadas.
2. **OSRM** calcula los kilómetros **manejando** entre la tienda y ese punto.

Se usa distancia de ruta y no línea recta porque en Arica el río, la línea férrea y el cerro
obligan rodeos: un domicilio "a 4 km en línea recta" puede estar a 6,5 km de manejo y caer en
otro tramo.

### 3.2 Escala urbana (hasta 9,5 km)
| Distancia | Tarifa |
|---|---|
| 0 – 1,5 km | $2.000 |
| 1,51 – 2,5 km | $2.500 |
| 2,51 – 4,0 km | $3.000 |
| 4,01 – 5,5 km | $3.500 |
| 5,51 – 7,5 km | $4.000 |
| 7,51 – 9,5 km | $4.500 |

### 3.3 Valles y periferia (> 9,5 km)
`5.000 + techo((km − 9,5) / 1,5) × 500`. El `ceil` va sobre el **excedente**, no sobre el
total: cada 1,5 km empezados por sobre el límite urbano suman $500.

### 3.4 Azapa y Lluta: el cliente declara el kilómetro
En un camino rural la "numeración" es un marcador de km, y **Nominatim la ignora**: ancla el
punto al inicio del camino. Medido: "Camino Azapa 5000" resolvía a 2,6 km de la tienda, o sea
**tarifa urbana mínima para un despacho que cruza medio valle**. El error siempre subestima.

Por eso, al elegir comuna Arica aparece un selector de sector; si se elige un valle, aparece un
campo de kilómetro y la distancia se calcula como **entrada del valle + km declarado**:

- Valle de Azapa: base 4,5 km (Rotonda Azapeños / Diego Portales)
- Valle de Lluta: base 5,0 km (Rotonda Lluta / Panamericana Norte)

Verificado: Azapa km 12 → 16,5 km → **$7.500**; Lluta km 10 → 15,0 km → **$7.000**.

### 3.5 ⚠️ La coordenada de la tienda NO se geocodifica
**Bug real encontrado y corregido durante esta sesión.** El primer borrador traía coordenadas
escritas de memoria, a **4,7 km** del local. Al detectarlo se probó geocodificar
"San Rafael 896, Arica" con Nominatim… y ese punto también estaba mal (~4 km al norte).

Un origen equivocado corre **todas** las tarifas a la vez, y es un error invisible: los precios
salen plausibles, solo que mal. Ahora las coordenadas están fijas en el código, **confirmadas
por el dueño**: `-18.4619, -70.2976`. Se pueden sobreescribir con `TIENDA_LAT` / `TIENDA_LON`
si el local se muda.

Contraste antes/después con el mismo destino: "Las Machas 100" pasó de 5,2 km (origen
geocodificado) a 6,1 km (origen real). "Diego Portales 1000" da **$3.000**, que calza exacto
con el ejemplo de la tabla del dueño.

### 3.6 Courier como opción adicional
Dentro de Arica ahora se ofrecen hasta **tres** opciones: retiro, despacho propio y courier
(Starken / Blue Express vía Chilexpress). El courier se agrega en modo *mejor esfuerzo*: si su
cotización falla, no puede tumbar las opciones que sí funcionan.

### 3.7 Degradación
- **OSRM caído** → se estima con línea recta × 1,35 (factor de rodeo urbano) y la opción se
  marca como *distancia estimada* en pantalla. No se esconde.
- **Dirección no encontrada** → **no se inventa una tarifa**. Se ofrece retiro y courier, y se
  pide coordinar por WhatsApp. Cobrar el tramo mínimo a un domicilio lejano sería regalar el
  despacho; cobrar el máximo sería estafar a alguien del centro.
- Caché en memoria por dirección: el checkout cotiza varias veces mientras se edita el
  formulario, y Nominatim permite 1 petición por segundo.

## 4. Horarios de corte
- **Despacho a domicilio:** sale el mismo día solo si la compra entra **antes de las 18:00**.
- **Retiro en tienda:** se puede retirar el mismo día **hasta las 20:00**.

Todo se evalúa en **hora de Chile** con `Intl` + `timeZone`, nunca con la hora del navegador:
el servidor corre en UTC y calcularía distinto que la pantalla. `Intl` además resuelve el
horario de verano solo, que es donde un cálculo manual de offset se equivoca dos veces al año.
El aviso correspondiente se muestra bajo cada opción de envío.

## 5. Cómo se probó
- **35 pruebas automatizadas** (`npx tsx`): los 14 bordes exactos de la escala urbana
  (1,5 / 1,51 / 2,5 / 2,51 …), 5 casos de la fórmula de periferia, monotonía de la tarifa
  (nunca baja al alejarse), y los 9 casos de horario incluyendo 17:59 vs 18:00 y 19:59 vs 20:00.
  **35 OK, 0 fallas.**
- **APIs reales**: Nominatim y OSRM consultados de verdad; caché verificada (<50ms la segunda
  vez); dirección inexistente devuelve `null` en vez de inventar tarifa.
- **Navegador en viewport móvil (375×812)**: desborde de la tarjeta 66px→0, menú abre/cierra,
  se cierra al abrir carrito y al navegar a `/checkout`, selector de valle solo en Arica, campo
  de km solo al elegir valle, y la cotización completa en pantalla.
- `npx tsc --noEmit` y `npm run build` limpios.

## 6. Pendiente de configuración (no es código)
- **`COSTO_ENVIO_CHILEXPRESS_MOCK` no está en `.env.local`** (solo en el `.example`). Sin ella
  la opción de courier **no aparece** dentro de Arica y falla la cotización fuera de Arica.
  Hay que definirla en local y en Vercel.
- **`COSTO_ENVIO_PLANO` quedó obsoleta** — el código ya no la lee.

## 7. Trampas nuevas descubiertas
- **OSRM espera `lon,lat`**, al revés de lo habitual. Invertirlo da rutas silenciosamente
  equivocadas, no un error.
- **Nunca codificar la coordenada de origen a mano ni sacarla de un geocodificador** (ver 3.5).
- **Nominatim ignora la numeración en caminos rurales** y ancla al inicio del camino (ver 3.4).
- **Nominatim exige un `User-Agent` propio** y permite 1 petición/segundo.
