/**
 * Venta mayorista, Fase 1 (supabase/39, pendiente #28 del POS).
 *
 * LA REGLA, en un solo lugar. La usan el carrito (para mostrar) y
 * POST /api/checkout (para cobrar): si las dos no usaran la misma función,
 * el cliente vería un precio y se le cobraría otro. Sin imports de servidor
 * a propósito: corre igual en el navegador.
 *
 * - Una línea califica si el producto tiene precio mayorista, la cantidad
 *   llega a su mínimo ("desde") y el mayorista es menor que el precio que ya
 *   se cobraría (si hay una oferta más barata, gana la oferta: un mayorista
 *   nunca paga más que un cliente normal).
 * - Pedido mínimo (dueño, 30-09-2026: "debe haber uno sí o sí"): los precios
 *   mayoristas se aplican solo si el pedido, calculado CON esos precios y sin
 *   envío, llega al mínimo. Si no llega, todo va a precio normal y se informa
 *   cuánto falta.
 */

export interface DatosMayorista {
  precio: number;
  desde: number;
}

export interface LineaMayorista {
  clave: string;
  /** Precio que se cobraría sin mayorista (normal u oferta vigente). */
  precio: number;
  cantidad: number;
  mayorista?: DatosMayorista | null;
}

export interface ResolucionMayorista {
  /** Se cobran precios mayoristas en este pedido. */
  activo: boolean;
  /** Alguna línea llega a su cantidad mínima (aunque falte el pedido mínimo). */
  hayLineasQueCalifican: boolean;
  /** Cuánto falta para el pedido mínimo (0 si ya llega o si nada califica). */
  faltante: number;
  /** Subtotal con los precios que de verdad se cobran. */
  subtotal: number;
  precios: Record<string, { precio: number; mayorista: boolean }>;
}

export function lineaCalifica(linea: LineaMayorista): boolean {
  const m = linea.mayorista;
  return !!m && m.precio > 0 && m.desde >= 2 && linea.cantidad >= m.desde && m.precio < linea.precio;
}

export function resolverPreciosMayoristas(lineas: LineaMayorista[], pedidoMinimo: number): ResolucionMayorista {
  const califican = new Set(lineas.filter(lineaCalifica).map((l) => l.clave));
  const subtotalConMayorista = lineas.reduce(
    (acc, l) => acc + (califican.has(l.clave) ? (l.mayorista as DatosMayorista).precio : l.precio) * l.cantidad,
    0
  );
  const minimo = Math.max(0, Number(pedidoMinimo) || 0);
  const activo = califican.size > 0 && subtotalConMayorista >= minimo;
  const precios: ResolucionMayorista['precios'] = {};
  for (const l of lineas) {
    const aplica = activo && califican.has(l.clave);
    precios[l.clave] = { precio: aplica ? (l.mayorista as DatosMayorista).precio : l.precio, mayorista: aplica };
  }
  const subtotal = lineas.reduce((acc, l) => acc + precios[l.clave].precio * l.cantidad, 0);
  return {
    activo,
    hayLineasQueCalifican: califican.size > 0,
    faltante: califican.size > 0 && !activo ? minimo - subtotalConMayorista : 0,
    subtotal,
    precios,
  };
}
