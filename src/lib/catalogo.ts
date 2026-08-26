import { supabaseWeb } from './supabase-web';
import type { ProductoWeb } from './tipos';

/**
 * Catálogo público: SIEMPRE filtra por publicado_web=true y stock_web>0
 * (ver README-ECOMMERCE-SEVELIN.md sección 5, contrato de GET /api/productos).
 * Un producto puede existir en productos_web (ya sincronizado desde el POS)
 * y no mostrarse en la tienda todavía — publicado_web es la decisión
 * explícita del dueño, tomada desde el modal de producto del POS.
 */
export async function listarCatalogo(): Promise<ProductoWeb[]> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('publicado_web', true)
    .gt('stock_web', 0)
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function obtenerProductoPorSku(sku: string): Promise<ProductoWeb | null> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('sku', sku)
    .eq('publicado_web', true)
    .gt('stock_web', 0)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
