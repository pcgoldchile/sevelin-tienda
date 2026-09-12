/**
 * Cuándo y cómo avisar que queda poco de un producto.
 *
 * LA REGLA DE ORO: el aviso se calcula con el stock REAL, nunca se escribe
 * a mano. Un cartel de "última unidad" en algo que tiene diez es publicidad
 * engañosa, y el cliente que lo descubre deja de creerle al resto de la
 * tienda — incluidas las veces que sí es verdad. El interruptor del POS
 * (`urgencia_stock_web`) solo decide EN QUÉ productos se permite mostrarlo;
 * el número siempre sale de la base.
 *
 * Ver sevelin-pos-oficial/sql/40-urgencia-stock-web.sql.
 */

/** Desde cuántas unidades hacia abajo se considera "poco". Tres es el punto
 *  donde el aviso todavía es creíble: con cinco o seis suena a presión
 *  inventada, y deja de funcionar justo cuando de verdad queda una. */
export const UMBRAL_URGENCIA = 3;

export interface AvisoUrgencia {
  titulo: string;
  detalle: string;
  /** Última unidad — se destaca más que "quedan 2 o 3". */
  critico: boolean;
}

/**
 * Devuelve el aviso, o null si no corresponde mostrarlo.
 *
 * Los pedidos por encargo quedan fuera a propósito: no tienen stock propio
 * (se traen a pedido), así que "queda 1" no significaría nada.
 */
export function avisoUrgenciaStock(producto: {
  stock_web: number;
  urgencia_stock_web?: boolean;
  es_pedido_encargo?: boolean;
  por_llegar?: boolean;
}): AvisoUrgencia | null {
  if (producto.es_pedido_encargo) return null;
  if (producto.urgencia_stock_web === false) return null;
  /* Si viene más en camino, "última unidad" es una escasez que no es
     real: presiona con algo que se va a reponer en días. Manda el aviso
     de "por llegar", que además es el que dice la verdad completa. */
  if (producto.por_llegar) return null;

  const stock = producto.stock_web;
  if (stock <= 0 || stock > UMBRAL_URGENCIA) return null;

  /* El detalle es el mismo en los dos casos y es deliberado: no basta con
     apurar, hay que decir cómo resolverlo ahora mismo. Las tres formas de
     llevárselo van juntas porque cada cliente elige distinto, y la de
     "el día que te acomode" desarma la excusa más común ("no puedo pasar
     hoy"). */
  const detalle =
    "Retíralo hoy en Arica, te lo despachamos a tu puerta, o agenda el día que mejor te acomode.";

  return stock === 1
    ? { titulo: "Última unidad", detalle: `Es la última que tenemos en tienda. ${detalle}`, critico: true }
    : { titulo: `Quedan ${stock} unidades`, detalle: `Se están agotando. ${detalle}`, critico: false };
}
