import type { MetadataRoute } from 'next';
import { listarCatalogo } from '@/lib/catalogo';
import { listarEncargos } from '@/lib/encargos';

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
    { url: `${SITE_URL}/pedidos-por-encargo`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terminos`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  let productos: MetadataRoute.Sitemap = [];
  try {
    const [catalogo, encargos] = await Promise.all([listarCatalogo(), listarEncargos()]);
    productos = [...catalogo, ...encargos].map((producto) => ({
      url: `${SITE_URL}/productos/${producto.sku}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
  } catch (err) {
    console.error('[sitemap] No se pudo cargar el catálogo, se publican solo las páginas estáticas:', err instanceof Error ? err.message : err);
  }

  return [...estaticas, ...productos];
}
