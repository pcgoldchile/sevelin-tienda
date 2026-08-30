/**
 * Escapa texto para insertarlo dentro de HTML. Separado en su propio
 * archivo porque lo usan dos módulos que no deben depender entre sí:
 * `formatear-descripcion.ts` (arma HTML a partir de texto plano) y
 * `sanitizar-html.ts` (su respaldo si el sanitizador no carga) —
 * importarlo desde uno al otro habría creado una dependencia circular.
 */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Igual que `escaparHtml`, pero para texto que TODAVÍA va a pasar por un
 * sanitizador (DOMPurify) antes de llegar al DOM — a diferencia del texto
 * de `escaparHtml`, que se inserta directo sin ningún paso intermedio.
 *
 * Deja pasar el "&" de algo con pinta de entidad HTML real (&times; &deg;
 * &amp; &nbsp; &#215; …) para que el sanitizador la decodifique como
 * corresponde. Es habitual que una descripción escrita o pegada desde
 * otro lugar traiga el símbolo de multiplicación o de grado así, en vez
 * del carácter Unicode directo — escaparla igual la dejaría como el texto
 * literal "&times;" en pantalla en vez de "×" (bug real, encontrado al
 * rediseñar la ficha de producto: "2× HDMI" pasó a mostrarse como
 * "2&times; HDMI"). Cualquier otro "&" suelto sí se escapa, para no
 * dejar que el sanitizador intente interpretar algo que no es una
 * entidad real.
 */
export function escaparParaSanitizar(texto: string): string {
  return texto
    .replace(/&(?!#\d+;|#x[0-9a-fA-F]+;|[a-zA-Z]+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
