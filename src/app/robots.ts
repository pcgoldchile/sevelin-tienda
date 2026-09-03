import type { MetadataRoute } from 'next';

// Mismo criterio que layout.tsx (SITE_URL): default real en el código, la
// env var solo lo sobreescribe.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sevelin.cl';

/**
 * Antes no existía — cualquier crawler que pedía /robots.txt recibía la
 * página 404 del sitio en vez de un archivo real. Sin reglas de disallow
 * ni sitemap declarado, Google indexa más lento y puede rastrear páginas
 * que no aportan nada (carrito, checkout, cuentas de cliente).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/carrito', '/carrito-compartido', '/checkout', '/cuenta/', '/pedido/', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
