import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase Web — el proyecto Supabase PROPIO de la tienda
 * (productos_web, pedidos_web), NO el Supabase del POS.
 *
 * Regla dura (ver README-ECOMMERCE-SEVELIN.md, secciones 1 y 4.2): RLS
 * activo sin políticas públicas, solo la service_role toca estas tablas.
 * Por eso este archivo SOLO se importa desde Server Components o Route
 * Handlers (código que corre en el servidor de Vercel), nunca desde un
 * componente 'use client'. La key nunca debe llevar el prefijo
 * NEXT_PUBLIC_: eso la mandaría al navegador del cliente.
 */
const SUPABASE_WEB_URL = process.env.SUPABASE_WEB_URL;
const SUPABASE_WEB_SERVICE_ROLE_KEY = process.env.SUPABASE_WEB_SERVICE_ROLE_KEY;

if (!SUPABASE_WEB_URL || !SUPABASE_WEB_SERVICE_ROLE_KEY) {
  console.warn(
    '[sevelin-tienda] Faltan SUPABASE_WEB_URL / SUPABASE_WEB_SERVICE_ROLE_KEY. ' +
    'El catálogo no podrá consultarse hasta configurarlas (ver .env.local.example).'
  );
}

export const supabaseWeb = createClient(
  SUPABASE_WEB_URL || 'http://localhost',
  SUPABASE_WEB_SERVICE_ROLE_KEY || 'sin-key',
  { auth: { persistSession: false, autoRefreshToken: false } }
);
