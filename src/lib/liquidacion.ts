import { listarCatalogo } from './catalogo';
import { vendiblesEnMemoria } from './catalogo-memoria';
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

/** ¿Hay al menos uno? Para el enlace del menú, que va en TODAS las páginas: sale de la
 *  copia en memoria del catálogo (22-10-2026), sin consultar la base en cada página. */
export async function hayLiquidacion(): Promise<boolean> {
  return (await vendiblesEnMemoria()).some((p) => p.etiqueta_web === 'LIQUIDACION');
}
