import { supabaseWeb } from './supabase-web';
import { aplicarOferta } from './oferta';
import type { ProductoWeb } from './tipos';

/**
 * Destacados automáticos (dueño, 18-10-2026): "que sean relevantes y vayan
 * cambiando según cuánta importancia o clicks tengan, de forma automatizada".
 *
 * Cada día (cron de la tienda, y también apenas el POS manda sus ventas) se le
 * da un puntaje a cada producto que se puede comprar hoy:
 *
 *   ventas del mes         ×3   (vendidos_30d, lo manda el POS: mostrador + web)
 *   vistas del mes         ×2   (fichas abiertas en sevelin.cl, eventos_web)
 *   tendencia de la semana ×1.5 (vistas de los últimos 7 días contra el ritmo del mes)
 *   ventas de siempre      ×0.5 (unidades_vendidas, para desempatar)
 *   + 2.5 si el dueño le puso "🔥 Tendencia" en el POS (su forma de empujar algo a mano)
 *   + 1   si tiene "🆕 Novedad"     + 0.8 si tiene oferta vigente
 *   + 3   a los ventiladores si en Arica hace calor (máxima del día ≥ 24 °C)
 *
 * Cada señal se compara contra la más alta del catálogo (0 a 1), así ninguna
 * aplasta a las otras. La portada toma los mejores sin repetir mucho la misma
 * subcategoría. Los servicios técnicos no compiten (tienen su propia sección).
 */

/* Los textos van aparte (destacados-texto.ts): los usa también el navegador, y este
   archivo habla con la base con la llave del servidor. */
import { TEXTO_MOTIVO, type MotivoDestacado } from './destacados-texto';
export { TEXTO_MOTIVO, type MotivoDestacado };

/* Arica (centro). Open-Meteo: gratis y sin llave. */
const URL_CLIMA = 'https://api.open-meteo.com/v1/forecast?latitude=-18.48&longitude=-70.31&daily=temperature_2m_max&timezone=America%2FSantiago&forecast_days=1';
/* Medido el 18-10-2026: la semana venía entre 24,5 y 25,6 °C; en invierno Arica no pasa de ~19 °C. */
export const UMBRAL_CALOR = 24;
const SUBCATEGORIAS_CALOR = new Set(['Ventiladores']);

/* Dos intentos: la primera prueba (18-10-2026) no alcanzó a responder y el segundo sí. */
export async function maximaDeHoyEnArica(): Promise<number | null> {
  for (let intento = 0; intento < 2; intento++) {
    try {
      const r = await fetch(URL_CLIMA, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
      if (!r.ok) continue;
      const datos = await r.json();
      const t = Number(datos?.daily?.temperature_2m_max?.[0]);
      if (Number.isFinite(t)) return t;
    } catch {
      /* se intenta otra vez */
    }
  }
  return null;   // sin clima no pasa nada: los ventiladores compiten como cualquier otro
}

function puedeDestacar(p: ProductoWeb): boolean {
  return p.publicado_web && p.stock_web > 0 && !p.es_pedido_encargo && !p.precio_a_consultar && p.categoria !== 'Servicios Técnicos';
}

async function vistasDesde(dias: number): Promise<Map<number, number>> {
  const desde = new Date(Date.now() - dias * 86400000).toISOString();
  const { data, error } = await supabaseWeb.rpc('vistas_por_producto', { desde });
  if (error) throw new Error(`vistas_por_producto: ${error.message}`);
  return new Map(((data || []) as { producto_pos_id: number; vistas: number }[]).map((f) => [f.producto_pos_id, Number(f.vistas) || 0]));
}

export interface ResultadoDestacados {
  calculados: number;
  maximaArica: number | null;
  calor: boolean;
  primeros: { nombre: string; puntaje: number; motivo: MotivoDestacado }[];
}

/** Calcula y guarda el puntaje de todos los productos. Lo llaman el cron diario y la sincronización de ventas. */
export async function recalcularDestacados(): Promise<ResultadoDestacados> {
  const [{ data, error }, vistas30, vistas7, maximaArica] = await Promise.all([
    supabaseWeb.from('productos_web').select('*').eq('publicado_web', true),
    vistasDesde(30),
    vistasDesde(7),
    maximaDeHoyEnArica(),
  ]);
  if (error) throw new Error(error.message);
  const calor = maximaArica !== null && maximaArica >= UMBRAL_CALOR;
  const productos = (data || []).map((p) => aplicarOferta(p as ProductoWeb));
  const candidatos = productos.filter(puedeDestacar);

  const crudo = candidatos.map((p) => {
    const v30 = vistas30.get(p.producto_pos_id) ?? 0;
    const v7 = vistas7.get(p.producto_pos_id) ?? 0;
    // Ritmo de esta semana contra el de las 3 semanas anteriores (con piso, para que 1 vista no sea "tendencia")
    const ritmoAntes = Math.max(0.5, (v30 - v7) / 23);
    const tendencia = v7 >= 3 ? Math.min(3, v7 / 7 / ritmoAntes) : 0;
    return { p, v30, ventas30: p.vendidos_30d ?? 0, ventasTotal: p.unidades_vendidas ?? 0, tendencia };
  });
  const tope = (f: (x: (typeof crudo)[number]) => number) => Math.max(1, ...crudo.map(f));
  const topes = { v30: tope((x) => x.v30), ventas30: tope((x) => x.ventas30), ventasTotal: tope((x) => x.ventasTotal), tendencia: tope((x) => x.tendencia) };

  const ahora = new Date().toISOString();
  const filas = crudo.map((x) => {
    const partes: [MotivoDestacado, number][] = [
      ['VENDIDO', 3 * (x.ventas30 / topes.ventas30) + 0.5 * (x.ventasTotal / topes.ventasTotal)],
      ['VISTO', 2 * (x.v30 / topes.v30)],
      ['TENDENCIA', 1.5 * (x.tendencia / topes.tendencia) + (x.p.etiqueta_web === 'TENDENCIA' ? 2.5 : 0)],
      ['NOVEDAD', x.p.etiqueta_web === 'NOVEDAD' ? 1 : 0],
      ['OFERTA', x.p.precio_antes ? 0.8 : 0],
      ['CALOR', calor && x.p.subcategoria && SUBCATEGORIAS_CALOR.has(x.p.subcategoria) ? 3 : 0],
    ];
    const puntaje = partes.reduce((s, [, n]) => s + n, 0);
    const motivo = partes.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    return { producto_pos_id: x.p.producto_pos_id, puntaje: Math.round(puntaje * 1000) / 1000, motivo: puntaje > 0 ? motivo : null };
  });

  // Se escribe todo: los que no compiten hoy quedan en 0 (si no, uno agotado seguiría arriba).
  const porId = new Map(filas.map((f) => [f.producto_pos_id, f]));
  const actualizaciones = productos.map((p) => {
    const f = porId.get(p.producto_pos_id);
    return supabaseWeb.from('productos_web')
      .update({ puntaje_destacado: f?.puntaje ?? 0, motivo_destacado: f?.motivo ?? null, destacado_calculado_en: ahora })
      .eq('producto_pos_id', p.producto_pos_id);
  });
  for (let i = 0; i < actualizaciones.length; i += 25) {
    const lote = await Promise.all(actualizaciones.slice(i, i + 25));
    const fallo = lote.find((r) => r.error);
    if (fallo?.error) throw new Error(fallo.error.message);
  }

  const primeros = filas
    .filter((f) => f.motivo)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, 10)
    .map((f) => ({ nombre: productos.find((p) => p.producto_pos_id === f.producto_pos_id)?.nombre ?? '', puntaje: f.puntaje, motivo: f.motivo as MotivoDestacado }));
  return { calculados: filas.length, maximaArica, calor, primeros };
}

/**
 * Los destacados de la portada, ya calculados. Sin repetir mucho: como mucho 2
 * de la misma subcategoría y 3 de la misma categoría (si no, 8 power banks).
 * Si todavía no hay puntajes, vacío (la portada usa los más vendidos de antes).
 */
export async function listarDestacados(limite = 8): Promise<(ProductoWeb & { motivo_destacado: MotivoDestacado | null })[]> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('publicado_web', true)
    .eq('es_pedido_encargo', false)
    .gt('stock_web', 0)
    .gt('puntaje_destacado', 0)
    .order('puntaje_destacado', { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  const elegidos: (ProductoWeb & { motivo_destacado: MotivoDestacado | null })[] = [];
  const porSub = new Map<string, number>();
  const porCat = new Map<string, number>();
  for (const p of (data || []) as (ProductoWeb & { motivo_destacado: MotivoDestacado | null })[]) {
    const sub = `${p.categoria}|${p.subcategoria ?? ''}`;
    const cat = p.categoria ?? '';
    if ((porSub.get(sub) ?? 0) >= 2 || (porCat.get(cat) ?? 0) >= 3) continue;
    porSub.set(sub, (porSub.get(sub) ?? 0) + 1);
    porCat.set(cat, (porCat.get(cat) ?? 0) + 1);
    elegidos.push(aplicarOferta(p) as ProductoWeb & { motivo_destacado: MotivoDestacado | null });
    if (elegidos.length >= limite) break;
  }
  return elegidos;
}
