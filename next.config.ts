import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad HTTP — la tienda no tenía NINGUNA (Reporte de
 * Seguridad Consolidado B, hallazgo #6): a diferencia del POS
 * (sevelin-pos-oficial/vercel.json), este sitio público de checkout —el
 * que procesa datos personales y pagos— no tenía CSP, X-Frame-Options,
 * HSTS ni Referrer-Policy.
 *
 * `script-src`/`style-src` llevan 'unsafe-inline' A PROPÓSITO, no por
 * descuido: Next.js App Router inyecta scripts inline propios para la
 * hidratación por streaming, y framer-motion aplica estilos inline por JS
 * para las animaciones — sin 'unsafe-inline' ambos se rompen (la app deja
 * de hidratar / las animaciones dejan de aplicarse). Eliminarlo del todo
 * requiere migrar a CSP por nonce (middleware.ts generando un nonce nuevo
 * en cada request, ver
 * https://nextjs.org/docs/app/guides/content-security-policy) — es la
 * mejora natural siguiente, pero no bloquea esta corrección: incluso con
 * 'unsafe-inline' en script/style, el resto de la política (frame-ancestors,
 * object-src, connect-src, base-uri, form-action) ya cierra las vías de
 * clickjacking, carga de recursos de orígenes ajenos y envío de formularios
 * a otro dominio.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Fotos de producto: mismo bucket público de Supabase que remotePatterns
  // de abajo. blob:/data: para previews del navegador (ej. avatar/carrito).
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  // El navegador habla directo con Supabase Auth (anon key pública, ver
  // src/lib/supabase-browser.ts) para login/registro/sesión — Google Maps
  // se llama SIEMPRE desde el servidor (src/lib/distancia.ts, places.ts),
  // nunca desde el navegador, así que no hace falta whitelistear ningún
  // host de Google acá.
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig: NextConfig = {
  images: {
    // Las fotos de producto viven en el bucket público `productos-imagenes`
    // del Supabase del POS (ver docs/README-BUCKET-IMAGENES.md del repo
    // sevelin-pos-oficial): cualquier proyecto *.supabase.co puede servirlas.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Redundante con `frame-ancestors 'none'` de la CSP a propósito
          // (defensa en profundidad, mismo criterio que vercel.json del
          // POS): X-Frame-Options lo respetan también navegadores/lectores
          // viejos que no procesan frame-ancestors.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // 2 años + subdominios + preload: Vercel sirve todo por HTTPS de
          // por sí, esto solo evita que un navegador vuelva a intentar HTTP
          // alguna vez para este dominio.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
