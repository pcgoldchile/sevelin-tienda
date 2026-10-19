import { supabaseWeb } from './supabase-web';
import { aplicarOferta } from './oferta';
import type { ProductoWeb } from './tipos';

/**
 * Datos del inicio (rediseño del dueño, 19-10-2026: "una combinación de A y C… que
 * salgan los servicios más rentables que me gustan, mantenimiento y formateo, a la
 * vista, y las opciones de pantalla y puertos cotizar, los más vendidos, más vistos").
 */

/* Los servicios que van a la vista, en este orden (producto_pos_id del POS). Para
   cambiarlos, se cambia esta lista. Un servicio despublicado simplemente no sale.
   Pantalla y puerto son "precio a consultar": la tarjeta dice "Cotizar". */
export const SERVICIOS_INICIO = [
  88,   // Mantenimiento preventivo notebook / laptop gamer — $40.000
  89,   // Mantenimiento preventivo PC gamer (torre) — $40.000
  136,  // Formateo completo y optimización PC / notebook — $15.000
  93,   // Formateo, optimización y respaldo de datos — $20.000
  275,  // Cambio de pantalla para celulares — desde $30.000 (cotizar)
  274,  // Cambio de puerto de carga USB-C / Micro USB — desde $18.000 (cotizar)
];

const sinServicios = (p: ProductoWeb) => p.categoria !== 'Servicios Técnicos';

async function vendiblesHoy(): Promise<ProductoWeb[]> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('publicado_web', true)
    .eq('es_pedido_encargo', false)
    .gt('stock_web', 0);
  if (error) throw new Error(error.message);
  return (data || []).map((p) => aplicarOferta(p as ProductoWeb));
}

/** Lo que más se vendió en 30 días (mostrador + web, lo manda el POS cada día); a igual, lo de siempre. */
export async function listarMasVendidosDelMes(limite = 8): Promise<ProductoWeb[]> {
  return (await vendiblesHoy())
    .filter(sinServicios)
    .filter((p) => (p.vendidos_30d ?? 0) > 0 || (p.unidades_vendidas ?? 0) > 0)
    .sort((a, b) => (b.vendidos_30d ?? 0) - (a.vendidos_30d ?? 0) || (b.unidades_vendidas ?? 0) - (a.unidades_vendidas ?? 0))
    .slice(0, limite);
}

/** Las fichas más abiertas en sevelin.cl en 30 días (eventos_web, función vistas_por_producto de supabase/46). */
export async function listarMasVistos(limite = 8): Promise<ProductoWeb[]> {
  const desde = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: vistas, error }, productos] = await Promise.all([
    supabaseWeb.rpc('vistas_por_producto', { desde }),
    vendiblesHoy(),
  ]);
  if (error) throw new Error(error.message);
  const porId = new Map(((vistas || []) as { producto_pos_id: number; vistas: number }[]).map((v) => [v.producto_pos_id, Number(v.vistas) || 0]));
  return productos
    .filter(sinServicios)
    .filter((p) => (porId.get(p.producto_pos_id) ?? 0) > 0)
    .sort((a, b) => (porId.get(b.producto_pos_id) ?? 0) - (porId.get(a.producto_pos_id) ?? 0))
    .slice(0, limite);
}

/** Los servicios de SERVICIOS_INICIO que hoy están publicados, en ese orden. */
export async function listarServiciosInicio(): Promise<ProductoWeb[]> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('publicado_web', true)
    .in('producto_pos_id', SERVICIOS_INICIO);
  if (error) throw new Error(error.message);
  const orden = new Map(SERVICIOS_INICIO.map((id, i) => [id, i]));
  return (data || [])
    .map((p) => aplicarOferta(p as ProductoWeb))
    .sort((a, b) => (orden.get(a.producto_pos_id) ?? 99) - (orden.get(b.producto_pos_id) ?? 99));
}
