/**
 * Formatea un RUT chileno mientras se escribe: "219613873" → "21.961.387-3".
 * Campo único con el dígito verificador incluido (no uno aparte) — es el
 * patrón que ya usan los sitios chilenos (bancos, SII, retail) y evita la
 * pregunta de "¿qué pongo en el otro campo?": el cliente escribe el RUT tal
 * como lo dice de memoria, sin pensar en puntos ni guion.
 *
 * Solo formatea — no valida el dígito verificador (módulo 11). No hace
 * falta para lo que se usa acá (identificación, no facturación electrónica
 * real); si más adelante hace falta validar, agregar una función aparte que
 * no cambie esta.
 */
export function formatearRut(valorCrudo: string): string {
  // Solo dígitos y K/k (el dígito verificador puede ser K) — cualquier otro
  // caracter que ya haya en el valor (puntos, guion de una edición previa)
  // se descarta antes de reformatear desde cero.
  const limpio = valorCrudo.replace(/[^0-9kK]/g, '').toUpperCase();
  if (!limpio) return '';

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!cuerpo) return dv;

  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoConPuntos}-${dv}`;
}
