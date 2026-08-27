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

/**
 * Categorías distintas del catálogo publicado, para el filtro del header
 * (ver README-ECOMMERCE-SEVELIN.md sección 7 — no hay subcategoría en el
 * schema, así que esto es un filtro plano, no un mega-menú jerárquico).
 */
export async function listarCategorias(): Promise<string[]> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('categoria')
    .eq('publicado_web', true)
    .gt('stock_web', 0)
    .not('categoria', 'is', null);

  if (error) throw new Error(error.message);
  const categorias = new Set((data || []).map((fila) => fila.categoria as string));
  return Array.from(categorias).sort((a, b) => a.localeCompare(b, 'es'));
}

/** Catálogo publicado filtrado por categoría y/o texto libre, para /productos. */
export async function buscarCatalogo(filtros: { categoria?: string; q?: string }): Promise<ProductoWeb[]> {
  let query = supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('publicado_web', true)
    .gt('stock_web', 0)
    .order('nombre', { ascending: true });

  if (filtros.categoria) query = query.eq('categoria', filtros.categoria);
  if (filtros.q) {
    // Sanitizado: la sintaxis de filtros de PostgREST usa coma/paréntesis/punto
    // como separadores estructurales — si el texto de búsqueda los trae tal
    // cual, rompe (o altera) el filtro compuesto que arma .or(). Se limita a
    // letras/números/espacios, suficiente para buscar por nombre o SKU.
    const qLimpio = filtros.q.replace(/[^\p{L}\p{N} ]/gu, '').trim();
    if (qLimpio) query = query.or(`nombre.ilike.%${qLimpio}%,sku.ilike.%${qLimpio}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
