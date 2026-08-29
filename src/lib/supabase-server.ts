import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cliente de Supabase Web para el SERVIDOR (Server Components y Route
 * Handlers) que lee la sesión del cliente desde sus cookies — nunca desde
 * algo que mande el body de la request (mismo principio que precio/stock
 * en el checkout: la sesión real es la que dice la cookie firmada por
 * Supabase, no lo que el navegador afirme).
 *
 * En un Server Component las cookies son de solo lectura: el `catch` vacío
 * de setAll() es a propósito (Supabase reintenta el refresh en el
 * middleware, ver middleware.ts). En una Route Handler sí puede escribir
 * cookies de verdad (login/logout/registro).
 */
export async function crearClienteServidor() {
  const cookieStore = await cookies();

  // Placeholders si faltan las env vars (mismo criterio que
  // supabase-browser.ts) — createServerClient() también lanza con string
  // vacío, y esto se llama desde el checkout, que debe seguir funcionando
  // como invitado aunque las cuentas todavía no estén configuradas.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_WEB_URL || 'http://localhost',
    process.env.NEXT_PUBLIC_SUPABASE_WEB_ANON_KEY || 'sin-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component: no puede escribir cookies, el middleware la refresca igual.
          }
        },
      },
    }
  );
}
