import { listarCatalogo } from './catalogo';
import { finDeOfertaLegible, inicioDeOfertaLegible } from './formato';
import { porcentajeDescuento } from './oferta';
import type { ProductoWeb } from './tipos';

/**
 * Página /ofertas y su franja (02-10-2026, Cyber del 5 al 7 de octubre).
 *
 * No hay un "modo oferta" que encender: todo sale de las fechas que cada
 * producto trae del POS (supabase/37). Si hay ofertas vigentes, la franja
 * aparece y /ofertas las lista; cuando terminan, desaparecen solas. Antes
 * de que empiecen se anuncian, sin mostrar todavía el precio de oferta.
 */

/** Nombre de la campaña mientras dura (o antes de que empiece). Fuera de
 *  esas fechas, una oferta suelta se anuncia simplemente como "Ofertas".
 *  "Cyber Monday" es marca de la Cámara de Comercio de Santiago: sin
 *  inscripción no se usa, por eso "Cyber Sevelin". */
const CAMPANA = { nombre: 'Cyber Sevelin', hasta: '2026-10-08T03:00:00Z' };

export function tituloOfertas(ahora = Date.now()): string {
  return ahora < Date.parse(CAMPANA.hasta) ? CAMPANA.nombre : 'Ofertas';
}

/** Tiene una oferta cargada que todavía no empieza. */
function ofertaPorEmpezar(p: ProductoWeb, ahora: number): boolean {
  const oferta = Number(p.precio_oferta);
  if (p.precio_a_consultar || !oferta || oferta <= 0 || !p.oferta_desde || !p.oferta_hasta) return false;
  const desde = Date.parse(p.oferta_desde);
  const hasta = Date.parse(p.oferta_hasta);
  return Number.isFinite(desde) && Number.isFinite(hasta) && desde > ahora && hasta > desde && oferta < Number(p.precio_web);
}

export interface ListaOfertas {
  /** Con oferta vigente ahora: precio_web ya es el de oferta y precio_antes el normal. */
  vigentes: ProductoWeb[];
  /** Con oferta cargada que todavía no empieza: precio_web sigue siendo el normal. */
  proximas: ProductoWeb[];
  /** Cuándo termina la primera de las vigentes (ISO), o null. */
  terminan: string | null;
  /** Cuándo empieza la primera de las próximas (ISO), o null. */
  empiezan: string | null;
}

export async function listarOfertas(ahora = Date.now()): Promise<ListaOfertas> {
  // listarCatalogo ya pasa cada producto por aplicarOferta y solo trae lo que se puede comprar hoy.
  const catalogo = await listarCatalogo();
  const vigentes = catalogo
    .filter((p) => !!p.precio_antes)
    .sort((a, b) => (porcentajeDescuento(b.precio_antes, b.precio_web) ?? 0) - (porcentajeDescuento(a.precio_antes, a.precio_web) ?? 0));
  const proximas = catalogo
    .filter((p) => !p.precio_antes && ofertaPorEmpezar(p, ahora))
    .sort((a, b) => Date.parse(a.oferta_desde as string) - Date.parse(b.oferta_desde as string) || a.nombre.localeCompare(b.nombre, 'es'));
  const primera = (fechas: (string | null | undefined)[]) =>
    fechas.filter((f): f is string => !!f).sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;
  return {
    vigentes,
    proximas,
    terminan: primera(vigentes.map((p) => p.oferta_hasta)),
    empiezan: primera(proximas.map((p) => p.oferta_desde)),
  };
}

/** Lo que necesita la franja: si se muestra y qué dice. Los textos se arman
 *  en el servidor (hora de Chile) para que el navegador no los recalcule. */
export interface EstadoOfertas {
  activo: boolean;
  titulo: string;
  texto: string;
}

export async function estadoOfertas(ahora = Date.now()): Promise<EstadoOfertas> {
  const { vigentes, proximas, terminan, empiezan } = await listarOfertas(ahora);
  const titulo = tituloOfertas(ahora);
  if (vigentes.length && terminan) {
    const cuantas = vigentes.length === 1 ? '1 producto en oferta' : `${vigentes.length} productos en oferta`;
    return { activo: true, titulo, texto: `${cuantas} hasta el ${finDeOfertaLegible(terminan)}` };
  }
  if (proximas.length && empiezan) {
    return { activo: true, titulo, texto: `Empieza el ${inicioDeOfertaLegible(empiezan)}` };
  }
  return { activo: false, titulo, texto: '' };
}
