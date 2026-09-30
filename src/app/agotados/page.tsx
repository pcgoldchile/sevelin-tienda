import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, BellRing, Truck } from "lucide-react";
import { listarAgotados } from "@/lib/agotados";
import { TarjetaProducto } from "@/components/tarjeta-producto";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Agotados — te los conseguimos | Sevelin Arica",
  description:
    "Productos que se agotaron en Sevelin. Pídelos por encargo o cotízalos por WhatsApp, o deja tu correo y te avisamos apenas vuelvan.",
};

/**
 * Agotados (30-09-2026). Un agotado no aparece en el catálogo normal (ahí
 * solo está lo que se puede llevar hoy), así que quien lo buscaba no tenía
 * dónde encontrarlo. Esta página los junta con las tres salidas: pedirlo por
 * encargo o cotizarlo (WhatsApp, en la ficha), esperar con el aviso por
 * correo, o reservarlo si viene en camino (eso vive en /por-llegar).
 */
export default async function Agotados() {
  let productos: Awaited<ReturnType<typeof listarAgotados>> = [];
  let error = false;
  try {
    productos = await listarAgotados();
  } catch (err) {
    console.error("[Agotados] No se pudo cargar el listado:", err instanceof Error ? err.message : err);
    error = true;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">Agotados</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Estos productos se nos agotaron, pero muchos te los podemos conseguir. Abre el que te interesa y
        elige cómo seguir.
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="text-sm text-ink-soft">
            <strong className="text-ink">Pídelo por encargo.</strong> Escríbenos por WhatsApp desde el
            producto y te decimos si lo traemos y en cuánto tiempo.
          </span>
        </li>
        <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="text-sm text-ink-soft">
            <strong className="text-ink">Te avisamos cuando vuelva.</strong> Deja tu correo en el
            producto, sin compromiso.
          </span>
        </li>
        <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="text-sm text-ink-soft">
            <strong className="text-ink">¿Viene en camino?</strong> Lo que ya tiene fecha de llegada se
            puede reservar en{" "}
            <Link href="/por-llegar" className="text-accent hover:underline">Por llegar</Link>.
          </span>
        </li>
      </ul>

      {error ? (
        <p className="mt-10 text-sm text-ink-soft">
          No pudimos cargar el listado en este momento. Intenta de nuevo en unos minutos.
        </p>
      ) : productos.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">
          No hay productos agotados en este momento. Mira{" "}
          <Link href="/productos" className="text-accent hover:underline">todo el catálogo</Link>.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {productos.map((p) => (
            <TarjetaProducto key={p.id} producto={p} />
          ))}
        </div>
      )}
    </main>
  );
}
