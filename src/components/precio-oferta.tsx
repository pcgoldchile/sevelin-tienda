import { formatoCLP } from "@/lib/formato";
import { porcentajeDescuento } from "@/lib/oferta";

/**
 * "Antes $X · −N%" para un producto con oferta vigente (supabase/37). No
 * renderiza nada si no hay oferta. El precio grande (el que se cobra) lo
 * sigue pintando cada pantalla con su propio estilo; esto va al lado.
 * Tachado con <s> + texto "Antes" para lectores de pantalla: el tachado
 * solo no se anuncia.
 */
export function PrecioAntes({
  precioAntes,
  precio,
  className = "",
}: {
  precioAntes: number | null | undefined;
  precio: number;
  className?: string;
}) {
  const porcentaje = porcentajeDescuento(precioAntes, precio);
  if (!precioAntes || porcentaje === null) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-xs text-ink-faint">
        <span className="sr-only">Antes </span>
        <s>{formatoCLP.format(precioAntes)}</s>
      </span>
      {porcentaje > 0 && (
        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-bold text-primary-soft">
          −{porcentaje}%
        </span>
      )}
    </span>
  );
}
