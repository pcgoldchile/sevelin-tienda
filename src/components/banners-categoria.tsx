import Image from "next/image";
import Link from "next/link";
import { obtenerProductosPorSku } from "@/lib/catalogo";
import { ScrollReveal } from "@/components/fx/scroll-reveal";
import type { ProductoWeb } from "@/lib/tipos";

// Accesos directos a las 3 categorías principales del catálogo — mismo
// criterio que HeroCarrusel: sin panel de gestión (fuera de alcance), estas
// 3 franjas son fijas y se editan acá directo. Los nombres deben coincidir
// EXACTO con producto_categorias del POS (categoria_web sincronizado a
// productos_web.categoria) para que el link de filtro funcione. Cada banner
// usa la foto real de un producto propio del catálogo (elegido a mano, por
// SKU — ver obtenerProductosPorSku en src/lib/catalogo.ts), no una imagen
// genérica bajada de internet.
const CATEGORIAS_DESTACADAS = [
  { nombre: "Monitores", etiqueta: "Monitores", sku: "monitor-gamer-msi-mag-255f-e20-24-5-full-hd-rapid-ips-200hz-0-5ms" },
  { nombre: "Componentes PC", etiqueta: "Componentes PC", sku: "msi-a520m-pro" },
  { nombre: "Periféricos", etiqueta: "Periféricos", sku: "RCWU85442" },
];

export async function BannersCategoria() {
  const productos = await obtenerProductosPorSku(CATEGORIAS_DESTACADAS.map((c) => c.sku)).catch(
    () => ({}) as Record<string, ProductoWeb>
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CATEGORIAS_DESTACADAS.map((c, i) => {
          const foto = productos[c.sku]?.imagen_urls?.[0] ?? null;
          return (
            <ScrollReveal key={c.nombre} delay={i * 0.08}>
              <Link
                href={`/productos?categoria=${encodeURIComponent(c.nombre)}`}
                className="panel-hud group relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl transition-transform duration-200 hover:-translate-y-1"
              >
                {foto ? (
                  <Image
                    src={foto}
                    alt={c.etiqueta}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(min-width: 640px) 33vw, 100vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-surface-sunken" />
                )}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-surface-sunken via-surface-sunken/40 to-transparent transition-opacity duration-200 group-hover:opacity-90"
                />
                <span className="relative z-10 p-5 font-display text-xl font-bold uppercase tracking-tight text-ink texto-glow-primary transition-transform duration-200 group-hover:-translate-y-1 group-hover:text-primary">
                  {c.etiqueta}
                </span>
              </Link>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
