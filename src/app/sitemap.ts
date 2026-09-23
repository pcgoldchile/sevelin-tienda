import type { MetadataRoute } from 'next';
import { listarPublicados } from '@/lib/catalogo';
import { listarEncargos } from '@/lib/encargos';
import { rutaDeSku } from '@/lib/sku-url';

// Mismo criterio que layout.tsx (SITE_URL): default real en el código, la
// env var solo lo sobreescribe.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sevelin.cl';

/**
 * Antes no existía — /sitemap.xml devolvía la página 404 del sitio. Se
 * arma en tiempo de build/request con el catálogo real (productos_web
 * publicados) en vez de una lista fija, para no quedar desactualizado a
 * mano cada vez que se publica o despublica un producto. Si Supabase Web
 * no responde, se degrada a solo las páginas estáticas en vez de romper
 * (mismo criterio que layout.tsx con las categorías del header).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/productos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/por-llegar`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/pedidos-por-encargo`, changeFrequency: 'weekly', priority: 0.6 },
    /* Prioridad más alta que las legales: responde dudas de compra reales
       ("¿es seguro comprar reacondicionado?") que la gente busca en Google. */
    { url: `${SITE_URL}/preguntas-frecuentes`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terminos`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  let productos: MetadataRoute.Sitemap = [];
  try {
    /* listarPublicados y no listarCatalogo: desde el 23-09-2026 la ficha
       de un agotado sí existe, y mantenerla indexada es lo que conserva
       su lugar en Google mientras vuelve a haber stock. */
    const [catalogo, encargos] = await Promise.all([listarPublicados(), listarEncargos()]);
    /* Cada producto va a SU ruta. Los de encargo viven en
       /pedidos-por-encargo: la ficha de /productos los rechaza a propósito
       (notFound), así que mandarlos ahí publicaba 18 URLs muertas en el
       sitemap que Google entrega a Search Console. Encontrado el
       22-09-2026 probando contra producción, no leyendo el código.

       Y el SKU se codifica: es la dirección pública del producto y puede
       traer espacios o tildes (ver lib/sku-url). */
    productos = [
      ...catalogo.map((p) => ({ producto: p, base: '/productos' })),
      ...encargos.map((p) => ({ producto: p, base: '/pedidos-por-encargo' })),
    ].map(({ producto, base }) => ({
      url: `${SITE_URL}${base}/${rutaDeSku(producto.sku)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (err) {
    console.error('[sitemap] No se pudo cargar el catálogo, se publican solo las páginas estáticas:', err instanceof Error ? err.message : err);
  }

  return [...estaticas, ...productos];
}
