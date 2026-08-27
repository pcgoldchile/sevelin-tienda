/**
 * Costo de envío del checkout — Fase 3.
 *
 * La cotización real (Haversine local + Shipit courier) es Fase 4 y todavía
 * no existe. Mientras tanto se usa una tarifa plana fija (confirmado con el
 * usuario): no distingue zona ni método, pero cumple el
 * `CHECK (costo_envio > 0)` de `pedidos_web` sin inventar un cálculo que no
 * existe. Se reemplaza por la cotización real en la Fase 4 sin tocar el
 * resto del checkout — este es el único punto de la app que sabe el costo
 * de envío.
 */
export function costoEnvioPlano(): number {
  const valor = Number(process.env.COSTO_ENVIO_PLANO);
  if (!valor || valor <= 0) {
    throw new Error(
      'COSTO_ENVIO_PLANO no está configurado (o es <= 0): ver .env.local.example.'
    );
  }
  return valor;
}
