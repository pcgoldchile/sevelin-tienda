import { rutaDeSku } from './sku-url';

/**
 * Un pedido por encargo NO se paga en línea (dueño, 02-10-2026): el producto
 * no está en la tienda y el precio publicado es referencial hasta que el
 * dueño confirma con el proveedor si se puede traer y a cuánto. La salida es
 * cotizarlo por WhatsApp, con el producto ya escrito.
 *
 * La barrera real está en POST /api/checkout, que rechaza un encargo aunque
 * llegue en un carrito viejo o compartido. Esto es lo que se le dice al
 * cliente. Sin acceso a la base, para poder usarlo desde componentes cliente.
 */
export const AVISO_ENCARGO =
  'Es un producto por encargo: no está en la tienda y su precio es referencial. ' +
  'Antes de pagar confirmamos con el proveedor si está disponible y a qué precio.';

/** Dirección pública de la ficha de un encargo. */
export function urlFichaEncargo(sku: string): string {
  const sitio = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sevelin.cl').replace(/\/+$/, '');
  return `${sitio}/pedidos-por-encargo/${rutaDeSku(sku)}`;
}

/** WhatsApp con el producto ya escrito: el cliente solo tiene que enviar. */
export function urlCotizarEncargo(whatsapp: string | undefined, nombre: string, sku: string): string | null {
  if (!whatsapp) return null;
  const mensaje = `Hola, quiero cotizar por encargo este producto: "${nombre}". ${urlFichaEncargo(sku)}`;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
