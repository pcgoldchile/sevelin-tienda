import type { Metadata } from "next";
import { listarPorLlegar } from "@/lib/encargos";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { AvisoPagoTarjeta } from "@/components/aviso-pago-tarjeta";
import { Truck, ShieldCheck, BellRing } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Por llegar — productos en camino | Sevelin Arica",
  description:
    "Productos que vienen en camino a Sevelin. Resérvalos ahora y te avisamos apenas lleguen a la tienda en Arica. Si no llegan, te devolvemos el 100%.",
};

/**
 * Sección propia, separada de /productos y de /pedidos-por-encargo.
 *
 * No se mezcla con el catálogo normal porque acá nada está disponible
 * todavía: meterlos entre los productos que sí se pueden llevar hoy haría
 * que el cliente agregue al carrito algo que no va a recibir en el momento
 * que espera. Y no se mezcla con Encargos porque son cosas distintas — un
 * encargo se pide al proveedor cuando alguien lo compra y es permanente;
 * esto ya viene en camino, con fecha, y deja de estar acá al llegar.
 */
export default async function PorLlegar() {
  let productos: Awaited<ReturnType<typeof listarPorLlegar>> = [];
  let error = false;
  try {
    productos = await listarPorLlegar();
  } catch (err) {
    console.error("[PorLlegar] No se pudo cargar el listado:", err instanceof Error ? err.message : err);
    error = true;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
        🚚 Por llegar
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Estos productos vienen en camino y todavía no están en la tienda. Puedes reservarlos ahora:
        quedan apartados a tu nombre y te avisamos por correo apenas lleguen a Arica.
      </p>

      {/* Las tres reglas del trato, arriba y a la vista. Quien va a pagar
          por algo que aún no existe necesita saber exactamente qué está
          aceptando ANTES de mirar precios, no enterarse en los términos. */}
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="text-sm text-ink-soft">
            <strong className="text-ink">La fecha es estimada.</strong> Depende del proveedor y del
            transporte, así que puede adelantarse o correrse unos días.
          </span>
        </li>
        <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="text-sm text-ink-soft">
            <strong className="text-ink">Si no llega, te devolvemos el 100%.</strong> Sin trámites y
            sin preguntas.
          </span>
        </li>
        <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="text-sm text-ink-soft">
            <strong className="text-ink">¿Prefieres no pagar aún?</strong> Deja tu correo en el
            producto y te avisamos cuando llegue, sin compromiso.
          </span>
        </li>
      </ul>

      <p className="mt-5 text-sm text-ink-soft">
        {productos.length} producto{productos.length === 1 ? "" : "s"} en camino
      </p>

      <div className="mt-5">
        <AvisoPagoTarjeta />
      </div>

      {error ? (
        <p className="mt-10 text-ink-soft">Esta sección no está disponible en este momento.</p>
      ) : productos.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface-sunken/60 p-6 text-center">
          <p className="text-ink">Por ahora no hay productos en camino.</p>
          <p className="mt-1.5 text-sm text-ink-soft">
            Cuando tengamos algo por llegar lo vas a ver acá. Mientras tanto, mira{" "}
            <a href="/productos" className="text-accent hover:underline">
              todo lo que ya está disponible
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {productos.map((producto) => (
            <TarjetaProducto key={producto.sku} producto={producto} />
          ))}
        </div>
      )}
    </main>
  );
}
