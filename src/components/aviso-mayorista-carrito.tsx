"use client";

import { useCarrito, type ItemCarrito } from "@/context/carrito-context";
import { formatoCLP } from "@/lib/formato";

/* Venta mayorista (supabase/39). Solo se ve con una cuenta mayorista
 * aprobada y productos con precio mayorista en el carrito. Lo que dice sale
 * de la misma regla con que cobra el checkout (resolverPreciosMayoristas). */
export function AvisoMayoristaCarrito({ className = "" }: { className?: string }) {
  const { mayorista } = useCarrito();
  if (!mayorista || !Object.values(mayorista.porSku).some(Boolean)) return null;

  if (mayorista.activo) {
    return (
      <p className={`rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-sm text-ink ${className}`}>
        🤝 Precios mayoristas aplicados.
      </p>
    );
  }
  if (mayorista.hayLineasQueCalifican) {
    return (
      <p className={`rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink-soft ${className}`}>
        🤝 Te faltan <strong className="text-ink">{formatoCLP.format(mayorista.faltante)}</strong> para el pedido mínimo
        mayorista ({formatoCLP.format(mayorista.pedidoMinimo)}, sin envío). Mientras, se cobra el precio normal.
      </p>
    );
  }
  return (
    <p className={`rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink-soft ${className}`}>
      🤝 Llega a la cantidad mínima de cada producto y a {formatoCLP.format(mayorista.pedidoMinimo)} (sin envío) para pagar precio mayorista.
    </p>
  );
}

/* Debajo del precio de una línea: si ya va a precio mayorista, lo dice; si
 * no, cuánto hay que llevar para que corra. */
export function PistaMayoristaLinea({ item }: { item: ItemCarrito }) {
  const { mayorista } = useCarrito();
  if (item.es_precio_mayorista) {
    return <span className="text-xs font-medium text-success">🤝 Precio mayorista</span>;
  }
  const datos = mayorista?.porSku[item.sku];
  if (!datos || datos.precio >= item.precio_web) return null;
  return (
    <span className="text-xs text-ink-faint">
      Mayorista {formatoCLP.format(datos.precio)} c/u desde {datos.desde} u.
    </span>
  );
}
