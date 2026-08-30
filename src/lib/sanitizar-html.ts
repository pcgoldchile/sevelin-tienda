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
 * POR QUÉ SE FORMATEA ANTES DE SANITIZAR
 * En la práctica NINGUNA descripción del catálogo se guardó como el HTML
 * que Quill produce: son texto plano con saltos de línea. Renderizado tal
 * cual salía como un bloque sin ninguna jerarquía visual. Si el texto NO
 * trae ninguna de las etiquetas del editor, se asume texto plano y se
 * estructura primero (título / lista / párrafos, ver
 * formatear-descripcion.ts). Si SÍ las trae, se respeta tal cual — por si
 * en el futuro alguna descripción llega de verdad vía Quill.
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

const ETIQUETAS_PERMITIDAS = ['p', 'br', 'strong', 'em', 'u', 's', 'ol', 'ul', 'li', 'a', 'h3'];
const ATRIBUTOS_PERMITIDOS = ['href', 'target', 'rel'];

/** ¿El texto ya trae HTML real (de Quill), o es texto plano? */
function contieneHtmlDelEditor(texto: string): boolean {
  return /<\s*(p|br|strong|em|u|s|ol|ul|li|a)\b/i.test(texto);
}

export async function sanitizarDescripcionHtml(descripcion: string): Promise<string> {
  if (!descripcion) return '';

  const preparado = contieneHtmlDelEditor(descripcion)
    ? descripcion
    : formatearDescripcionPlana(descripcion);

  try {
    const { default: DOMPurify } = await import('isomorphic-dompurify');
    return DOMPurify.sanitize(preparado, {
      ALLOWED_TAGS: ETIQUETAS_PERMITIDAS,
      ALLOWED_ATTR: ATRIBUTOS_PERMITIDOS,
    });
  } catch (err) {
    /* Sin sanitizador no se renderiza HTML: se escapa el texto ORIGINAL
       (no el ya formateado, que no tiene sentido sin poder sanitizarlo) y
       se muestra como texto plano. Se pierde el formato, pero la página
       vive y no se inyecta nada. Queda en los logs para poder detectarlo. */
    console.error(
      '[sanitizarDescripcionHtml] No se pudo cargar el sanitizador; la descripción se muestra como texto plano:',
      err instanceof Error ? err.message : err
    );
    return escaparHtml(descripcion);
  }
}
