import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { obtenerProductoPorSku, productosRelacionados } from "@/lib/catalogo";
import { formatoCLP } from "@/lib/formato";
import { sanitizarDescripcionHtml } from "@/lib/sanitizar-html";
import { textoPlanoDesdeHtml, recortarEnPalabra } from "@/lib/texto-plano";
import { registrarVistaProducto } from "@/lib/eventos-web";
import { GaleriaProducto } from "@/components/galeria-producto";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { AccionesProducto } from "@/components/acciones-producto";
import { EtiquetaProductoBadge } from "@/components/etiqueta-producto-badge";
import { InfoEnvioProducto } from "@/components/info-envio-producto";

export const revalidate = 60;

interface PropsPagina {
  params: Promise<{ sku: string }>;
}

/**
 * SEO por producto — antes TODAS las fichas compartían el mismo
 * title/description del layout raíz (ver docs/CHANGELOG, hallazgo de la
 * sesión de SEO): Google las veía "iguales" entre sí, y compartir un link
 * de un producto puntual en WhatsApp/Instagram mostraba el logo genérico
 * del sitio en vez de la foto/precio real. `generateMetadata` corre en el
 * servidor ANTES de renderizar la página — mismo `obtenerProductoPorSku`
 * que ya usa el componente, sin pedirlo dos veces gracias al `fetch`
 * cacheado de Next para la misma request.
 */
export async function generateMetadata({ params }: PropsPagina): Promise<Metadata> {
  const { sku } = await params;
  const producto = await obtenerProductoPorSku(sku).catch(() => null);
  if (!producto || producto.es_pedido_encargo) return {};

  // meta_titulo_web/meta_descripcion_web (opcionales, a mano o con el botón
  // "Generar con IA" del modal de producto en el POS) tienen prioridad; sin
  // ellos, se sigue armando uno automático como antes — ninguna ficha vieja
  // pierde su SEO por no tener estos campos todavía.
  const tituloSeo = producto.meta_titulo_web || producto.nombre;
  const descripcionPlana = producto.meta_descripcion_web
    ? producto.meta_descripcion_web
    : producto.descripcion_web
      ? recortarEnPalabra(textoPlanoDesdeHtml(producto.descripcion_web), 155)
      : `Compra ${producto.nombre} en Sevelin, Arica — ${formatoCLP.format(producto.precio_web)}. Envíos a todo Chile, retiro en tienda.`;
  const imagen = producto.imagen_urls?.[0];

  return {
    title: tituloSeo,
    description: descripcionPlana,
    alternates: { canonical: `/productos/${producto.sku}` },
    openGraph: {
      title: tituloSeo,
      description: descripcionPlana,
      url: `/productos/${producto.sku}`,
      images: imagen ? [{ url: imagen, width: 1000, height: 1000, alt: producto.nombre }] : undefined,
    },
    twitter: {
      title: tituloSeo,
      description: descripcionPlana,
      images: imagen ? [imagen] : undefined,
    },
  };
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
  // Los productos de Encargo viven solo en /pedidos-por-encargo — mismo
  // criterio de "sección aparte" que el resto del catálogo (ver
  // src/app/pedidos-por-encargo/[sku]/page.tsx).
  if (!producto || producto.es_pedido_encargo) notFound();

  // Relacionados: mismo criterio de resiliencia que el resto de la página
  // — si falla, la ficha se muestra igual, solo sin esa sección.
  const relacionados = await productosRelacionados(producto).catch(() => []);

  // Se registra DESPUÉS de mandar la respuesta (after()), no retrasa la
  // ficha — el POS la lee para el panel "Más buscados / más vistos".
  after(() => registrarVistaProducto(producto.producto_pos_id));

  const descripcionSegura = producto.descripcion_web
    ? sanitizarDescripcionHtml(producto.descripcion_web)
    : '';

  // Dato estructurado Product (schema.org) — lo que Google usa para
  // mostrar precio/disponibilidad debajo del link en el buscador, y lo
  // mismo que después va a pedir Google Merchant Center si se conecta
  // Google Shopping/Ads. Solo se declaran campos que sabemos ciertos —
  // "brand" queda afuera a propósito: Sevelin es el vendedor, no la marca
  // real de cada producto, y ese dato no existe en el catálogo todavía.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    sku: producto.sku,
    image: producto.imagen_urls || [],
    description: producto.descripcion_web ? textoPlanoDesdeHtml(producto.descripcion_web) : producto.nombre,
    offers: {
      '@type': 'Offer',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sevelin.cl'}/productos/${producto.sku}`,
      priceCurrency: 'CLP',
      price: producto.precio_web,
      availability: producto.stock_web > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        // JSON.stringify no puede producir '</script>' válido dentro de un
        // string HTML — se escapa '<' por si algún nombre/descripción de
        // producto llegara a contenerlo (defensa en profundidad, mismo
        // criterio que el resto del proyecto con texto de usuario).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
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
        {/* Antes el breadcrumb se cortaba en la categoría — un producto con
            subcategoría asignada (ver producto_categorias en el POS) no lo
            mostraba en ningún lado de la ficha, solo en el filtro de
            /productos. Con esto, la página del producto también refleja la
            subcategoría real, con el mismo link que ya arma el filtro. */}
        {producto.subcategoria && (
          <>
            <span className="mx-1.5">/</span>
            <Link
              href={`/productos?categoria=${encodeURIComponent(producto.categoria || "")}&subcategoria=${encodeURIComponent(producto.subcategoria)}`}
              className="transition-colors hover:text-accent"
            >
              {producto.subcategoria}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <GaleriaProducto imagenes={producto.imagen_urls || []} nombre={producto.nombre} categoria={producto.categoria} />

        <div className="flex flex-col gap-4">
          <EtiquetaProductoBadge etiqueta={producto.etiqueta_web} />
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

          <InfoEnvioProducto />
        </div>
      </div>

      {/* "También te puede interesar": antes ninguna ficha de producto
          enlazaba a otra — sin links internos, Google tiene que descubrir
          el resto del catálogo solo por el sitemap, más lento que
          seguir enlaces reales entre fichas relacionadas. */}
      {relacionados.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display mb-5 text-xl font-bold uppercase tracking-tight text-ink">
            También te puede interesar
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {relacionados.map((p) => (
              <TarjetaProducto key={p.id} producto={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
