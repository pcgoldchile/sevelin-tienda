import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresca la cookie de sesión de Supabase Auth en cada request — patrón
 * estándar de @supabase/ssr con el App Router (sin esto, la sesión expira
 * en silencio y "Mis pedidos"/el checkout logueado dejan de reconocer al
 * cliente aunque el navegador siga mandando la cookie vieja).
 *
 * Solo toca cookies de auth; no reemplaza ninguna lógica de rutas admin del
 * proyecto (no hay ninguna acá — las rutas /cuenta/** se protegen en cada
 * página, no en el middleware, para no acoplar esto a una lista de rutas).
 */
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_WEB_URL || 'http://localhost',
    process.env.NEXT_PUBLIC_SUPABASE_WEB_ANON_KEY || 'sin-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        },
      },
    }
  );

  // Fuerza la validación/refresh del token — sin este await, Supabase no
  // reescribe la cookie a tiempo.
  await supabase.auth.getUser();

  return respuesta;
}

export const config = {
  matcher: [
    /*
     * Corre en todas las rutas MENOS assets estáticos e imágenes — no hay
     * nada de auth que refrescar ahí.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)',
  ],
};
