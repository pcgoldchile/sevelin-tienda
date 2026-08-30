import Link from "next/link";
import { listarMasVendidos } from "@/lib/catalogo";
import { HeroCarrusel } from "@/components/hero-carrusel";
import { BannersCategoria } from "@/components/banners-categoria";
import { FranjaConfianza } from "@/components/franja-confianza";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { ScrollReveal } from "@/components/fx/scroll-reveal";

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
  /* "Destacados" = los más vendidos según el POS (`unidades_vendidas`, que
     el POS empuja vía POST /api/sync/mas-vendidos). Antes eran simplemente
     los 8 primeros del catálogo por orden alfabético, que no es un
     criterio: el A de "Adaptador" no dice nada de si el producto se vende. */
  let destacados: Awaited<ReturnType<typeof listarMasVendidos>> = [];
  let errorCatalogo = false;
  try {
    destacados = await listarMasVendidos(CANTIDAD_DESTACADOS);
  } catch (err) {
    console.error("[Home] No se pudo cargar el catálogo:", err instanceof Error ? err.message : err);
    errorCatalogo = true;
  }

  return (
    <main className="flex flex-col">
      <HeroCarrusel />
      <BannersCategoria />

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
              <span className="texto-glow-primary text-primary">/</span> Destacados
            </h2>
            <Link href="/productos" className="text-sm font-medium text-ink-soft transition-colors hover:text-primary">
              Ver todos →
            </Link>
          </div>
        </ScrollReveal>

        {errorCatalogo ? (
          <p className="mt-10 text-ink-soft">
            El catálogo no está disponible en este momento. Si esto persiste, revisa
            <code className="mx-1 rounded bg-surface-sunken px-1">SUPABASE_WEB_URL</code> /
            <code className="mx-1 rounded bg-surface-sunken px-1">SUPABASE_WEB_SERVICE_ROLE_KEY</code>.
          </p>
        ) : destacados.length === 0 ? (
          <p className="mt-10 text-ink-soft">
            Todavía no hay productos publicados en la tienda. Se publican desde el modal de producto
            del POS (toggle &quot;Publicar en la web&quot;).
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {destacados.map((producto, i) => (
              <ScrollReveal key={producto.id} delay={(i % 4) * 0.06} distancia={20}>
                <TarjetaProducto producto={producto} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>

      <FranjaConfianza />
    </main>
  );
}
