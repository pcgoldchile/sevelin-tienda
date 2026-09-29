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
