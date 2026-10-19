import type { Metadata } from "next";
import Link from "next/link";
import { PackageCheck, Store, Truck } from "lucide-react";
import { GrillaConFiltros } from "@/components/grilla-con-filtros";
import { listarLiquidacion } from "@/lib/liquidacion";
import type { ProductoWeb } from "@/lib/tipos";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Liquidación",
  description: "Productos en liquidación en Sevelin, Arica: últimas unidades a precio de salida, con retiro en tienda y entrega el mismo día en Arica.",
  alternates: { canonical: "/liquidacion" },
};

/**
 * Liquidación (dueño, 15-10-2026). Junta lo que el dueño marcó con la
 * etiqueta LIQUIDACION en el POS: productos antiguos o fuera de temporada que
 * quiere sacar. Cada uno sigue en su categoría; esta página solo los reúne.
 * Cuando se agotan o el dueño quita la etiqueta, desaparecen solos.
 */
export default async function Liquidacion({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  let productos: ProductoWeb[] = [];
  let error = false;
  try {
    productos = await listarLiquidacion();
  } catch (err) {
    console.error("[Liquidación] No se pudo cargar el listado:", err instanceof Error ? err.message : err);
    error = true;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">Liquidación</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Últimas unidades a precio de salida: modelos de temporadas anteriores que no vamos a reponer. Cuando se acaban, no vuelven.
      </p>

      {productos.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
            <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="text-sm text-ink-soft">
              <strong className="text-ink">Pocas unidades.</strong> El precio vale mientras quede stock de cada producto.
            </span>
          </li>
          <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="text-sm text-ink-soft">
              <strong className="text-ink">En Arica lo recibes hoy.</strong> Si compras antes de las 20:00 te lo llevamos el mismo día.
            </span>
          </li>
          <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="text-sm text-ink-soft">
              <strong className="text-ink">Retiro en tienda gratis.</strong> Y despacho por courier al resto de Chile.
            </span>
          </li>
        </ul>
      )}

      {error ? (
        <p className="mt-10 text-sm text-ink-soft">No pudimos cargar la liquidación en este momento. Intenta de nuevo en unos minutos.</p>
      ) : productos.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">
          Hoy no hay productos en liquidación. Mira las{" "}
          <Link href="/ofertas" className="text-accent hover:underline">ofertas</Link> o{" "}
          <Link href="/productos" className="text-accent hover:underline">todo el catálogo</Link>.
        </p>
      ) : (
        <GrillaConFiltros productos={productos} params={params} ruta="/liquidacion" />
      )}
    </main>
  );
}
