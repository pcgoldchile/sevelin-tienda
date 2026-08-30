import sanitizeHtml from 'sanitize-html';
import { escaparHtml } from './escapar-html';
import { formatearDescripcionPlana } from './formatear-descripcion';

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
 * editor (negrita, cursiva, listas, links), más `h3` para los títulos de
 * sección que arma `formatearDescripcionPlana` — nada de imágenes, tablas
 * ni estilos inline arbitrarios, que no están en el editor y no deberían
 * poder colarse igual si alguien pega HTML de otro lado.
 *
 * POR QUÉ SANITIZE-HTML Y NO ISOMORPHIC-DOMPURIFY (histórico)
 * La versión anterior usaba isomorphic-dompurify, que arrastra jsdom
 * (dependencias nativas, requires dinámicos). Eso causó DOS problemas
 * reales en producción, no solo uno:
 *   1. Importado arriba del archivo, tumbaba con 500 la ruta ENTERA en el
 *      entorno serverless de Vercel — incluso los productos sin
 *      descripción y los SKU inexistentes (ver docs/CHANGELOG-V18).
 *   2. Con carga diferida + `serverExternalPackages` (el arreglo de ese
 *      bug), la página dejaba de caerse, pero el `import()` dinámico
 *      SEGUÍA fallando en tiempo de ejecución en Vercel — de forma
 *      silenciosa, atrapado por el catch de abajo. El síntoma: nunca se
 *      veía la lista/títulos que arma formatearDescripcionPlana, y las
 *      entidades HTML quedaban a medio decodificar. Local nunca lo
 *      reprodujo, ni con build de producción — es específico del sandbox
 *      serverless real.
 * `sanitize-html` es JS puro (sin jsdom ni nativos: usa `htmlparser2`),
 * pensado para exactamente este entorno. No hay carga diferida ni
 * try/catch por rendimiento — solo queda el try/catch como defensa ante
 * un error inesperado, no porque se espere que falle.
 *
 * POR QUÉ SE FORMATEA ANTES DE SANITIZAR
 * En la práctica NINGUNA descripción del catálogo se guardó como el HTML
 * que Quill produce: son texto plano con saltos de línea. Renderizado tal
 * cual salía como un bloque sin ninguna jerarquía visual. Si el texto NO
 * trae ninguna de las etiquetas del editor, se asume texto plano y se
 * estructura primero (título / lista / párrafos, ver
 * formatear-descripcion.ts). Si SÍ las trae, se respeta tal cual — por si
 * en el futuro alguna descripción llega de verdad vía Quill.
 */

const ETIQUETAS_PERMITIDAS = ['p', 'br', 'strong', 'em', 'u', 's', 'ol', 'ul', 'li', 'a', 'h3'];

const OPCIONES_SANITIZE_HTML: sanitizeHtml.IOptions = {
  allowedTags: ETIQUETAS_PERMITIDAS,
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  // Cualquier link que traiga el editor sale con rel seguro, sin
  // depender de que quien lo escribió se haya acordado de ponerlo.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
  },
};

/** ¿El texto ya trae HTML real (de Quill), o es texto plano? */
function contieneHtmlDelEditor(texto: string): boolean {
  return /<\s*(p|br|strong|em|u|s|ol|ul|li|a)\b/i.test(texto);
}

export function sanitizarDescripcionHtml(descripcion: string): string {
  if (!descripcion) return '';

  const preparado = contieneHtmlDelEditor(descripcion)
    ? descripcion
    : formatearDescripcionPlana(descripcion);

  try {
    return sanitizeHtml(preparado, OPCIONES_SANITIZE_HTML);
  } catch (err) {
    /* Sin sanitizador no se renderiza HTML: se escapa el texto ORIGINAL
       (no el ya formateado, que no tiene sentido sin poder sanitizarlo) y
       se muestra como texto plano. Se pierde el formato, pero la página
       vive y no se inyecta nada. Queda en los logs para poder detectarlo. */
    console.error(
      '[sanitizarDescripcionHtml] Error al sanitizar; la descripción se muestra como texto plano:',
      err instanceof Error ? err.message : err
    );
    return escaparHtml(descripcion);
  }
}
