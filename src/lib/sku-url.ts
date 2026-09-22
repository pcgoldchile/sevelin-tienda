/**
 * El SKU como parte de una URL (22-09-2026).
 *
 * EL BUG QUE ORIGINÓ ESTO
 *   El SKU es la dirección pública de cada producto (`/productos/<sku>`).
 *   Un producto tenía el código del escáner como SKU — "TECMOU150 E4U", con
 *   espacio — y su ficha daba 404 aunque estuviera publicada y con stock.
 *
 *   La causa, comprobada instrumentando la app en local: Next.js entrega el
 *   parámetro de ruta SIN decodificar. Con la URL `/productos/TECMOU150%20E4U`
 *   el handler recibe literalmente "TECMOU150%20E4U", y ese SKU no existe en
 *   la base, donde está guardado "TECMOU150 E4U".
 *
 *   El dato puntual ya se corrigió (el código de barras volvió a su campo),
 *   pero el agujero seguía abierto para cualquier SKU futuro con un espacio,
 *   una tilde, un `#` o un `+`. Esto lo cierra.
 */

/**
 * Traduce el segmento de URL al SKU real antes de buscarlo en la base.
 *
 * `decodeURIComponent` LANZA con secuencias mal formadas (por ejemplo
 * "%E4U", que un bot o un enlace roto pueden mandar perfectamente). Si
 * lanzara acá, la ficha respondería 500 en vez del 404 que corresponde; por
 * eso el valor original se devuelve tal cual cuando no se puede decodificar.
 */
export function skuDesdeRuta(segmento: string): string {
  if (!segmento) return "";
  try {
    return decodeURIComponent(segmento);
  } catch {
    return segmento;
  }
}

/**
 * Arma el trozo de ruta a partir del SKU guardado.
 *
 * `encodeURIComponent` escapa TODO lo que no es seguro en una URL, incluida
 * la barra `/` — que en un SKU sería un separador de ruta falso y partiría
 * la dirección en dos.
 */
export function rutaDeSku(sku: string): string {
  return encodeURIComponent(sku || "");
}
