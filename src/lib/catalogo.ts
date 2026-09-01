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
    .eq('es_pedido_encargo', false)
    .gt('stock_web', 0)
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Resuelve un producto por SKU sin importar su tipo — la usan tanto la
 * ficha de /productos/[sku] como el checkout y la cotización de envío
 * (src/lib/envio.ts), que necesitan poder resolver un producto de
 * Pedidos por Encargo igual que uno normal. Por eso el filtro de stock es
 * "stock_web > 0 O es de Encargo" en vez de exigir stock siempre — un
 * Encargo no tiene stock propio a propósito (ver
 * supabase/18-pedidos-por-encargo.sql). Quien solo quiere el catálogo
 * normal ya filtra es_pedido_encargo=false en sus propias consultas
 * (buscarCatalogo, listarCatalogo, etc.).
 */
export async function obtenerProductoPorSku(sku: string): Promise<ProductoWeb | null> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('sku', sku)
    .eq('publicado_web', true)
    .or('stock_web.gt.0,es_pedido_encargo.eq.true')
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
    .eq('es_pedido_encargo', false)
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
    .eq('es_pedido_encargo', false)
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
    .eq('es_pedido_encargo', false)
    .gt('stock_web', 0)
    .eq('categoria', categoria)
    .not('subcategoria', 'is', null);

  if (error) throw new Error(error.message);
  const subcategorias = new Set((data || []).map((fila) => fila.subcategoria as string));
  return Array.from(subcategorias).sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Árbol categoría → subcategorías del catálogo publicado, para el menú del
 * header (ver header.tsx): cada categoría principal que tenga subcategorías
 * se puede desplegar igual que "Más categorías", en vez de ser un link
 * plano. Una sola consulta (categoria + subcategoria de cada producto) en
 * vez de una por categoría — se agrupa acá mismo en memoria.
 */
export async function listarArbolCategorias(): Promise<Record<string, string[]>> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('categoria, subcategoria')
    .eq('publicado_web', true)
    .eq('es_pedido_encargo', false)
    .gt('stock_web', 0)
    .not('categoria', 'is', null);

  if (error) throw new Error(error.message);

  const arbol: Record<string, Set<string>> = {};
  for (const fila of data || []) {
    const categoria = fila.categoria as string;
    if (!arbol[categoria]) arbol[categoria] = new Set();
    if (fila.subcategoria) arbol[categoria].add(fila.subcategoria as string);
  }

  const resultado: Record<string, string[]> = {};
  for (const [categoria, subcategorias] of Object.entries(arbol)) {
    resultado[categoria] = Array.from(subcategorias).sort((a, b) => a.localeCompare(b, 'es'));
  }
  return resultado;
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

/**
 * Los más vendidos del catálogo publicado, para "Destacados" del home.
 *
 * El contador `unidades_vendidas` lo empuja el POS (ver
 * POST /api/sync/mas-vendidos y supabase/10-mas-vendidos.sql), porque el
 * grueso de las ventas pasa por el mostrador: ordenar por los pedidos web
 * daría una foto muy parcial del negocio.
 *
 * Si todavía no se ha sincronizado nada (todos en 0), el `order` secundario
 * por nombre deja un resultado estable en vez de un orden arbitrario — la
 * portada sigue mostrando productos, solo que sin el criterio de ventas
 * hasta la primera sincronización.
 */
export async function listarMasVendidos(limite = 8): Promise<ProductoWeb[]> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('publicado_web', true)
    .eq('es_pedido_encargo', false)
    .gt('stock_web', 0)
    .order('unidades_vendidas', { ascending: false })
    .order('nombre', { ascending: true })
    .limit(limite);

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * El producto MÁS BARATO de cada categoría, para los banners del home.
 *
 * Reemplaza los SKU fijos escritos a mano que había antes: esos quedaban
 * obsoletos apenas el producto se agotaba o se despublicaba, y el banner
 * se quedaba sin foto. Ahora el banner muestra el precio de entrada real
 * de la categoría ("Desde $X") y siempre apunta a algo que existe hoy.
 *
 * Se hace una consulta por categoría en vez de traer el catálogo entero y
 * agrupar en memoria: son 3 categorías y cada consulta pide UNA fila
 * (`limit(1)` sobre un índice de precio), lo que pesa muchísimo menos que
 * traer los ~65 productos publicados solo para quedarse con 3.
 */
export async function productoMasBaratoPorCategoria(
  categorias: string[]
): Promise<Record<string, ProductoWeb>> {
  const resultados = await Promise.all(
    categorias.map(async (categoria) => {
      const { data, error } = await supabaseWeb
        .from('productos_web')
        .select('*')
        .eq('publicado_web', true)
        .eq('es_pedido_encargo', false)
        .gt('stock_web', 0)
        .eq('categoria', categoria)
        .order('precio_web', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Una categoría vacía no es un error: el banner simplemente se
      // muestra sin foto ni precio, como ya hacía antes.
      if (error) return null;
      return data ? ([categoria, data] as const) : null;
    })
  );

  const porCategoria: Record<string, ProductoWeb> = {};
  for (const par of resultados) if (par) porCategoria[par[0]] = par[1];
  return porCategoria;
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
    .eq('es_pedido_encargo', false)
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
