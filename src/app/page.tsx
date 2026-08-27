import Link from "next/link";
import { listarCatalogo } from "@/lib/catalogo";
import { HeroCarrusel } from "@/components/hero-carrusel";
import { FranjaConfianza } from "@/components/franja-confianza";
import { TarjetaProducto } from "@/components/tarjeta-producto";

// ISR: el catálogo no cambia segundo a segundo (se sincroniza vía webhook
// desde el POS), así que 60s de cache es suficiente para una navegación
// fluida sin pegarle a Supabase en cada visita.
export const revalidate = 60;

const CANTIDAD_DESTACADOS = 8;

export default async function Home() {
  /* Si Supabase Web todavía no está configurado (o tiene un problema
     transitorio), se muestra la sección de destacados vacía en vez de
     tumbar la página completa con un error 500 — tanto en producción como
     al compilar (`next build` prerenderiza esta página, y sin credenciales
     reales fallaría el build entero sin este manejo). */
  let productos: Awaited<ReturnType<typeof listarCatalogo>> = [];
  let errorCatalogo = false;
  try {
    productos = await listarCatalogo();
  } catch (err) {
    console.error("[Home] No se pudo cargar el catálogo:", err instanceof Error ? err.message : err);
    errorCatalogo = true;
  }

  const destacados = productos.slice(0, CANTIDAD_DESTACADOS);

  return (
    <main className="flex flex-col">
      <HeroCarrusel />

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Destacados</h2>
          <Link href="/productos" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
            Ver todos →
          </Link>
        </div>

        {errorCatalogo ? (
          <p className="mt-10 text-zinc-500">
            El catálogo no está disponible en este momento. Si esto persiste, revisa
            <code className="mx-1 rounded bg-zinc-100 px-1">SUPABASE_WEB_URL</code> /
            <code className="mx-1 rounded bg-zinc-100 px-1">SUPABASE_WEB_SERVICE_ROLE_KEY</code>.
          </p>
        ) : destacados.length === 0 ? (
          <p className="mt-10 text-zinc-500">
            Todavía no hay productos publicados en la tienda. Se publican desde el modal de producto
            del POS (toggle &quot;Publicar en la web&quot;).
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {destacados.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </section>

      <FranjaConfianza />
    </main>
  );
}
