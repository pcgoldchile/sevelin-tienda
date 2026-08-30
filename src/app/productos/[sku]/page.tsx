import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerProductoPorSku } from "@/lib/catalogo";
import { formatoCLP } from "@/lib/formato";
import { sanitizarDescripcionHtml } from "@/lib/sanitizar-html";
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

  // El sanitizador se carga de forma diferida (ver src/lib/sanitizar-html.ts)
  const descripcionSegura = producto.descripcion_web
    ? await sanitizarDescripcionHtml(producto.descripcion_web)
    : '';

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
          <span className="precio-gamer text-3xl text-ink">{formatoCLP.format(producto.precio_web)}</span>

          {/* El "buy box" va INMEDIATAMENTE después del precio, antes de
              la descripción — no al final. Con descripciones largas (las
              de servicios técnicos pasan de 2.500 caracteres) el botón
              "Agregar al carrito" quedaba a un scroll largo de distancia.
              `lg:sticky` además lo mantiene a la vista mientras se lee la
              descripción en pantallas anchas, sin competir con el header
              (que es sticky top-0 z-40): top-24 dejando el hueco y z-10
              quedando siempre por debajo. En móvil no hace falta sticky:
              el reordenamiento solo ya lo deja visible sin scroll. */}
          <div className="lg:sticky lg:top-24 lg:z-10">
            <AccionesProducto producto={producto} />
          </div>

          {producto.descripcion_web && (
            <div className="descripcion-producto rounded-2xl border border-border bg-surface/60 p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-ink">
                <span className="texto-glow-primary text-primary">/</span> Descripción
              </h2>
              {/* El HTML que llega acá ya viene estructurado por
                  sanitizarDescripcionHtml() (título / lista / párrafos —
                  ver src/lib/formatear-descripcion.ts): el texto plano que
                  guarda el POS pasa a tener jerarquía visual real en vez
                  de un bloque plano. whitespace-pre-line se mantiene como
                  red de seguridad: si el sanitizador falla, el respaldo
                  devuelve texto escapado con saltos de línea sueltos, y
                  sin esta clase se perderían. */}
              <div
                className="whitespace-pre-line text-sm leading-relaxed text-ink-soft
                  [&_a]:text-accent [&_a]:underline [&_a:hover]:text-accent-deep
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol_li]:mt-1.5
                  [&_p]:leading-relaxed [&_p+p]:mt-3
                  [&_strong]:font-semibold [&_strong]:text-ink
                  [&_h3]:mb-2.5 [&_h3]:mt-6 [&_h3]:flex [&_h3]:items-center [&_h3]:gap-2
                  [&_h3]:border-b [&_h3]:border-primary/25 [&_h3]:pb-2
                  [&_h3]:text-xs [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-[0.12em] [&_h3]:text-primary
                  [&_h3:first-child]:mt-0
                  [&_ul]:m-0 [&_ul]:grid [&_ul]:list-none [&_ul]:gap-2 [&_ul]:p-0 sm:[&_ul]:grid-cols-2
                  [&_li]:relative [&_li]:flex [&_li]:items-start [&_li]:gap-2.5
                  [&_li]:rounded-lg [&_li]:border [&_li]:border-border [&_li]:bg-surface-sunken/60
                  [&_li]:px-3 [&_li]:py-2.5 [&_li]:leading-snug
                  [&_li]:transition-colors [&_li]:hover:border-primary/40
                  [&_li]:before:flex [&_li]:before:h-5 [&_li]:before:w-5 [&_li]:before:shrink-0
                  [&_li]:before:items-center [&_li]:before:justify-center [&_li]:before:rounded-full
                  [&_li]:before:bg-primary/15 [&_li]:before:text-[11px] [&_li]:before:font-bold
                  [&_li]:before:text-primary [&_li]:before:content-['✓']"
                dangerouslySetInnerHTML={{ __html: descripcionSegura }}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
