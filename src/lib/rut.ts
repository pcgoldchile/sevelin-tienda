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

/**
 * RUT normalizado y validado con su dígito verificador (módulo 11), o null
 * si no es válido: "21.961.387-3" → "21961387-3". Lo usa la solicitud de
 * cuenta mayorista (supabase/39), donde el RUT identifica al cliente que el
 * dueño verifica a mano. Aparte de formatearRut a propósito: esa solo da
 * formato mientras se escribe y no debe empezar a rechazar nada.
 */
export function normalizarRutValido(valorCrudo: string): string | null {
  const limpio = String(valorCrudo || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 8 || limpio.length > 9) return null;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return null;
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === esperado ? `${Number(cuerpo)}-${dv}` : null;
}
