import Link from "next/link";
import { buscarCatalogo, listarCategorias } from "@/lib/catalogo";
import { TarjetaProducto } from "@/components/tarjeta-producto";

export const revalidate = 60;

interface PropsPagina {
  searchParams: Promise<{ categoria?: string; q?: string }>;
}

export default async function Productos({ searchParams }: PropsPagina) {
  const { categoria, q } = await searchParams;

  let productos: Awaited<ReturnType<typeof buscarCatalogo>> = [];
  let categorias: string[] = [];
  let error = false;
  try {
    [productos, categorias] = await Promise.all([buscarCatalogo({ categoria, q }), listarCategorias()]);
  } catch (err) {
    console.error("[Productos] No se pudo cargar el catálogo:", err instanceof Error ? err.message : err);
    error = true;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        {categoria || (q ? `Resultados para "${q}"` : "Todos los productos")}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {productos.length} producto{productos.length === 1 ? "" : "s"} disponible{productos.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/productos"
          className={`rounded-full border px-3 py-1 text-sm ${
            !categoria ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Todas
        </Link>
        {categorias.map((c) => (
          <Link
            key={c}
            href={`/productos?categoria=${encodeURIComponent(c)}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              categoria === c ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="mt-10 text-zinc-500">El catálogo no está disponible en este momento.</p>
      ) : productos.length === 0 ? (
        <p className="mt-10 text-zinc-500">No se encontraron productos con ese filtro.</p>
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
