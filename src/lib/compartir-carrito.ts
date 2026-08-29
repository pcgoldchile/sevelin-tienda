/** Carrito compartible: sin base de datos, todo va codificado en la URL.
 * Solo viajan sku + cantidad — precio, nombre, stock y foto se vuelven a
 * resolver contra el catálogo real al abrir el link (mismo principio que el
 * checkout: nunca se confía en datos "congelados" que trae un link viejo). */
export interface ItemCompartido {
  sku: string;
  cantidad: number;
}

/** Codifica en base64url — sin `+`/`/`/`=`, seguro para ir en un query string
 * sin que el navegador o WhatsApp lo corten o lo re-escape raro. */
function base64UrlEncode(texto: string): string {
  const base64 = typeof window === "undefined" ? Buffer.from(texto, "utf-8").toString("base64") : window.btoa(unescape(encodeURIComponent(texto)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(codificado: string): string {
  const base64 = codificado.replace(/-/g, "+").replace(/_/g, "/").padEnd(codificado.length + ((4 - (codificado.length % 4)) % 4), "=");
  return typeof window === "undefined" ? Buffer.from(base64, "base64").toString("utf-8") : decodeURIComponent(escape(window.atob(base64)));
}

export function codificarCarrito(items: { sku: string; cantidad: number }[]): string {
  const compacto: ItemCompartido[] = items.map((item) => ({ sku: item.sku, cantidad: item.cantidad }));
  return base64UrlEncode(JSON.stringify(compacto));
}

/** Devuelve `null` si el parámetro no es un carrito válido (link roto,
 * manipulado a mano, etc.) — el llamador decide qué mostrar en ese caso. */
export function decodificarCarrito(codificado: string): ItemCompartido[] | null {
  try {
    const datos = JSON.parse(base64UrlDecode(codificado));
    if (!Array.isArray(datos)) return null;
    const items = datos
      .filter((item): item is { sku: unknown; cantidad: unknown } => typeof item === "object" && item !== null)
      .map((item) => ({
        sku: String((item as { sku: unknown }).sku || "").trim(),
        cantidad: Math.max(1, Math.round(Number((item as { cantidad: unknown }).cantidad) || 0)),
      }))
      .filter((item) => item.sku);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}
