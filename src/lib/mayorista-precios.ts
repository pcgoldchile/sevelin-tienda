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
 * - Segundo escalón (supabase/40, dueño 03-10-2026: "de 3 a 9 unidades un
 *   precio y de 10 en adelante otro más bajo"): opcional. Con la cantidad del
 *   segundo escalón se cobra su precio; entre los dos, el del primero.
 */

export interface EscalonMayorista {
  precio: number;
  desde: number;
}

export interface DatosMayorista extends EscalonMayorista {
  /** Segundo escalón: más barato y desde más unidades que el primero. */
  escalon2?: EscalonMayorista | null;
}

/** El segundo escalón, solo si es coherente con el primero (más unidades, menor precio). */
export function escalon2Valido(m: DatosMayorista | null | undefined): EscalonMayorista | null {
  const e = m?.escalon2;
  return m && e && e.precio > 0 && e.precio < m.precio && e.desde > m.desde ? e : null;
}

/** Precio mayorista por unidad que corresponde a esa cantidad (el del primer escalón si no llega al segundo). */
export function precioMayoristaPara(m: DatosMayorista, cantidad: number): number {
  const e = escalon2Valido(m);
  return e && cantidad >= e.desde ? e.precio : m.precio;
}

/** Arma los datos de un producto desde una fila de precios_mayoristas. */
export function datosMayoristaDeFila(f: {
  precio_mayorista: number | string;
  desde_cantidad: number | string;
  precio_mayorista_2?: number | string | null;
  desde_cantidad_2?: number | string | null;
}): DatosMayorista {
  const datos: DatosMayorista = { precio: Number(f.precio_mayorista), desde: Number(f.desde_cantidad) };
  const escalon2 = { precio: Number(f.precio_mayorista_2) || 0, desde: Number(f.desde_cantidad_2) || 0 };
  if (escalon2Valido({ ...datos, escalon2 })) datos.escalon2 = escalon2;
  return datos;
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
  return !!m && m.precio > 0 && m.desde >= 2 && linea.cantidad >= m.desde
    && precioMayoristaPara(m, linea.cantidad) < linea.precio;
}

export function resolverPreciosMayoristas(lineas: LineaMayorista[], pedidoMinimo: number): ResolucionMayorista {
  const califican = new Set(lineas.filter(lineaCalifica).map((l) => l.clave));
  const precioMayorista = (l: LineaMayorista) => precioMayoristaPara(l.mayorista as DatosMayorista, l.cantidad);
  const subtotalConMayorista = lineas.reduce(
    (acc, l) => acc + (califican.has(l.clave) ? precioMayorista(l) : l.precio) * l.cantidad,
    0
  );
  const minimo = Math.max(0, Number(pedidoMinimo) || 0);
  const activo = califican.size > 0 && subtotalConMayorista >= minimo;
  const precios: ResolucionMayorista['precios'] = {};
  for (const l of lineas) {
    const aplica = activo && califican.has(l.clave);
    precios[l.clave] = { precio: aplica ? precioMayorista(l) : l.precio, mayorista: aplica };
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
