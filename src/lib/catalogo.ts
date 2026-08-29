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
 * Productos puntuales por SKU exacto, para los banners de categoría del home
 * (ver banners-categoria.tsx) — no es un buscador genérico, solo resuelve la
 * foto real de 3 productos fijos elegidos a mano. Devuelve un mapa por SKU
 * (no un array) para que el llamador pueda hacer `mapa[sku]` sin depender del
 * orden que devuelva Supabase.
 */
export async function obtenerProductosPorSku(skus: string[]): Promise<Record<string, ProductoWeb>> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .in('sku', skus)
    .eq('publicado_web', true)
    .gt('stock_web', 0);

  if (error) throw new Error(error.message);
  const porSku: Record<string, ProductoWeb> = {};
  for (const producto of data || []) porSku[producto.sku] = producto;
  return porSku;
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

/**
 * Subcategorías distintas dentro de UNA categoría, del catálogo publicado
 * — para los chips de refinamiento de /productos (ver
 * sevelin-pos-oficial/sql/25-subcategoria-web-sync.sql: el POS ya
 * administraba un árbol de 2 niveles, esto solo lo expone en el filtro).
 * Vacío si esa categoría no tiene ningún producto subcategorizado — la
 * página simplemente no muestra la fila de chips en ese caso.
 */
export async function listarSubcategorias(categoria: string): Promise<string[]> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('subcategoria')
    .eq('publicado_web', true)
    .gt('stock_web', 0)
    .eq('categoria', categoria)
    .not('subcategoria', 'is', null);

  if (error) throw new Error(error.message);
  const subcategorias = new Set((data || []).map((fila) => fila.subcategoria as string));
  return Array.from(subcategorias).sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Whitelist de orden para /productos — nunca se interpola el query param
 * crudo en .order(), siempre se pasa por este mapa (valor no reconocido o
 * ausente cae en 'relevancia', el orden por defecto de siempre).
 */
export const ORDEN_CATALOGO = {
  relevancia: { columna: 'nombre', ascending: true },
  'nombre-asc': { columna: 'nombre', ascending: true },
  'nombre-desc': { columna: 'nombre', ascending: false },
  'precio-asc': { columna: 'precio_web', ascending: true },
  'precio-desc': { columna: 'precio_web', ascending: false },
} as const;

export type OrdenCatalogo = keyof typeof ORDEN_CATALOGO;

export function esOrdenCatalogoValido(valor: string | undefined): valor is OrdenCatalogo {
  return !!valor && valor in ORDEN_CATALOGO;
}

/** Catálogo publicado filtrado por categoría y/o texto libre, para /productos. */
export async function buscarCatalogo(filtros: {
  categoria?: string;
  subcategoria?: string;
  q?: string;
  orden?: string;
}): Promise<ProductoWeb[]> {
  const clave: OrdenCatalogo = esOrdenCatalogoValido(filtros.orden) ? filtros.orden : 'relevancia';
  const { columna, ascending } = ORDEN_CATALOGO[clave];

  let query = supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('publicado_web', true)
    .gt('stock_web', 0)
    .order(columna, { ascending });

  if (filtros.categoria) query = query.eq('categoria', filtros.categoria);
  // Solo tiene sentido junto con categoria (los nombres de subcategoría no
  // son únicos entre categorías distintas) — filtros.categoria siempre va
  // presente cuando el llamador manda subcategoria (ver /productos/page.tsx).
  if (filtros.subcategoria) query = query.eq('subcategoria', filtros.subcategoria);
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
