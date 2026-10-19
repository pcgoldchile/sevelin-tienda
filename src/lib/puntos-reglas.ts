/**
 * Reglas de los Puntos Sevelin (supabase/47). Sin base de datos: lo usan el servidor, el
 * sync y las fichas. El POS tiene una copia de estas mismas reglas en api/index.js
 * (bloque PUNTOS): si cambia una, se cambia en las dos.
 * Diseño y auditoría: sevelin-pos-oficial/docs/fidelizacion/DISENO-PUNTOS-SEVELIN.md.
 */

/** Interruptor público: el "Suma N puntos" de la ficha y las bases de /puntos. Lo prende el
 *  dueño después de una compra de prueba (19-10-2026). La caja del POS funciona igual. */
export const PUNTOS_PUBLICOS = false;

export const PUNTOS = {
  diasPendiente: 10,          // lo ganado se puede usar a los 10 días (devoluciones)
  mesesVigencia: 12,
  bienvenida: 1000,           // con la primera compra de $10.000 o más
  compraMinimaBienvenida: 10000,
  minimoCanje: 2000,
  compraMinimaCanje: 10000,
  topeCanjeTotal: 0.10,       // del total de la compra
  topeCanjeUtilidad: 0.50,    // de la utilidad de esa venta
  topePorCompra: 20000,
  topePorMes: 50000,
} as const;

/** Cuántos puntos por cada $ suma un producto, según su margen. Servicio técnico 2%. */
export function tasaPuntos(p: { es_servicio?: boolean | null; categoria?: string | null; costo_unitario?: number | null; precio?: number | null; enOferta?: boolean; mayorista?: boolean }): number {
  if (p.mayorista) return 0;
  if (p.es_servicio || p.categoria === 'Servicios Técnicos') return 0.02;
  const costo = Number(p.costo_unitario) || 0;
  const precio = Number(p.precio) || 0;
  if (p.enOferta || !(costo > 0) || !(precio > 0)) return 0.0025;
  const margen = (precio - costo) / precio;
  if (margen >= 0.2) return 0.01;
  if (margen >= 0.1) return 0.005;
  return 0.0025;
}

export interface MovimientoPuntos {
  tipo: string;
  puntos: number;
  anulado: boolean;
  disponible_desde: string;
  vence_en: string | null;
  creado_en: string;
}

export interface SaldoPuntos {
  disponible: number;
  pendiente: number;
  porVencer30: number;
  proximoVencimiento: string | null;
}

/** Saldo con vencimiento por orden de llegada: los canjes y reversos gastan primero lo más viejo. */
export function calcularSaldo(movimientos: MovimientoPuntos[], ahora = Date.now()): SaldoPuntos {
  const validos = movimientos.filter((m) => !m.anulado).sort((a, b) => Date.parse(a.creado_en) - Date.parse(b.creado_en));
  const lotes = validos.filter((m) => m.puntos > 0).map((m) => ({ resto: m.puntos, creado: Date.parse(m.creado_en), desde: Date.parse(m.disponible_desde), vence: m.vence_en ? Date.parse(m.vence_en) : Infinity }));
  /* Cada canje o reverso gasta lo más viejo que estaba VIGENTE en ese momento (nunca puntos ya
     vencidos); lo que no alcance (un reverso de algo por confirmar) sale de cualquier lote que quede. */
  for (const m of validos.filter((x) => x.puntos < 0)) {
    let falta = -m.puntos;
    const t = Date.parse(m.creado_en);
    for (const l of lotes) {
      if (falta <= 0) break;
      if (l.resto <= 0 || l.creado > t || l.vence <= t) continue;
      const usa = Math.min(l.resto, falta); l.resto -= usa; falta -= usa;
    }
    for (const l of lotes) {
      if (falta <= 0) break;
      if (l.resto <= 0 || l.vence <= t) continue;
      const usa = Math.min(l.resto, falta); l.resto -= usa; falta -= usa;
    }
  }
  let disponible = 0, pendiente = 0, porVencer30 = 0;
  let proximo = Infinity;
  for (const l of lotes) {
    if (l.resto <= 0 || l.vence <= ahora) continue;
    if (l.desde > ahora) { pendiente += l.resto; continue; }
    disponible += l.resto;
    if (l.vence - ahora <= 30 * 86400000) porVencer30 += l.resto;
    proximo = Math.min(proximo, l.vence);
  }
  return { disponible, pendiente, porVencer30, proximoVencimiento: Number.isFinite(proximo) ? new Date(proximo).toISOString() : null };
}

export const fmtPuntos = (n: number) => Math.round(n).toLocaleString('es-CL');
