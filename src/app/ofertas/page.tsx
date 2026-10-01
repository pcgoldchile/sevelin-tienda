import type { Metadata } from "next";
import Link from "next/link";
import { Store, Timer, Truck } from "lucide-react";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { finDeOfertaLegible, inicioDeOfertaLegible } from "@/lib/formato";
import { listarOfertas, tituloOfertas, type ListaOfertas } from "@/lib/ofertas";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Productos en oferta en Sevelin, Arica: precios rebajados por tiempo limitado, con entrega el mismo día en Arica y envíos a todo Chile.",
  alternates: { canonical: "/ofertas" },
};

/**
 * Todo lo que tiene oferta vigente (02-10-2026, para el Cyber del 5 al 7 de
 * octubre y cualquier promoción futura). Sin esta página las ofertas existen,
 * pero hay que encontrarlas producto por producto.
 *
 * No tiene un interruptor: las fechas vienen del POS con cada producto
 * (supabase/37). Antes de que empiecen se anuncia cuándo y qué productos
 * entran, al precio de hoy: el precio de oferta no se muestra por adelantado.
 */
export default async function Ofertas() {
  let ofertas: ListaOfertas = { vigentes: [], proximas: [], terminan: null, empiezan: null };
  let error = false;
  try {
    ofertas = await listarOfertas();
  } catch (err) {
    console.error("[Ofertas] No se pudo cargar el listado:", err instanceof Error ? err.message : err);
    error = true;
  }
  const { vigentes, proximas, terminan, empiezan } = ofertas;
  const titulo = tituloOfertas();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">{titulo}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        {vigentes.length > 0 && terminan
          ? <>Precios rebajados hasta el <strong className="text-ink">{finDeOfertaLegible(terminan)}</strong> o hasta que se acabe el stock. Después vuelven a su precio normal.</>
          : proximas.length > 0 && empiezan
            ? <>Las ofertas empiezan el <strong className="text-ink">{inicioDeOfertaLegible(empiezan)}</strong>. Estos son los productos que van a bajar de precio.</>
            : "Acá aparecen los productos con precio rebajado por tiempo limitado."}
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="text-sm text-ink-soft">
            <strong className="text-ink">En Arica lo recibes hoy.</strong> Si compras antes de las 18:00 te lo llevamos el mismo día.
          </span>
        </li>
        <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
          <Store className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="text-sm text-ink-soft">
            <strong className="text-ink">Retiro en tienda gratis.</strong> Y despacho por courier al resto de Chile.
          </span>
        </li>
        <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
          <Timer className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="text-sm text-ink-soft">
            <strong className="text-ink">Unidades limitadas.</strong> La oferta vale mientras quede stock de cada producto.
          </span>
        </li>
      </ul>

      {error ? (
        <p className="mt-10 text-sm text-ink-soft">No pudimos cargar las ofertas en este momento. Intenta de nuevo en unos minutos.</p>
      ) : vigentes.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {vigentes.map((p) => (
            <TarjetaProducto key={p.id} producto={p} />
          ))}
        </div>
      ) : proximas.length > 0 ? (
        <>
          <h2 className="mt-10 text-lg font-semibold text-ink">Entran en oferta ({proximas.length})</h2>
          <p className="mt-1 text-sm text-ink-soft">El precio que ves hoy es el normal.</p>
          <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {proximas.map((p) => (
              <TarjetaProducto key={p.id} producto={p} />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-10 text-sm text-ink-soft">
          Hoy no hay ofertas. Mira{" "}
          <Link href="/productos" className="text-accent hover:underline">todo el catálogo</Link>.
        </p>
      )}
    </main>
  );
}
