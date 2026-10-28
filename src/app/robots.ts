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
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/carrito', '/carrito-compartido', '/checkout', '/cuenta/', '/pedido/', '/api/', '/baja-recordatorio',
          /* 22-10-2026: las combinaciones del panel "Filtrar" y del orden. Googlebot las
             recorría una por una (5.400 visitas en 12 horas a /productos?...&f_…&orden=…):
             cada una armaba la página de nuevo y la organización de Supabase pasó su
             límite de tráfico (13 GB de 5). Las categorías y subcategorías
             (?categoria=…&subcategoria=…) siguen abiertas: son las que se indexan. */
          '/*?*orden=', '/*?*f_', '/*?*pmin=', '/*?*pmax=',
          // Búsquedas internas y comparador: resultados que cambian por persona, no páginas para Google
          '/*?q=', '/*?*&q=', '/comparar',
        ],
      },
      /* PetalBot (buscador de Huawei, sin uso en Chile): 490 visitas en 12 horas y casi nada
         desde el caché. Se le cierra el sitio entero. */
      { userAgent: 'PetalBot', disallow: '/' },
      /* 28-10-2026: Vercel avisó 75% de "Fast Origin Transfer" (7,6 de 10 GB; el 96% de la tienda).
         En 12 horas, de 2.700 visitas: meta-externalagent 714, GPTBot 241, Amazonbot 119, casi sin
         caché. Son robots que copian el sitio para entrenar IA o para herramientas de SEO: no traen
         clientes. Se cierran. Se dejan abiertos Googlebot, Bingbot, google-adsbot, facebookexternalhit
         (la vista previa de los enlaces en Facebook y WhatsApp) y OAI-SearchBot/ChatGPT-User (las
         respuestas del buscador de ChatGPT sí pueden mandar gente). */
      {
        userAgent: [
          'meta-externalagent', 'GPTBot', 'Amazonbot', 'CCBot', 'Bytespider', 'ClaudeBot', 'anthropic-ai',
          'Google-Extended', 'Applebot-Extended', 'PerplexityBot', 'cohere-ai', 'Diffbot', 'ImagesiftBot',
          'SemrushBot', 'AhrefsBot', 'MJ12bot', 'DotBot', 'DataForSeoBot', 'BLEXBot', 'Barkrowler'
        ],
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
