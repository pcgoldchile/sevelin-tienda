# Plan Cyber (lunes 05-10-2026) — PENDIENTE, no aplicado

> ⚠️ **01-10-2026: los números de este plan quedaron viejos.** La propuesta vigente (con los precios en 990,
> los mayoristas cargados y el costo recalculado) está en el repo del POS:
> `docs/estudios-precios/2026-10-01-terminacion-990-y-cyber.md`, sección 6. El precio de oferta con fechas ya
> existe (v100); lo que sigue sin construir es el modo Cyber (franja y `/ofertas`).

> Recomendación de Claude del 29-09-2026, con datos reales del POS (costo, precio, stock y ventas de
> los últimos 90 días). **El dueño decidió no aplicar nada todavía**: le faltan productos por cargar.
> Antes de aplicar, volver a correr los números: los costos y el stock pueden haber cambiado.

## Lo que falta construir antes de aplicar descuentos

- **Precio de oferta con fecha de inicio y fin** (POS + tienda + sincronización + checkout que cobra
  el precio de oferta en el servidor). Aceptado por el dueño el 29-09-2026. Hoy la tienda no sabe
  mostrar "antes / ahora".
- Modo Cyber (franja con cuenta regresiva, lámina en el carrusel, etiqueta, página `/ofertas`).
- Correo del Cyber solo a clientes con `consentimiento_marketing = true`.

## Criterios

- El margen se mide como (precio − costo) / precio, igual con o sin IVA si ambos lo incluyen.
- **No bajar de ~25% de margen**, salvo stock dormido donde recuperar la plata importa más.
- **No rebajar** lo que tiene menos de 20% de margen: monitores nuevos (14–15%), SSD 960 GB (12%),
  fuentes (8–19%), RAM (16%), Caixun 24" (7%).
- No rebajar lo que ya se vende solo sin necesidad (salvo 1 producto gancho).
- El precio "antes" es el precio real de las semanas previas (SERNAC fiscaliza eso en los Cyber).
- "Cyber Monday" es marca de la Cámara de Comercio de Santiago: sin inscripción, no usar su logo ni
  "tienda oficial".

## Productos (29-09-2026)

| Producto | Stock | Ventas 90 d | Hoy | Cyber | Margen hoy → Cyber |
|---|---|---|---|---|---|
| Balanza Digital Bluetooth (gancho, el más vendido) | 8 | 23 | $7.000 | $5.990 | 41% → 32% |
| Hub USB-C 8 en 1 | 5 | 8 | $10.000 | $8.990 | 60% → 56% |
| Juego destornilladores 115 en 1 | 3 | 5 | $10.000 | $8.990 | 57% → 52% |
| Power Bank Master-G 30.000 mAh | 11 | 5 | $30.000 | $26.990 | 42% → 35% |
| Pendrive Kingston 128 GB (Exodia y DT70) | 15 + 15 | 2 | $15.000 | $13.990 | 32% → 27% |
| Parlantes Gamer RGB USB | 10 | 2 | $10.000 | $8.990 | 37% → 30% |
| Combo Teclado y Mouse RGB AB-D335 | 13 | 3 | $8.000 | $6.990 | 38% → 28% |
| Mouse Urbano Labs Gamer (dormido) | 20 | 0 | $3.000 | $2.490 | 46% → 34% |
| Cable UTP Cat6 5 m (dormido) | 20 | 0 | $5.000 | $3.990 | 70% → 63% |
| Cable HDMI 1 m (dormido) | 29 | 0 | $2.000 | 2 × $3.000 | 70% → 60% |
| Ventilador RGB 120 mm | 24 | 6 | $4.000 c/u | 3 × $10.000 | 38% → 25% |
| Monitores 19" reacondicionados (7 modelos, dormidos) | 11 | 0 | $45.000 | $39.990 | 36% → 27% |
| Monitor ViewSonic 22" reacondicionado | 1 | 0 | $55.000 | $47.990 | 47% → 40% |
| PC HP ProDesk SFF i5 4ª gen | 1 | 1 | $100.000 | $89.990 | 48% → 42% |
| Power Bank LinkOn 20.000 mAh (dormido, $324.500 en costo) | 20 | 0 | $20.000 | $17.990 | 19% → 10% ⚠️ |

⚠️ El LinkOn queda casi sin margen: se propone solo para recuperar la plata parada. Es decisión del
dueño.

## Servicios

Los servicios figuran con **costo $0** en el POS porque sus insumos (pasta, thermal pads, metal
líquido) no están cargados como costo: el margen real es menor que 100%. Además la capacidad es del
taller (una o dos personas): **ofrecer cupos limitados**, no prometer plazos que no se pueden cumplir.

| Servicio | Hoy | Cyber |
|---|---|---|
| Mantenimiento preventivo PC Gamer | $40.000 | $34.990 |
| Mantenimiento preventivo Notebook | $40.000 | $34.990 |
| Mantenimiento PS4 | $30.000 | $25.990 |
| Mantenimiento PS5 | $50.000 | $44.990 |
| Limpieza básica de PC | $20.000 | $16.990 |
| Formateo con respaldo | $20.000 | $17.990 |
| Formateo sin respaldo | $15.000 | $12.990 |
| Diagnóstico avanzado | $15.000 | se descuenta completo si se hace la reparación (ver abajo) |

No rebajar: reprogramación de BIOS, pines de socket/procesador, recuperación de datos, derrame de
líquido y todo lo de "precio a consultar" (mucho tiempo o riesgo por equipo).

## Diagnóstico ($15.000 o $10.000)

Dato real: se vendieron **3 diagnósticos, los 3 a $10.000**, incluido el del 27-09-2026, cuando el
precio publicado ya era $15.000. Recomendación: publicar $15.000 y **descontarlo de la reparación** si
el cliente la hace en Sevelin. Ver la respuesta del 29-09-2026 para el razonamiento.
