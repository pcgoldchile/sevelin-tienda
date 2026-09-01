import { supabaseWeb } from './supabase-web';
import type { ProductoWeb } from './tipos';

/**
 * Catálogo de "Pedidos por Encargo" (dropshipping/retiro en tienda) —
 * mismo criterio que catalogo.ts pero SIN el filtro de stock_web>0: el
 * dueño no mantiene stock propio de estos productos, los pide al
 * proveedor recién cuando se confirma el pedido (ver
 * supabase/18-pedidos-por-encargo.sql).
 */
export async function listarEncargos(): Promise<ProductoWeb[]> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('publicado_web', true)
    .eq('es_pedido_encargo', true)
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Ficha de un producto de Encargo. Devuelve null también si el producto
 * existe pero NO es de Encargo — esa combinación vive solo en /productos,
 * no acá (ver src/app/pedidos-por-encargo/[sku]/page.tsx).
 */
export async function obtenerEncargoPorSku(sku: string): Promise<ProductoWeb | null> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('sku', sku)
    .eq('publicado_web', true)
    .eq('es_pedido_encargo', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
