import Image from "next/image";
import Link from "next/link";
import { obtenerProductosPorSku } from "@/lib/catalogo";
import { ScrollReveal } from "@/components/fx/scroll-reveal";
import { formatoCLP } from "@/lib/formato";
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
          const producto = productos[c.sku];
          const foto = producto?.imagen_urls?.[0] ?? null;
          return (
            <ScrollReveal key={c.nombre} delay={i * 0.08}>
              <Link
                href={`/productos?categoria=${encodeURIComponent(c.nombre)}`}
                className="panel-hud group relative flex flex-col overflow-hidden rounded-2xl transition-transform duration-200 hover:-translate-y-1"
              >
                {/* Franja de título SIEMPRE arriba de la foto, en su propio
                    fondo sólido — nunca superpuesta a la imagen. Con fotos
                    de producto reales (empaques con su propio texto y
                    contraste variable), un título flotando encima corre el
                    riesgo real de quedar ilegible; en su franja aparte, se
                    lee igual sin importar qué foto haya debajo. Altura fija
                    (min-h) y todo centrado: "Componentes PC" ocupa dos
                    líneas y las otras dos etiquetas una sola — sin la altura
                    fija, esa franja quedaba más baja que las demás y las
                    tres fotos arrancaban a distinta altura, desalineando la
                    fila entera. */}
                <div className="relative z-10 flex min-h-[92px] flex-col items-center justify-center gap-1 border-b border-primary/30 bg-surface-sunken px-4 py-3.5 text-center">
                  <span className="font-display text-lg font-bold uppercase leading-tight tracking-tight text-ink texto-glow-primary sm:text-xl">
                    {c.etiqueta}
                  </span>
                  {producto && (
                    <span className="precio-gamer text-sm text-ink-soft">{formatoCLP.format(producto.precio_web)}</span>
                  )}
                </div>
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunken">
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
                    className="absolute inset-0 bg-gradient-to-t from-surface-sunken/60 via-transparent to-transparent transition-opacity duration-200 group-hover:opacity-90"
                  />
                </div>
              </Link>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
