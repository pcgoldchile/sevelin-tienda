import type { Metadata } from "next";
import { publicadosEnMemoria } from "@/lib/catalogo-memoria";
import { rutaDeSku } from "@/lib/sku-url";
import { AsistenteQueMeSirve, type ProductoAsistente } from "@/components/asistente-que-me-sirve";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "¿Qué me sirve? Te ayudamos a elegir",
  description: "Responde dos o tres preguntas y te decimos qué cable, monitor, cargador, batería portátil, audífonos, pendrive o mouse te sirve, con lo que hay hoy en Sevelin, Arica.",
  alternates: { canonical: "/que-me-sirve" },
};

const CATEGORIAS = new Set(["Monitores", "Cables y Adaptadores", "Cargadores", "Energía Portátil", "Audio", "Almacenamiento", "Periféricos"]);

/**
 * "¿Qué me sirve?" (#8, 18-10-2026). Preguntas cortas que recomiendan con lo
 * que hay hoy en tienda (con stock), usando las casillas de los filtros. Si no
 * hay nada que calce, ofrece conseguirlo por WhatsApp.
 */
export default async function QueMeSirve() {
  let productos: ProductoAsistente[] = [];
  try {
    productos = (await publicadosEnMemoria())
      .filter((p) => p.categoria && CATEGORIAS.has(p.categoria) && p.stock_web > 0 && !p.es_pedido_encargo && !p.precio_a_consultar)
      .map((p) => ({
        sku: p.sku,
        nombre: p.nombre,
        precio: p.precio_web,
        imagen: p.imagen_urls?.[0] ?? null,
        ruta: `/productos/${rutaDeSku(p.sku)}`,
        categoria: p.categoria as string,
        subcategoria: p.subcategoria ?? null,
        caracteristicas: (p.caracteristicas && typeof p.caracteristicas === "object" ? p.caracteristicas : {}) as Record<string, string[]>,
      }));
  } catch (err) {
    console.error("[QueMeSirve]", err instanceof Error ? err.message : err);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">¿Qué me sirve?</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Responde unas preguntas y te mostramos lo que te sirve de lo que tenemos hoy en tienda. Si no está, te lo conseguimos.
      </p>
      <AsistenteQueMeSirve productos={productos} whatsapp={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? null} />
    </main>
  );
}
