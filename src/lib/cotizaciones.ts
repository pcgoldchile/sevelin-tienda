/**
 * Cotizaciones que el cliente se genera solo desde el carrito.
 * ------------------------------------------------------------
 * Ver `supabase/35-cotizaciones-web.sql` para el porqué y el modelo de
 * datos. Acá vive TODO el cálculo, en un solo lugar, para que la página del
 * documento, el correo y el panel del POS no puedan contradecirse entre sí
 * — mismo criterio que el resto del proyecto.
 *
 * EL IVA, que es la parte delicada
 * `productos_web.precio_web` es el precio FINAL al público: ya trae el IVA
 * adentro (así se muestra en toda la tienda y así lo paga el cliente). Una
 * empresa necesita el neto, así que se saca hacia atrás: neto = precio /
 * 1,19.
 *
 * El neto se redondea POR LÍNEA y el IVA sale como `total - neto`, nunca al
 * revés. Si se calculara el IVA por línea y se sumara, los redondeos de
 * cada línea harían que neto + iva no diera exactamente el total que el
 * cliente ve en la tienda, y un documento donde la suma no cuadra al peso
 * es un documento que nadie firma.
 */

import { obtenerProductoPorSku } from '@/lib/catalogo';

/** Tasa de IVA en Chile. Constante y no una env var: cambia por ley, no por configuración. */
export const TASA_IVA = 0.19;

/**
 * Días de vigencia de una cotización.
 *
 * 0 = vence al terminar el DÍA en que se emitió (hora de Chile). Es lo que
 * pidió el dueño el 17-09-2026: "esa cotización puede ser hábil durante ese
 * día solamente".
 *
 * Queda como constante a propósito: para una empresa un día suele ser corto
 * (compras y finanzas rara vez aprueban el mismo día), así que es probable
 * que haya que estirarlo. Subir este número es lo único que hay que tocar —
 * no hay ninguna fecha calculada en otra parte ni guardada en la base como
 * regla.
 */
export const DIAS_VALIDEZ_COTIZACION = 0;

/** Tope de líneas por cotización: freno a un carrito armado a mano por un bot. */
export const MAX_LINEAS_COTIZACION = 60;

export interface LineaCotizacion {
  sku: string;
  nombre: string;
  cantidad: number;
  /** Precio unitario CON IVA — el mismo que ve en la tienda. */
  precio_unitario: number;
  /** Neto unitario, redondeado al peso. */
  neto_unitario: number;
  /** cantidad × precio_unitario (con IVA). */
  subtotal: number;
}

export interface TotalesCotizacion {
  neto: number;
  iva: number;
  total: number;
}

/** Neto de un precio que ya trae IVA incluido, redondeado al peso. */
export function netoDesdePrecioFinal(precioConIva: number): number {
  return Math.round((Number(precioConIva) || 0) / (1 + TASA_IVA));
}

/**
 * Totales del documento. `iva` se deriva de la resta (ver la nota de
 * arriba): así neto + iva === total SIEMPRE, sin importar los redondeos.
 */
export function totalesDeCotizacion(lineas: LineaCotizacion[]): TotalesCotizacion {
  const total = lineas.reduce((suma, l) => suma + l.subtotal, 0);
  const neto = lineas.reduce((suma, l) => suma + l.neto_unitario * l.cantidad, 0);
  return { neto, iva: total - neto, total };
}

/**
 * Fin de la vigencia: las 23:59:59 del día correspondiente, en hora de
 * Chile, devuelto en UTC para guardarlo.
 *
 * El cálculo pasa por `Intl` con timeZone América/Santiago a propósito. El
 * servidor de Vercel corre en UTC: a las 21:00 de Chile ya es el día
 * siguiente en UTC, así que hacerlo con `new Date()` local le habría dado
 * al cliente un día de más —o de menos— según la hora a la que cotizara.
 * Y de paso queda bien en los cambios de horario de verano, que en Chile
 * son dos veces al año.
 */
export function vencimientoCotizacion(desde: Date = new Date(), diasExtra = DIAS_VALIDEZ_COTIZACION): Date {
  const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const [anio, mes, dia] = formato.format(desde).split('-').map(Number);

  // Medianoche del día siguiente al último día válido, menos un segundo.
  const finDiaUtc = Date.UTC(anio, mes - 1, dia + diasExtra + 1, 0, 0, 0);

  /* Chile está detrás de UTC (-03 o -04). Para saber el desfase exacto de
     ESE día se compara cómo se ve el mismo instante en las dos zonas: no se
     puede asumir -03 fijo porque el horario de verano lo cambia. */
  const referencia = new Date(finDiaUtc);
  const enChile = new Date(referencia.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  const enUtc = new Date(referencia.toLocaleString('en-US', { timeZone: 'UTC' }));
  const desfase = enUtc.getTime() - enChile.getTime();

  return new Date(finDiaUtc + desfase - 1000);
}

/** ¿Sigue vigente? Se compara contra el instante guardado, no contra fechas de texto. */
export function cotizacionVigente(venceEn: string | Date): boolean {
  return new Date(venceEn).getTime() > Date.now();
}

/** "mié 17 de septiembre de 2026, 23:59" — para el documento y el correo. */
export function fechaLargaChile(valor: string | Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(valor));
}

export interface ItemSolicitado {
  sku: string;
  cantidad: number;
}

/**
 * Resuelve lo que pidió el cliente contra el catálogo REAL. Nunca se confía
 * en los precios que manda el navegador: el carrito vive en localStorage y
 * cualquiera puede editarlo — el precio del documento sale siempre de
 * `productos_web`, igual que en el checkout.
 *
 * Lo que NO se comprueba a propósito es el stock. Cotizar no es comprar:
 * una empresa puede pedir 20 unidades de algo de lo que hay 3 hoy, y
 * negarse a cotizarlo sería perder la venta. La página del documento avisa
 * en grande que no reserva stock.
 */
export async function resolverLineasCotizacion(items: ItemSolicitado[]): Promise<LineaCotizacion[]> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('No hay productos para cotizar');
  }
  if (items.length > MAX_LINEAS_COTIZACION) {
    throw new Error(`Una cotización admite hasta ${MAX_LINEAS_COTIZACION} productos distintos`);
  }

  const lineas = await Promise.all(
    items.map(async (solicitado) => {
      const sku = String(solicitado?.sku || '').trim();
      const cantidad = Math.max(1, Math.round(Number(solicitado?.cantidad) || 0));
      const producto = await obtenerProductoPorSku(sku);
      if (!producto) throw new Error(`El producto ${sku || '(sin SKU)'} ya no está disponible`);

      /* Precio a consultar (supabase/31): el valor publicado es solo una
         base y depende del equipo del cliente. Cotizarlo pondría en un
         documento formal un precio que el dueño no puede sostener. */
      if (producto.precio_a_consultar) {
        throw new Error(`"${producto.nombre}" se cotiza según tu equipo. Quítalo y escríbenos por WhatsApp para ese en particular.`);
      }

      const precio = Number(producto.precio_web) || 0;
      return {
        sku: producto.sku,
        nombre: producto.nombre,
        cantidad,
        precio_unitario: precio,
        neto_unitario: netoDesdePrecioFinal(precio),
        subtotal: precio * cantidad,
      };
    })
  );

  return lineas;
}

/** Correo con forma de correo. No verifica que exista — eso lo dirá el envío. */
export function correoValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valor || '').trim());
}
