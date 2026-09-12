/**
 * Servicios técnicos en la tienda (12-09-2026).
 *
 * Un servicio no es un producto que se despacha: el cliente TRAE su equipo
 * al local. Y hay servicios cuyo valor depende del equipo (pantalla de
 * celular, bisagras, HDMI…): esos se cotizan, no se venden en línea.
 *
 * Se identifican por categoría y no por `stock_ilimitado`, mismo criterio
 * que el feed del POS (api/index.js) y el checkbox "es servicio": ese campo
 * también lo usan productos físicos sin control de stock exacto.
 */

export const CATEGORIA_SERVICIOS = "Servicios Técnicos";

export function esServicioTecnico(producto: { categoria: string | null }): boolean {
  return producto.categoria === CATEGORIA_SERVICIOS;
}

/** Link de WhatsApp con el nombre del servicio ya escrito, para cotizar. */
export function urlCotizarWhatsapp(whatsapp: string | undefined, nombre: string): string | null {
  if (!whatsapp) return null;
  const mensaje = `Hola, quiero cotizar el servicio "${nombre}". Mi equipo es: `;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
