import Image from "next/image";
import { listarCatalogo } from "@/lib/catalogo";

// ISR: el catálogo no cambia segundo a segundo (se sincroniza vía webhook
// desde el POS), así que 60s de cache es suficiente para una navegación
// fluida sin pegarle a Supabase en cada visita.
export const revalidate = 60;

const formatoCLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

export default async function Home() {
  /* Si Supabase Web todavía no está configurado (o tiene un problema
     transitorio), se muestra el catálogo vacío en vez de tumbar la página
     completa con un error 500 — tanto en producción como al compilar
     (`next build` prerenderiza esta página, y sin credenciales reales
     fallaría el build entero sin este manejo). */
  let productos: Awaited<ReturnType<typeof listarCatalogo>> = [];
  let errorCatalogo = false;
  try {
    productos = await listarCatalogo();
  } catch (err) {
    console.error("[Home] No se pudo cargar el catálogo:", err instanceof Error ? err.message : err);
    errorCatalogo = true;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Catálogo Sevelin</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {productos.length} producto{productos.length === 1 ? "" : "s"} disponible{productos.length === 1 ? "" : "s"}
      </p>

      {errorCatalogo ? (
        <p className="mt-10 text-zinc-500">
          El catálogo no está disponible en este momento. Si esto persiste, revisa
          <code className="mx-1 rounded bg-zinc-100 px-1">SUPABASE_WEB_URL</code> /
          <code className="mx-1 rounded bg-zinc-100 px-1">SUPABASE_WEB_SERVICE_ROLE_KEY</code>.
        </p>
      ) : productos.length === 0 ? (
        <p className="mt-10 text-zinc-500">
          Todavía no hay productos publicados en la tienda. Se publican desde el modal de producto
          del POS (toggle &quot;Publicar en la web&quot;).
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {productos.map((producto) => (
            <article key={producto.id} className="flex flex-col overflow-hidden rounded-xl border border-zinc-200">
              <div className="relative aspect-square w-full bg-zinc-50">
                {producto.imagen_urls?.[0] ? (
                  <Image
                    src={producto.imagen_urls[0]}
                    alt={producto.nombre}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                    Sin foto
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <span className="text-xs text-zinc-400">{producto.sku}</span>
                <h2 className="text-sm font-medium text-zinc-900">{producto.nombre}</h2>
                <span className="mt-auto text-base font-semibold text-zinc-900">
                  {formatoCLP.format(producto.precio_web)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
