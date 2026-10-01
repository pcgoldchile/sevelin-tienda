import { supabaseWeb } from './supabase-web';
import { aplicarOferta } from './oferta';
import type { DatosMayorista } from './mayorista-precios';
import type { ProductoWeb } from './tipos';

/**
 * Venta mayorista, Fase 1 — acceso a datos (solo servidor: usa la
 * service_role). Tablas en supabase/39: cuentas_mayoristas,
 * precios_mayoristas y ajustes_mayorista, todas sin políticas.
 *
 * Todo falla "hacia precio normal": si una lectura falla, el cliente se
 * trata como no mayorista. El peor caso es cobrar el precio normal (y el
 * checkout lo avisa antes de cobrar si difiere de lo que el cliente vio),
 * nunca cobrar de menos.
 */

export type EstadoCuentaMayorista = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'SUSPENDIDA';

export interface CuentaMayorista {
  user_id: string;
  estado: EstadoCuentaMayorista;
  nombre: string;
  rut: string;
  telefono: string;
  email: string;
  ciudad: string;
  actividad: string;
  declara_reventa: boolean;
  solicitado_en: string;
  revisado_en: string | null;
}

export const PEDIDO_MINIMO_POR_DEFECTO = 100000;

export async function cuentaMayoristaDe(userId: string | null | undefined): Promise<CuentaMayorista | null> {
  if (!userId) return null;
  const { data, error } = await supabaseWeb
    .from('cuentas_mayoristas')
    .select('user_id, estado, nombre, rut, telefono, email, ciudad, actividad, declara_reventa, solicitado_en, revisado_en')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[mayorista] no se pudo leer la cuenta:', error.message);
    return null;
  }
  return (data as CuentaMayorista) || null;
}

export async function pedidoMinimoMayorista(): Promise<number> {
  const { data, error } = await supabaseWeb.from('ajustes_mayorista').select('pedido_minimo').eq('id', 1).maybeSingle();
  if (error || !data) {
    if (error) console.error('[mayorista] no se pudo leer el pedido mínimo:', error.message);
    return PEDIDO_MINIMO_POR_DEFECTO;
  }
  return Number(data.pedido_minimo) || 0;
}

/** Datos para cobrar como mayorista, o null si la sesión no es de una
 *  cuenta APROBADA. */
export async function contextoMayorista(userId: string | null | undefined): Promise<{ pedidoMinimo: number } | null> {
  const cuenta = await cuentaMayoristaDe(userId);
  if (cuenta?.estado !== 'APROBADA') return null;
  return { pedidoMinimo: await pedidoMinimoMayorista() };
}

export async function preciosMayoristasDe(productoPosIds: number[]): Promise<Map<number, DatosMayorista>> {
  const ids = [...new Set(productoPosIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  const mapa = new Map<number, DatosMayorista>();
  if (!ids.length) return mapa;
  const { data, error } = await supabaseWeb
    .from('precios_mayoristas')
    .select('producto_pos_id, precio_mayorista, desde_cantidad')
    .in('producto_pos_id', ids);
  if (error) {
    console.error('[mayorista] no se pudieron leer los precios:', error.message);
    return mapa;
  }
  for (const f of data || []) {
    mapa.set(Number(f.producto_pos_id), { precio: Number(f.precio_mayorista), desde: Number(f.desde_cantidad) });
  }
  return mapa;
}

/** Lista para la página /mayorista: productos publicados, con stock para al
 *  menos una compra mayorista, con su precio vigente (oferta incluida). */
export async function listarCatalogoMayorista(): Promise<{ producto: ProductoWeb; mayorista: DatosMayorista }[]> {
  const { data: precios, error } = await supabaseWeb
    .from('precios_mayoristas')
    .select('producto_pos_id, precio_mayorista, desde_cantidad');
  if (error) throw new Error(error.message);
  const ids = (precios || []).map((p) => Number(p.producto_pos_id));
  if (!ids.length) return [];
  const { data: productos, error: errP } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .in('producto_pos_id', ids)
    .eq('publicado_web', true)
    .eq('es_pedido_encargo', false);
  if (errP) throw new Error(errP.message);
  const porId = new Map((precios || []).map((p) => [Number(p.producto_pos_id), { precio: Number(p.precio_mayorista), desde: Number(p.desde_cantidad) }]));
  return (productos || [])
    .map((p) => aplicarOferta(p as ProductoWeb))
    .filter((p) => !p.precio_a_consultar)
    .map((producto) => ({ producto, mayorista: porId.get(Number(producto.producto_pos_id)) as DatosMayorista }))
    .filter(({ producto, mayorista }) => mayorista && producto.stock_web >= mayorista.desde && mayorista.precio < producto.precio_web)
    .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre, 'es'));
}
