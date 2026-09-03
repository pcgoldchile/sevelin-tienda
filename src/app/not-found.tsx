import Link from "next/link";
import { Search } from "lucide-react";
import { listarMasVendidos } from "@/lib/catalogo";
import { TarjetaProducto } from "@/components/tarjeta-producto";

/**
 * Antes era una página estática sin ninguna salida real más que "volver al
 * inicio" — alguien que llega por un link roto (compartido, viejo, mal
 * copiado) se iba sin ver nada del catálogo. Ahora es un Server Component
 * async: un buscador real (formulario GET nativo, funciona sin JS) y los
 * productos más vendidos, mismo criterio que el home ("Destacados").
 */
export default async function NoEncontrado() {
  const masVendidos = await listarMasVendidos(4).catch(() => []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <span className="font-display text-6xl font-bold text-primary">404</span>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">No encontramos esta página</h1>
      <p className="mt-2 text-sm text-ink-soft">
        El producto o la página que buscas ya no está disponible, o la dirección tiene un error.
      </p>

      <form action="/productos" method="get" className="mx-auto mt-6 flex max-w-sm">
        <input
          type="search"
          name="q"
          placeholder="Buscar productos…"
          className="w-full rounded-l-md border border-border bg-surface-sunken/60 px-4 py-2 text-sm outline-none transition-colors focus:border-primary focus:bg-surface"
        />
        <button
          type="submit"
          className="rounded-r-md border border-l-0 border-border px-3 text-ink-soft transition-colors hover:bg-surface-sunken hover:text-primary"
          aria-label="Buscar"
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
      </form>

      <div className="mt-4 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep"
        >
          Volver al inicio
        </Link>
        <Link
          href="/productos"
          className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-primary hover:text-primary"
        >
          Ver catálogo
        </Link>
      </div>

      {masVendidos.length > 0 && (
        <div className="mt-14 text-left">
          <h2 className="font-display mb-5 text-center text-lg font-bold uppercase tracking-tight text-ink">
            Lo más vendido
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {masVendidos.map((p) => (
              <TarjetaProducto key={p.id} producto={p} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
