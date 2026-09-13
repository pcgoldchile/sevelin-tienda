import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { obtenerProductoPorSku, productosRelacionados } from "@/lib/catalogo";
import { formatoCLP } from "@/lib/formato";
import { HAY_RECARGO, precioConRecargo } from "@/lib/precios-medio-pago";
import { sanitizarDescripcionHtml } from "@/lib/sanitizar-html";
import { textoPlanoDesdeHtml, recortarEnPalabra } from "@/lib/texto-plano";
import { registrarVistaProducto } from "@/lib/eventos-web";
import { GaleriaProducto } from "@/components/galeria-producto";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { AccionesProducto } from "@/components/acciones-producto";
import { EtiquetaProductoBadge } from "@/components/etiqueta-producto-badge";
import { InfoEnvioProducto } from "@/components/info-envio-producto";
import { AvisoPagoTarjeta } from "@/components/aviso-pago-tarjeta";
import { AvisoUrgenciaStock } from "@/components/aviso-urgencia-stock";
import { AvisoPorLlegar } from "@/components/aviso-por-llegar";
import { AvisameProducto } from "@/components/avisame-producto";
import { CotizarWhatsapp } from "@/components/cotizar-whatsapp";
import { esServicioTecnico } from "@/lib/servicios";

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
  // mismo que pide Google Merchant Center al conectar Google Shopping/Ads.
  // Solo se declaran campos que sabemos ciertos: la marca aparece únicamente
  // cuando el producto TIENE marca cargada en el POS (sql/38). Un genérico
  // no lleva marca inventada — declarar a Sevelin como fabricante de un
  // cable sería un dato falso, y Google penaliza eso.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    sku: producto.sku,
    ...(producto.marca ? { brand: { '@type': 'Brand', name: producto.marca } } : {}),
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

      <div className="grid gap-10 md:grid-cols-2">
        {/* Foto + botón de compra van juntos y fijos: es el par que el
            cliente necesita a la vista todo el tiempo (qué está comprando
            y el botón para hacerlo), mientras el resto de la ficha
            (precio, aviso de stock, descripción) se desplaza normal.
            `md:top-24` deja el hueco del header (sticky top-0 z-40) y
            `md:self-start` evita que el grid (align-items: stretch por
            defecto) estire este bloque a la altura de la columna derecha.
            En celular no hace falta: el orden de lectura ya lo deja
            visible sin scroll. */}
        <div className="flex flex-col gap-4 md:sticky md:top-24 md:z-10 md:self-start">
          <GaleriaProducto imagenes={producto.imagen_urls || []} nombre={producto.nombre} categoria={producto.categoria} />

          {/* Este botón solo se ve en escritorio (md:block, oculto en
              celular con hidden): en celular el mismo botón aparece más
              abajo, junto al precio — ver el bloque `md:hidden` en la
              columna derecha. Están duplicados a propósito: es la única
              forma de que el botón vaya PEGADO a la foto en escritorio
              (para que ambos quedn fijos juntos) y a la vez DESPUÉS del
              precio en celular (orden de lectura normal), sin JS. */}
          <div className="hidden md:block">
            {producto.precio_a_consultar ? (
              <CotizarWhatsapp producto={producto} />
            ) : (
              <AccionesProducto producto={producto} />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <EtiquetaProductoBadge etiqueta={producto.etiqueta_web} />
          {/* La marca va ARRIBA del nombre, como en cualquier ficha de
              retail: es lo primero que busca quien ya sabe qué marca
              quiere. Solo aparece si el producto la tiene cargada — un
              genérico no muestra nada, en vez de mostrar "Sevelin" como
              si fuéramos el fabricante. */}
          {producto.marca && (
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
              {producto.marca}
            </span>
          )}
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{producto.nombre}</h1>
          <div className="flex flex-col gap-0.5">
            <span className="precio-gamer text-3xl text-ink">
              {/* Precio a consultar (supabase/31): el número es una base, y
                  decirlo sin el "Desde" sería anunciar un precio que después
                  no se respeta. */}
              {producto.precio_a_consultar && <span className="mr-2 text-lg text-ink-soft">Desde</span>}
              {formatoCLP.format(producto.precio_web)}
            </span>
            {/* Con el recargo apagado el precio es uno solo y no hace falta
                explicar nada. Si se reactivara, los dos precios van juntos y
                explícitos, nunca uno escondido hasta el último paso: es la
                condición que lo hace legítimo (el TDLC exige que sea público
                y transparente, y la Ley del Consumidor que no se cobre más
                que lo anunciado). Ver docs/PLAN-PRECIOS-DIFERENCIADOS.md §4. */}
            {HAY_RECARGO && (
              <>
                <span className="text-xs text-ink-faint">
                  Efectivo, transferencia o tarjeta en tienda
                </span>
                <span className="mt-1 text-sm text-ink-soft">
                  {formatoCLP.format(precioConRecargo(producto.precio_web))}{" "}
                  <span className="text-ink-faint">pagando con tarjeta en el sitio</span>
                </span>
              </>
            )}
          </div>

          {/* Versión celular del mismo botón — ver la nota en la columna
              de la foto. Aquí sí importa el orden: va después del precio,
              como cualquier ficha de producto. */}
          <div className="md:hidden">
            {producto.precio_a_consultar ? (
              <CotizarWhatsapp producto={producto} />
            ) : (
              <AccionesProducto producto={producto} />
            )}
          </div>

          {/* El aviso de que queda poco NO es fijo: baja con el resto de
              la ficha (precio, descripción) — solo la foto y el botón de
              compra (columna izquierda) se mantienen a la vista. */}
          <AvisoUrgenciaStock producto={producto} />

          {/* Viene en camino: fecha estimada, reserva con pago del 100% y
              la garantía de devolución total, que es lo que hace razonable
              pagar por algo que todavía no está. */}
          <AvisoPorLlegar producto={producto} />

          {/* La lista de espera solo tiene sentido cuando el cliente NO
              puede llevárselo hoy: agotado, o por llegar y prefiere no
              pagar por adelantado (ese es el caso de quien quiere pagar
              presencial). Con stock disponible estorbaría la compra. */}
          {(producto.por_llegar || producto.stock_web <= 0) && !producto.es_pedido_encargo && (
            <AvisameProducto
              sku={producto.sku}
              nombre={producto.nombre}
              whatsapp={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}
            />
          )}

          {/* Justo bajo el botón de compra: es el momento exacto en que el
              cliente piensa "¿con qué pago?". Enterarse de que puede pagar
              con tarjeta después de irse de la ficha no sirve de nada. */}
          {/* Sin compra en línea no hay pago con tarjeta que anunciar. */}
          {!producto.precio_a_consultar && <AvisoPagoTarjeta />}

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
                  [&_li]:relative [&_li]:rounded-lg [&_li]:border [&_li]:border-border [&_li]:bg-surface-sunken/60
                  [&_li]:py-2.5 [&_li]:pl-9 [&_li]:pr-3 [&_li]:leading-snug
                  [&_li]:transition-colors [&_li]:hover:border-primary/40
                  [&_li>strong]:block [&_li>strong]:mb-0.5
                  [&_li]:before:absolute [&_li]:before:left-3 [&_li]:before:top-2.5
                  [&_li]:before:flex [&_li]:before:h-5 [&_li]:before:w-5 [&_li]:before:shrink-0
                  [&_li]:before:items-center [&_li]:before:justify-center [&_li]:before:rounded-full
                  [&_li]:before:bg-primary/15 [&_li]:before:text-[11px] [&_li]:before:font-bold
                  [&_li]:before:text-primary [&_li]:before:content-['✓']"
                dangerouslySetInnerHTML={{ __html: descripcionSegura }}
              />
            </div>
          )}

          <InfoEnvioProducto esServicio={esServicioTecnico(producto)} />
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
