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
