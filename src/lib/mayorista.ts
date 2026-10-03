import { supabaseWeb } from './supabase-web';
import { aplicarOferta } from './oferta';
import { listarCatalogo } from './catalogo';
import { esServicioTecnico } from './servicios';
import { datosMayoristaDeFila, type DatosMayorista } from './mayorista-precios';
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
    .select('producto_pos_id, precio_mayorista, desde_cantidad, precio_mayorista_2, desde_cantidad_2')
    .in('producto_pos_id', ids);
  if (error) {
    console.error('[mayorista] no se pudieron leer los precios:', error.message);
    return mapa;
  }
  for (const f of data || []) {
    mapa.set(Number(f.producto_pos_id), datosMayoristaDeFila(f));
  }
  return mapa;
}

/** Una fila de la lista de precios descargable (PDF / Excel) de /mayorista. */
export interface FilaListaPrecios {
  sku: string;
  nombre: string;
  categoria: string;
  imagen: string | null;
  /** Precio al público vigente hoy (con oferta, si la hay). */
  precio: number;
  /** Precio mayorista y su cantidad mínima, o null si el producto no tiene. */
  mayorista: DatosMayorista | null;
  stock: number;
}

/**
 * Todo el catálogo que se puede comprar hoy, por categoría, con el precio
 * mayorista de los productos que lo tienen (dueño, 02-10-2026: una lista
 * que la cuenta mayorista pueda bajar en PDF o Excel). Solo servidor, y solo
 * se llama desde /mayorista después de comprobar que la cuenta está APROBADA:
 * lleva precios mayoristas.
 *
 * Quedan fuera los servicios técnicos, los encargos y lo que es "precio a
 * consultar": nada de eso tiene precio mayorista ni se vende por cantidad.
 */
export async function listarPreciosParaMayoristas(): Promise<FilaListaPrecios[]> {
  const catalogo = (await listarCatalogo()).filter((p) => !esServicioTecnico(p) && !p.precio_a_consultar);
  const precios = await preciosMayoristasDe(catalogo.map((p) => Number(p.producto_pos_id)));
  return catalogo
    .map((p) => {
      const m = precios.get(Number(p.producto_pos_id)) ?? null;
      // Mismas condiciones que la lista de /mayorista: hay stock para una compra completa y es más barato que hoy.
      const vale = !!m && p.stock_web >= m.desde && m.precio < p.precio_web;
      return {
        sku: p.sku,
        nombre: p.nombre,
        categoria: p.categoria || 'Otros',
        imagen: p.imagen_urls?.[0] ?? null,
        precio: Number(p.precio_web) || 0,
        mayorista: vale ? m : null,
        stock: Number(p.stock_web) || 0,
      };
    })
    .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
}

/** Lista para la página /mayorista: productos publicados, con stock para al
 *  menos una compra mayorista, con su precio vigente (oferta incluida). */
export async function listarCatalogoMayorista(): Promise<{ producto: ProductoWeb; mayorista: DatosMayorista }[]> {
  const { data: precios, error } = await supabaseWeb
    .from('precios_mayoristas')
    .select('producto_pos_id, precio_mayorista, desde_cantidad, precio_mayorista_2, desde_cantidad_2');
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
  const porId = new Map((precios || []).map((p) => [Number(p.producto_pos_id), datosMayoristaDeFila(p)]));
  return (productos || [])
    .map((p) => aplicarOferta(p as ProductoWeb))
    .filter((p) => !p.precio_a_consultar)
    .map((producto) => ({ producto, mayorista: porId.get(Number(producto.producto_pos_id)) as DatosMayorista }))
    .filter(({ producto, mayorista }) => mayorista && producto.stock_web >= mayorista.desde && mayorista.precio < producto.precio_web)
    .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre, 'es'));
}
