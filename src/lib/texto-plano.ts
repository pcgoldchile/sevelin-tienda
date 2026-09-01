/**
 * Descripción HTML (ya sanitizada por sanitizarDescripcionHtml, o texto
 * plano tal cual) → texto plano de una sola línea, para meta description /
 * Open Graph / feeds de productos (Google Merchant Center, Meta Catalog) —
 * ninguno de esos lugares acepta HTML.
 *
 * No es un parser HTML de verdad (no hace falta uno para esto: ya viene
 * sanitizado, con una whitelist mínima de tags — ver sanitizar-html.ts):
 * basta con quitar las etiquetas y decodificar las entidades que puede
 * traer el texto de un producto (ej. "&" en una marca o modelo).
 */
export function textoPlanoDesdeHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Restos de sintaxis Markdown sin convertir — puede pasar con
    // descripciones guardadas antes del fix del pegado en el editor del
    // POS (ver ese changelog): "**texto**" y "[texto](url)" no son HTML,
    // así que el replace de arriba no los toca. Un SEO/feed nunca debería
    // mostrar esos símbolos literales.
    .replace(/\[([^\]]+)\]\((?:https?:\/\/[^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Recorta a `limite` caracteres sin cortar una palabra a la mitad — para
 *  meta descriptions (Google trunca ~155-160 caracteres de todos modos,
 *  pero cortar nosotros mismos evita que termine en una palabra a medias
 *  seguida de "..."). */
export function recortarEnPalabra(texto: string, limite: number): string {
  if (texto.length <= limite) return texto;
  const cortado = texto.slice(0, limite);
  const ultimoEspacio = cortado.lastIndexOf(' ');
  return `${(ultimoEspacio > 0 ? cortado.slice(0, ultimoEspacio) : cortado).trim()}…`;
}
