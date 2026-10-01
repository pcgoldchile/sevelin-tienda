/**
 * Canales de contacto de Sevelin, en un solo lugar: los usan el pie de
 * página, la barra superior del encabezado, /contacto y /quienes-somos.
 *
 * Todo sale de datos confirmados por el dueño. Lo que no está configurado
 * queda en null y simplemente no se muestra: nunca se inventa un enlace.
 */

export const WHATSAPP_NUMERO = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || null;
export const URL_WHATSAPP = WHATSAPP_NUMERO ? `https://wa.me/${WHATSAPP_NUMERO}` : null;

export const URL_INSTAGRAM = process.env.NEXT_PUBLIC_INSTAGRAM_URL || null;

/** Página de Facebook del negocio. Mientras no se configure
 *  NEXT_PUBLIC_FACEBOOK_URL en Vercel, el botón no aparece. */
export const URL_FACEBOOK = process.env.NEXT_PUBLIC_FACEBOOK_URL || null;

export const EMAIL_CONTACTO = process.env.NEXT_PUBLIC_PRIVACIDAD_EMAIL || 'sevelin.contacto@gmail.com';

/** Ficha de Google del negocio: reseñas, fotos y cómo llegar. Es el mismo
 *  enlace de src/lib/resena-google.ts sin "/review" (ese abre directo el
 *  formulario para escribir una reseña). */
export const URL_PERFIL_GOOGLE = 'https://g.page/r/CZzFra1V3A9aEAE';

/** "+56 9 3575 0828" a partir de "56935750828", solo para mostrar. */
export function whatsappLegible(): string | null {
  const d = (WHATSAPP_NUMERO || '').replace(/\D/g, '');
  if (!d) return null;
  return d.length === 11 && d.startsWith('569') ? `+56 9 ${d.slice(3, 7)} ${d.slice(7)}` : `+${d}`;
}
