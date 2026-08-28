import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerProductoPorSku } from "@/lib/catalogo";
import { formatoCLP } from "@/lib/formato";
import { GaleriaProducto } from "@/components/galeria-producto";
import { AccionesProducto } from "@/components/acciones-producto";

export const revalidate = 60;

interface PropsPagina {
  params: Promise<{ sku: string }>;
}

export default async function FichaProducto({ params }: PropsPagina) {
  const { sku } = await params;

  // Mismo criterio que Home/Productos: si Supabase Web no responde, se
  // muestra un estado de error en vez de tumbar la página con un 500.
  let producto: Awaited<ReturnType<typeof obtenerProductoPorSku>>;
  try {
    producto = await obtenerProductoPorSku(sku);
  } catch (err) {
    console.error("[FichaProducto] No se pudo cargar el producto:", err instanceof Error ? err.message : err);
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-ink-soft">El catálogo no está disponible en este momento.</p>
      </main>
    );
  }
  if (!producto) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-ink-faint">
        <Link href="/" className="transition-colors hover:text-accent">Inicio</Link>
        <span className="mx-1.5">/</span>
        <Link href="/productos" className="transition-colors hover:text-accent">Productos</Link>
        {producto.categoria && (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`/productos?categoria=${encodeURIComponent(producto.categoria)}`} className="transition-colors hover:text-accent">
              {producto.categoria}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <GaleriaProducto imagenes={producto.imagen_urls || []} nombre={producto.nombre} />

        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{producto.nombre}</h1>
          <span className="text-2xl font-bold text-primary tabular-nums">{formatoCLP.format(producto.precio_web)}</span>

          {producto.descripcion_web && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{producto.descripcion_web}</p>
          )}

          <div className="mt-2">
            <AccionesProducto producto={producto} />
          </div>
        </div>
      </div>
    </main>
  );
}
