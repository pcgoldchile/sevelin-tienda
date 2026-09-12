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

/**
 * Catálogo de "Por llegar": lo que viene en camino y todavía no está en la
 * tienda. Mismo criterio que listarEncargos() —sin filtro de stock— pero
 * son cosas distintas y por eso no comparten página:
 *
 *   Encargo   → no se mantiene stock nunca; se pide al proveedor cuando
 *               alguien lo compra. Es permanente.
 *   Por llegar → ya viene en camino, con fecha estimada. Es transitorio:
 *               cuando llega deja de estar acá.
 *
 * Se ordena por fecha de llegada, los más próximos primero, porque es el
 * dato por el que la gente mira esta página. Los que aún no tienen fecha
 * van al final: son los más inciertos.
 */
export async function listarPorLlegar(): Promise<ProductoWeb[]> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('publicado_web', true)
    .eq('por_llegar', true)
    .order('fecha_llegada_estimada', { ascending: true, nullsFirst: false })
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}
