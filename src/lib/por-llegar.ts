/**
 * "Por llegar": un producto que viene en camino y todavía no está en la
 * tienda. Si no queda ninguna unidad, se puede RESERVAR pagando el 100%,
 * hasta las unidades que el dueño declaró que vienen (supabase/28 y /29).
 *
 * Estas dos reglas viven acá y en un solo lugar porque las usan la ficha,
 * la tarjeta, el carrito, el checkout del navegador y POST /api/checkout:
 * antes cada uno calculaba su tope y el carrito y el servidor usaban solo
 * `stock_web`, así que la reserva se agregaba con cantidad 0 y el pago se
 * rechazaba por "sin stock" (encontrado el 06-10-2026).
 */

interface StockDeProducto {
  stock_web: number;
  por_llegar?: boolean | null;
  stock_por_llegar?: number | null;
}

/** Es una reserva solo si NO hay unidades hoy. Con stock, se compra normal
 *  aunque vengan más en camino. */
export function esReservaPorLlegar(p: StockDeProducto): boolean {
  return !!p.por_llegar && Number(p.stock_web) <= 0;
}

/** Cuántas unidades se pueden comprar: lo que hay en la tienda, o —si no
 *  queda nada y viene en camino— lo que viene. Nunca más. */
export function topeDeCompra(p: StockDeProducto): number {
  const enTienda = Math.max(0, Number(p.stock_web) || 0);
  if (enTienda > 0) return enTienda;
  return p.por_llegar ? Math.max(0, Number(p.stock_por_llegar) || 0) : 0;
}

/** "jueves 8 de octubre" — o null si no hay fecha o viene mal escrita. */
export function fechaLlegadaLegible(fecha: string | null | undefined, corta = false): string | null {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) return null;
  const d = new Date(`${fecha.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-CL', corta
    ? { day: 'numeric', month: 'short', timeZone: 'America/Santiago' }
    : { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Santiago' });
}

/** La fecha estimada más lejana de un grupo de líneas (cuando ya llegó todo). */
export function ultimaFechaLlegada(fechas: (string | null | undefined)[]): string | null {
  const validas = fechas.filter((f): f is string => !!f && /^\d{4}-\d{2}-\d{2}/.test(f)).map((f) => f.slice(0, 10)).sort();
  return validas.length ? validas[validas.length - 1] : null;
}
