import { TarjetaProducto } from "@/components/tarjeta-producto";
import type { ProductoWeb } from "@/lib/tipos";

/**
 * "Complementa tu compra" (30-09-2026, supabase/38). Los productos que el
 * dueño eligió en el POS para acompañar a este (pasta térmica con una placa
 * madre, cables con un monitor, etc.), en el orden en que los eligió.
 *
 * Es una fila deslizable y no una grilla a propósito: son una sugerencia al
 * pasar, no el contenido de la página, y así no empujan la descripción ni
 * "También te puede interesar" hacia abajo. Sin JavaScript: el scroll con
 * snap lo resuelve el navegador (dedo en celular, rueda o barra en PC).
 */
export function CarruselComplementarios({ productos }: { productos: ProductoWeb[] }) {
  if (productos.length === 0) return null;

  return (
    <section className="mt-12" aria-labelledby="titulo-complementarios">
      <h2
        id="titulo-complementarios"
        className="font-display mb-1 text-xl font-bold uppercase tracking-tight text-ink"
      >
        Complementa tu compra
      </h2>
      <p className="mb-5 text-sm text-ink-soft">Lo que suele hacer falta junto con este producto.</p>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        {productos.map((p) => (
          <li key={p.id} className="w-[46%] shrink-0 snap-start sm:w-56">
            <TarjetaProducto producto={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
