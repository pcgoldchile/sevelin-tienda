import { createHash, randomInt } from 'node:crypto';
import { supabaseWeb } from './supabase-web';
import { PUNTOS, calcularSaldo, type MovimientoPuntos } from './puntos-reglas';
import type { PedidoWeb } from './tipos';

/**
 * Puntos Sevelin en la tienda (supabase/47): la cuenta del cliente web, su saldo y lo que
 * suman sus compras en sevelin.cl. Solo servidor (service_role). El canje se hace en el
 * local por ahora: en la web la cuenta muestra el saldo y genera el código de canje.
 */

export interface CuentaPuntos {
  id: string;
  codigo: string;
  telefono: string;
  rut: string | null;
  nombre: string;
  correo: string | null;
  user_id: string | null;
  es_personal: boolean;
  bono_bienvenida: boolean;
  creado_en: string;
}

/** +569XXXXXXXX o null. Acepta "9 1234 5678", "+56 9 1234 5678", "912345678". */
export function normalizarTelefonoPuntos(valor: string): string | null {
  const d = String(valor || '').replace(/\D/g, '');
  const ocho = d.length === 11 && d.startsWith('569') ? d.slice(3) : d.length === 9 && d.startsWith('9') ? d.slice(1) : null;
  return ocho && /^\d{8}$/.test(ocho) ? `+569${ocho}` : null;
}

const LETRAS_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** SEV-XXXXX + dígito verificador (suma ponderada mod 10): un error de tipeo no cae en otra cuenta. */
export function nuevoCodigoSev(): string {
  const cuerpo = Array.from({ length: 5 }, () => LETRAS_CODIGO[randomInt(LETRAS_CODIGO.length)]).join('');
  return `SEV-${cuerpo}${digitoSev(cuerpo)}`;
}
export function digitoSev(cuerpo: string): number {
  return [...cuerpo].reduce((s, c, i) => s + (LETRAS_CODIGO.indexOf(c) + 1) * (i + 2), 0) % 10;
}

export function hashCodigoCanje(cuentaId: string, codigo: string): string {
  return createHash('sha256').update(`${cuentaId}:${codigo}`).digest('hex');
}

export async function cuentaDeUsuario(userId: string): Promise<CuentaPuntos | null> {
  const { data, error } = await supabaseWeb.from('cuentas_puntos').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CuentaPuntos) ?? null;
}

export async function movimientosDe(cuentaId: string): Promise<(MovimientoPuntos & { id: number; origen: string; detalle: Record<string, unknown> })[]> {
  const { data, error } = await supabaseWeb.from('movimientos_puntos').select('*').eq('cuenta_id', cuentaId).order('creado_en', { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return (data || []) as never;
}

export async function saldoDe(cuentaId: string) {
  return calcularSaldo(await movimientosDe(cuentaId));
}

/**
 * Activar los puntos desde la web. Si ese teléfono ya tiene cuenta (creada en el local), se
 * une sola SOLO si el correo de esa cuenta es el mismo de la sesión (correo verificado por
 * Supabase): así nadie se queda con los puntos de otro escribiendo su número.
 */
export async function activarCuentaWeb(user: { id: string; email?: string | null }, datos: { telefono: string; nombre: string; fechaNacimiento: string | null; consentimiento: boolean }):
  Promise<{ ok: true; cuenta: CuentaPuntos; unida: boolean } | { ok: false; error: string }> {
  if (!datos.consentimiento) return { ok: false, error: 'Para activar los puntos tienes que aceptar las bases y el uso de tus datos.' };
  const telefono = normalizarTelefonoPuntos(datos.telefono);
  if (!telefono) return { ok: false, error: 'Escribe tu celular, por ejemplo 9 1234 5678.' };
  const nombre = datos.nombre.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (nombre.length < 2) return { ok: false, error: 'Escribe tu nombre.' };
  const yaTiene = await cuentaDeUsuario(user.id);
  if (yaTiene) return { ok: true, cuenta: yaTiene, unida: false };

  const { data: existente, error: e1 } = await supabaseWeb.from('cuentas_puntos').select('*').eq('telefono', telefono).maybeSingle();
  if (e1) throw new Error(e1.message);
  if (existente) {
    const correoSesion = String(user.email || '').toLowerCase();
    if (existente.user_id) return { ok: false, error: 'Ese celular ya está unido a otra cuenta de sevelin.cl. Escríbenos por WhatsApp si es tuyo.' };
    if (existente.correo && existente.correo.toLowerCase() === correoSesion) {
      const { data, error } = await supabaseWeb.from('cuentas_puntos').update({ user_id: user.id }).eq('id', existente.id).is('user_id', null).select().single();
      if (error) throw new Error(error.message);
      return { ok: true, cuenta: data as CuentaPuntos, unida: true };
    }
    return { ok: false, error: 'Ese celular ya tiene puntos de compras en el local. Para unirlos a esta cuenta, en tu próxima compra pídele al cajero que agregue este correo a tu cuenta de puntos, y se unen solas.' };
  }

  for (let intento = 0; intento < 5; intento++) {
    const { data, error } = await supabaseWeb.from('cuentas_puntos').insert({
      codigo: nuevoCodigoSev(), telefono, nombre, correo: user.email?.toLowerCase() || null, user_id: user.id,
      fecha_nacimiento: datos.fechaNacimiento, consentimiento: true, consentimiento_en: new Date().toISOString(), creado_por: 'web',
    }).select().single();
    if (!error) return { ok: true, cuenta: data as CuentaPuntos, unida: false };
    if (!/codigo/.test(error.message)) throw new Error(error.message);
  }
  throw new Error('No se pudo crear el código de la cuenta');
}

/** Código de canje de 6 números para mostrar en la cuenta web (vale 10 minutos). */
export async function generarCodigoCanje(cuentaId: string, creadoPor: string): Promise<string> {
  const codigo = String(randomInt(0, 1000000)).padStart(6, '0');
  const { error } = await supabaseWeb.from('codigos_canje').insert({
    cuenta_id: cuentaId, codigo_hash: hashCodigoCanje(cuentaId, codigo), expira_en: new Date(Date.now() + 10 * 60000).toISOString(), creado_por: creadoPor,
  });
  if (error) throw new Error(error.message);
  return codigo;
}

/**
 * Lo que suma una compra pagada en sevelin.cl, si el pedido tiene usuario y ese usuario tiene
 * cuenta de puntos. Nunca lanza: es un extra del pago, no puede romper la confirmación.
 */
export async function acreditarPuntosPedidoWeb(pedido: PedidoWeb): Promise<void> {
  try {
    if (!pedido.cliente_user_id) return;
    const cuenta = await cuentaDeUsuario(pedido.cliente_user_id);
    if (!cuenta || cuenta.es_personal) return;
    const ids = (pedido.items || []).map((i) => i.producto_pos_id).filter(Boolean);
    if (!ids.length) return;
    const { data: prods } = await supabaseWeb.from('productos_web').select('producto_pos_id, tasa_puntos, precio_oferta, oferta_desde, oferta_hasta').in('producto_pos_id', ids);
    /* En oferta suma lo mínimo (0,25%): la oferta ya es el descuento */
    const enOferta = (p: { precio_oferta: number | null; oferta_desde: string | null; oferta_hasta: string | null }) =>
      Number(p.precio_oferta) > 0 && !!p.oferta_desde && !!p.oferta_hasta && Date.parse(p.oferta_desde) <= Date.now() && Date.now() <= Date.parse(p.oferta_hasta);
    const tasa = new Map((prods || []).map((p) => [p.producto_pos_id, enOferta(p) ? Math.min(0.0025, Number(p.tasa_puntos) || 0) : Number(p.tasa_puntos) || 0]));
    const subtotal = (pedido.items || []).reduce((s, i) => s + Number(i.precio_web) * Number(i.cantidad), 0);
    const pagado = Number(pedido.subtotal) || subtotal;
    const factor = subtotal > 0 ? Math.min(1, pagado / subtotal) : 0;
    /* Las líneas mayoristas no suman (regla: los puntos no aplican a ventas mayoristas) */
    const base = (pedido.items || []).reduce((s, i) => s + (i.precio_tipo === 'MAYORISTA' ? 0 : Number(i.precio_web) * Number(i.cantidad) * (tasa.get(i.producto_pos_id) ?? 0)), 0);
    let puntos = Math.floor(base * factor);
    if (puntos <= 0) return;

    /* Topes: por compra y por mes */
    const desdeMes = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: delMes } = await supabaseWeb.from('movimientos_puntos').select('puntos').eq('cuenta_id', cuenta.id).eq('tipo', 'compra').eq('anulado', false).gte('creado_en', desdeMes);
    const ganadoMes = (delMes || []).reduce((s, m) => s + Number(m.puntos), 0);
    puntos = Math.max(0, Math.min(puntos, PUNTOS.topePorCompra, PUNTOS.topePorMes - ganadoMes));
    const ahora = Date.now();
    const disponible = new Date(ahora + PUNTOS.diasPendiente * 86400000).toISOString();
    const vence = new Date(ahora + PUNTOS.mesesVigencia * 30.44 * 86400000).toISOString();
    if (puntos > 0) {
      const { error } = await supabaseWeb.from('movimientos_puntos').insert({
        cuenta_id: cuenta.id, tipo: 'compra', puntos, origen: 'web', venta_ref: pedido.numero_pedido,
        disponible_desde: disponible, vence_en: vence, detalle: { total: pagado }, creado_por: 'web',
      });
      if (error && !/duplicate|23505/.test(error.message)) throw new Error(error.message);
    }
    /* Bono de bienvenida: con la primera compra de $10.000 o más, una sola vez */
    if (!cuenta.bono_bienvenida && pagado >= PUNTOS.compraMinimaBienvenida) {
      const { data: marcada } = await supabaseWeb.from('cuentas_puntos').update({ bono_bienvenida: true }).eq('id', cuenta.id).eq('bono_bienvenida', false).select('id');
      if (marcada?.length) {
        await supabaseWeb.from('movimientos_puntos').insert({
          cuenta_id: cuenta.id, tipo: 'bienvenida', puntos: PUNTOS.bienvenida, origen: 'web', venta_ref: pedido.numero_pedido,
          disponible_desde: disponible, vence_en: vence, creado_por: 'web',
        });
      }
    }
  } catch (err) {
    console.error('[puntos] no se pudieron acreditar los puntos del pedido', pedido.numero_pedido, err instanceof Error ? err.message : err);
  }
}
