"use client";

import { useEffect } from "react";

/**
 * Cuenta una vista de la ficha de un producto (panel "Más buscados / más vistos" del POS).
 *
 * 28-10-2026 (auditoría de costos): antes lo hacía la propia página en el servidor con after(),
 * y eso obligaba a armar la ficha de cero en cada visita, robots incluidos. Ahora la ficha queda
 * en caché (generateStaticParams vacío + revalidate) y la vista la avisa el navegador de quien
 * la mira de verdad: los robots que no ejecutan JavaScript ya no cuentan ni gastan. No renderiza nada.
 */
export function RegistrarVistaProducto({ productoPosId }: { productoPosId: number }) {
  useEffect(() => {
    if (!Number.isInteger(productoPosId) || productoPosId <= 0) return;
    fetch("/api/eventos/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ vista_producto_id: productoPosId }),
    }).catch(() => {
      // Mejor esfuerzo: un fallo acá nunca afecta la ficha.
    });
  }, [productoPosId]);
  return null;
}
