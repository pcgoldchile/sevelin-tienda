import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitiza el HTML enriquecido que llega desde el editor del POS (Quill,
 * ver sevelin-pos-oficial js/productos.js::initEditorDescripcion) antes de
 * renderizarlo con dangerouslySetInnerHTML. Aunque el POS es un panel de
 * un solo administrador (no un formulario público), esa descripción SÍ
 * termina en el HTML de una página pública — sanitizar es la diferencia
 * entre "confiamos en quien la escribió" y "confiamos en que nunca se
 * comprometió esa sesión ni se copió/pegó algo con script incrustado".
 *
 * Whitelist mínima: exactamente lo que ofrece la barra de herramientas del
 * editor (negrita, cursiva, listas, links) — nada de imágenes, tablas ni
 * estilos inline arbitrarios, que no están en el editor y no deberían
 * poder colarse igual si alguien pega HTML de otro lado.
 */
export function sanitizarDescripcionHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ol", "ul", "li", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}
