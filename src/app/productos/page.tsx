import Link from "next/link";
import { buscarCatalogo, esOrdenCatalogoValido, listarCategorias } from "@/lib/catalogo";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { SelectorOrden } from "@/components/selector-orden";

export const revalidate = 60;

interface PropsPagina {
  searchParams: Promise<{ categoria?: string; q?: string; orden?: string }>;
}

export default async function Productos({ searchParams }: PropsPagina) {
  const { categoria, q, orden } = await searchParams;
  const ordenActual = esOrdenCatalogoValido(orden) ? orden : "relevancia";

  let productos: Awaited<ReturnType<typeof buscarCatalogo>> = [];
  let categorias: string[] = [];
  let error = false;
  try {
    [productos, categorias] = await Promise.all([
      buscarCatalogo({ categoria, q, orden: ordenActual }),
      listarCategorias(),
    ]);
  } catch (err) {
    console.error("[Productos] No se pudo cargar el catálogo:", err instanceof Error ? err.message : err);
    error = true;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        {categoria || (q ? `Resultados para "${q}"` : "Todos los productos")}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {productos.length} producto{productos.length === 1 ? "" : "s"} disponible{productos.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/productos"
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              !categoria ? "border-primary bg-primary text-white" : "border-border text-ink-soft hover:bg-surface-sunken"
            }`}
          >
            Todas
          </Link>
          {categorias.map((c) => (
            <Link
              key={c}
              href={`/productos?categoria=${encodeURIComponent(c)}`}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                categoria === c ? "border-primary bg-primary text-white" : "border-border text-ink-soft hover:bg-surface-sunken"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>
        <SelectorOrden ordenActual={ordenActual} categoria={categoria} q={q} />
      </div>

      {error ? (
        <p className="mt-10 text-ink-soft">El catálogo no está disponible en este momento.</p>
      ) : productos.length === 0 ? (
        <p className="mt-10 text-ink-soft">No se encontraron productos con ese filtro.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {productos.map((producto) => (
            <TarjetaProducto key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </main>
  );
}
