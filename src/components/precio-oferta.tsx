import { formatoCLP } from "@/lib/formato";
import { porcentajeDescuento } from "@/lib/oferta";

/**
 * "Antes $X · −N%" para un producto con oferta vigente (supabase/37). No
 * renderiza nada si no hay oferta. El precio grande (el que se cobra) lo
 * sigue pintando cada pantalla con su propio estilo; esto va ARRIBA de él,
 * como en cualquier vitrina: primero lo que costaba, después lo que cuesta.
 * Tachado con <s> + texto "Antes" para lectores de pantalla: el tachado
 * solo no se anuncia.
 *
 * El "antes" es siempre el precio web normal que se cobraba (lo resuelve
 * aplicarOferta en src/lib/oferta.ts), nunca uno inventado.
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
      <span className="text-[0.95em] text-ink-soft">
        <span className="sr-only">Antes </span>
        <s className="decoration-amber-400/80 decoration-2">{formatoCLP.format(precioAntes)}</s>
      </span>
      {porcentaje > 0 && (
        <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[0.85em] font-extrabold leading-none text-surface-sunken">
          −{porcentaje}%
        </span>
      )}
    </span>
  );
}

/**
 * "Ahorras $X" bajo el precio de oferta (03-10-2026, pedido del dueño: que
 * el ahorro se vea). Es la resta exacta entre el precio normal y el de
 * oferta: no se redondea hacia arriba ni se promete de más.
 */
export function AhorroOferta({
  precioAntes,
  precio,
  className = "",
}: {
  precioAntes: number | null | undefined;
  precio: number;
  className?: string;
}) {
  if (!precioAntes || precioAntes <= precio) return null;
  return (
    <span className={`inline-flex w-fit items-center rounded bg-success-soft px-1.5 py-0.5 font-semibold text-success ${className}`}>
      Ahorras {formatoCLP.format(precioAntes - precio)}
    </span>
  );
}
