/** Formato de moneda compartido (CLP, sin decimales) — usar SIEMPRE esta instancia. */
export const formatoCLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
