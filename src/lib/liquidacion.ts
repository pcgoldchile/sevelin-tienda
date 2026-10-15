import { listarCatalogo } from './catalogo';
import { supabaseWeb } from './supabase-web';
import type { ProductoWeb } from './tipos';

/**
 * Liquidación (dueño, 15-10-2026; POS v149, supabase/43). Productos antiguos o
 * fuera de temporada que el dueño quiere sacar. NO es una categoría: cada
 * producto sigue en la suya y lleva la etiqueta LIQUIDACION, que se marca en el
 * POS. La página /liquidacion los junta y el menú la muestra solo si hay alguno.
 */

/** Lo que está en liquidación y se puede comprar hoy, el más barato primero. */
export async function listarLiquidacion(): Promise<ProductoWeb[]> {
  const catalogo = await listarCatalogo();
  return catalogo
    .filter((p) => p.etiqueta_web === 'LIQUIDACION')
    .sort((a, b) => Number(a.precio_web) - Number(b.precio_web) || a.nombre.localeCompare(b.nombre, 'es'));
}

/** ¿Hay al menos uno? Para el enlace del menú: una consulta liviana, sin traer el catálogo. */
export async function hayLiquidacion(): Promise<boolean> {
  const { count, error } = await supabaseWeb
    .from('productos_web')
    .select('id', { count: 'exact', head: true })
    .eq('etiqueta_web', 'LIQUIDACION')
    .eq('publicado_web', true)
    .eq('es_pedido_encargo', false)
    .gt('stock_web', 0);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}
