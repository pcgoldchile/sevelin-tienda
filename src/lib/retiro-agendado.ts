/**
 * Retiro agendado: cuándo estima el cliente que va a pasar a buscar su
 * pedido.
 *
 * LA REGLA QUE ORDENA TODO: es una orientación, no una cita. El cliente
 * puede venir otro día sin avisar y nada se rompe. Por eso el campo es
 * opcional, el horario se pide por bloques y en ninguna parte se le
 * promete una hora reservada — prometerlo sería mentir sobre cómo
 * funciona una tienda de barrio.
 */

/** Bloques de dos horas. Nadie sabe a qué minuto va a llegar: pedir una
 *  hora exacta obliga a inventar una precisión que no existe. */
export const BLOQUES_RETIRO = [
  "10:00-12:00",
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
] as const;

export type BloqueRetiro = (typeof BLOQUES_RETIRO)[number];

/** Hasta cuántos días adelante se puede agendar. Más de un mes ya no es
 *  una estimación: es un pedido olvidado. */
export const DIAS_MAXIMOS_RETIRO = 30;

export function esBloqueValido(valor: unknown): valor is BloqueRetiro {
  return typeof valor === "string" && (BLOQUES_RETIRO as readonly string[]).includes(valor);
}

/**
 * Valida la fecha que llega del navegador. Devuelve null si no sirve —
 * nunca lanza: un dato opcional mal escrito no puede impedir una compra.
 *
 * Se compara contra la fecha de Chile, no contra la del servidor: Vercel
 * corre en UTC y a partir de las 21:00 de Chile "hoy" allá ya es mañana,
 * así que un cliente que agendara para hoy a las 22:00 vería su fecha
 * rechazada por estar "en el pasado".
 */
export function normalizarFechaRetiro(valor: unknown): string | null {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;

  const hoyChile = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  if (valor < hoyChile) return null;

  const limite = new Date(`${hoyChile}T12:00:00`);
  limite.setDate(limite.getDate() + DIAS_MAXIMOS_RETIRO);
  if (valor > limite.toLocaleDateString("en-CA")) return null;

  return valor;
}

/** "viernes 26 de septiembre" — para los correos y el panel. */
export function fechaRetiroLegible(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
