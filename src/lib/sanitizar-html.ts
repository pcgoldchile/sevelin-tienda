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
 *
 * POR QUÉ LA CARGA ES PEREZOSA Y VA DENTRO DE UN try/catch
 * `isomorphic-dompurify` arrastra jsdom. Importado arriba del archivo, ese
 * import se ejecuta al cargar el módulo de la página, así que si falla en
 * el entorno serverless se cae la ruta ENTERA con 500 — incluso los
 * productos sin descripción y los SKU inexistentes, que deberían dar 404.
 * Eso fue exactamente lo que pasó en producción (ver docs/CHANGELOG-V18).
 * Con la carga diferida y el respaldo de abajo, un problema del
 * sanitizador degrada la descripción a texto plano en vez de tumbar la
 * página. La causa de fondo se corrigió aparte con `serverExternalPackages`
 * en next.config.ts; esto es la red de seguridad, no el arreglo.
 */

const ETIQUETAS_PERMITIDAS = ['p', 'br', 'strong', 'em', 'u', 's', 'ol', 'ul', 'li', 'a'];
const ATRIBUTOS_PERMITIDOS = ['href', 'target', 'rel'];

/** Escapa TODO. Es el respaldo: ante la duda, texto plano, nunca HTML crudo. */
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sanitizarDescripcionHtml(html: string): Promise<string> {
  if (!html) return '';

  try {
    const { default: DOMPurify } = await import('isomorphic-dompurify');
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ETIQUETAS_PERMITIDAS,
      ALLOWED_ATTR: ATRIBUTOS_PERMITIDOS,
    });
  } catch (err) {
    /* Sin sanitizador no se renderiza HTML: se escapa y se muestra como
       texto. Se pierde el formato (negritas, listas), pero la página vive
       y no se inyecta nada. Queda en los logs para poder detectarlo. */
    console.error(
      '[sanitizarDescripcionHtml] No se pudo cargar el sanitizador; la descripción se muestra como texto plano:',
      err instanceof Error ? err.message : err
    );
    return escaparHtml(html);
  }
}
