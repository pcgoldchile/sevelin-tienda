import type { ProductoWeb } from './tipos';

/**
 * Precio de oferta con fechas (supabase/37, 29-09-2026).
 *
 * En la base, `precio_web` es siempre el precio NORMAL. Esta función se
 * aplica en el único lugar donde se leen productos (src/lib/catalogo.ts y
 * src/lib/encargos.ts): si la oferta está vigente, devuelve el producto con
 * `precio_web` = precio de oferta y `precio_antes` = el normal.
 *
 * Por qué acá y no en cada pantalla: hay ~40 lugares que usan precio_web
 * (tarjetas, ficha, carrito, checkout que COBRA, correos, cotización,
 * valor declarado del envío). Resolviéndolo al leer, todos usan el precio
 * vigente sin tocarlos, y no hay forma de que uno quede cobrando el precio
 * viejo por olvido.
 *
 * "Vigente" se decide contra la hora actual en cada lectura: la oferta
 * empieza y termina sola, sin cron. Las páginas con caché (ISR de 60 s)
 * pueden mostrarla hasta 60 s de más o de menos; el checkout no tiene caché
 * y, si el precio cambió respecto de lo que vio el cliente, lo detiene
 * (ver precio_esperado en POST /api/checkout).
 */
export function ofertaVigente(p: Pick<ProductoWeb, 'precio_web' | 'precio_oferta' | 'oferta_desde' | 'oferta_hasta'>, ahora = Date.now()): boolean {
  const oferta = Number(p.precio_oferta);
  if (!oferta || oferta <= 0 || !p.oferta_desde || !p.oferta_hasta) return false;
  const desde = Date.parse(p.oferta_desde);
  const hasta = Date.parse(p.oferta_hasta);
  if (!Number.isFinite(desde) || !Number.isFinite(hasta)) return false;
  // Una "oferta" igual o más cara que el precio normal no es oferta.
  return ahora >= desde && ahora < hasta && oferta < Number(p.precio_web);
}

export function aplicarOferta<T extends ProductoWeb>(p: T, ahora = Date.now()): T {
  if (!p) return p;
  // Un producto "precio a consultar" no se vende en línea: no se le muestra oferta.
  if (p.precio_a_consultar || !ofertaVigente(p, ahora)) return { ...p, precio_antes: null };
  return { ...p, precio_web: Number(p.precio_oferta), precio_antes: Number(p.precio_web) };
}

/** Porcentaje de descuento redondeado hacia abajo (nunca prometer de más). */
export function porcentajeDescuento(precioAntes: number | null | undefined, precio: number): number | null {
  if (!precioAntes || precioAntes <= precio) return null;
  return Math.floor(((precioAntes - precio) / precioAntes) * 100);
}
