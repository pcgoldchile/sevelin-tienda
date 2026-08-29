import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente de Supabase Web para el NAVEGADOR — usa la anon key pública, no la
 * service_role (ver src/lib/supabase-web.ts, que sigue siendo server-only y
 * sin cambios). Es la vía estándar de Supabase Auth: el navegador solo
 * puede hacer lo que las políticas RLS le dejan (ver supabase/06-clientes-web.sql
 * — un cliente logueado solo lee/escribe su propia fila en perfiles_clientes
 * y solo lee sus propios pedidos_web). Nunca escribe pedidos_web directo:
 * eso sigue siendo exclusivo de POST /api/checkout con la service_role.
 *
 * Requiere NEXT_PUBLIC_SUPABASE_WEB_URL / NEXT_PUBLIC_SUPABASE_WEB_ANON_KEY
 * (nuevas, sacar de Supabase → Settings → API → Project URL / anon public).
 */
const SUPABASE_WEB_URL = process.env.NEXT_PUBLIC_SUPABASE_WEB_URL;
const SUPABASE_WEB_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_WEB_ANON_KEY;

if (!SUPABASE_WEB_URL || !SUPABASE_WEB_ANON_KEY) {
  console.warn(
    '[sevelin-tienda] Faltan NEXT_PUBLIC_SUPABASE_WEB_URL / NEXT_PUBLIC_SUPABASE_WEB_ANON_KEY. ' +
    'Las cuentas de cliente no van a funcionar hasta configurarlas (ver .env.local.example) — el ' +
    'checkout de invitado sigue funcionando igual.'
  );
}

export function crearClienteNavegador() {
  // Placeholders (nunca vacío): createBrowserClient() lanza una excepción
  // dura con string vacío, y esto se ejecuta en TODAS las páginas (layout
  // envuelve todo con <SesionProvider>) — sin esto, la tienda entera se cae
  // mientras no se configuren las keys. Mismo criterio que
  // src/lib/supabase-web.ts con la service_role.
  return createBrowserClient(SUPABASE_WEB_URL || 'http://localhost', SUPABASE_WEB_ANON_KEY || 'sin-key');
}
