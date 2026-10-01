/** Formato de moneda compartido (CLP, sin decimales) — usar SIEMPRE esta instancia. */
export const formatoCLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

/** Umbral por defecto cuando el producto no trae uno propio desde el POS. */
const UMBRAL_STOCK_POR_DEFECTO = 5;

/**
 * Texto de disponibilidad mostrado al cliente: nunca el stock real cuando
 * hay abundancia (evita filtrar inventario exacto a la competencia), pero
 * nunca oculta un stock realmente bajo (evita prometer "harto stock"
 * cuando en realidad quedan 2 unidades). El umbral se configura por
 * producto desde el POS (módulo "Página Web → Categorías").
 */
export function formatoStock(stock: number, umbral: number | null): string {
  const umbralEfectivo = umbral ?? UMBRAL_STOCK_POR_DEFECTO;
  if (stock >= umbralEfectivo) return `Más de ${umbralEfectivo - 1} disponibles`;
  if (stock <= 0) return "Sin stock";
  return stock === 1 ? "Última unidad disponible" : `Últimas ${stock} unidades disponibles`;
}

/** "lunes 5 de octubre, 23:59" en hora de Chile, para decir hasta cuándo
 *  vale una oferta (supabase/37). Se fija la zona horaria a propósito: la
 *  página se arma en el servidor (UTC) y sin esto mostraría otra hora. */
export function fechaHoraOferta(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

const DIA_CHILE_FMT = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long" });
// "miércoles, 7 de octubre" → "miércoles 7 de octubre": con "hasta el" delante, la coma sobra.
const DIA_CHILE = { format: (fecha: Date) => DIA_CHILE_FMT.format(fecha).replace(",", "") };
// h23 y no hour12:false: así la medianoche es siempre "00:00", nunca "24:00".
const HORA_CHILE = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Cuándo TERMINA una oferta, como lo diría una persona. El fin se guarda
 *  excluido: una oferta "hasta el miércoles 7" termina el jueves 8 a las
 *  00:00, y mostrar "jueves 8, 00:00" confunde. Si cae justo a medianoche se
 *  dice el día anterior; si no, el día y la hora. */
export function finDeOfertaLegible(iso: string): string {
  const fin = new Date(iso);
  if (HORA_CHILE.format(fin) === "00:00") return DIA_CHILE.format(new Date(fin.getTime() - 60_000));
  return `${DIA_CHILE.format(fin)} a las ${HORA_CHILE.format(fin)}`;
}

/** Cuándo EMPIEZA una oferta: "lunes 5 de octubre" (con la hora si no es medianoche). */
export function inicioDeOfertaLegible(iso: string): string {
  const inicio = new Date(iso);
  const hora = HORA_CHILE.format(inicio);
  return hora === "00:00" ? DIA_CHILE.format(inicio) : `${DIA_CHILE.format(inicio)} a las ${hora}`;
}
