import { supabaseWeb } from './supabase-web';
import { VERSION_POLITICA_PRIVACIDAD } from './politica-privacidad';

/**
 * Lista de espera de un producto: quien quiere algo que no está.
 *
 * Dos modos que son el mismo problema (ver supabase/28):
 *   AVISO   → solo quiere enterarse cuando llegue. No compromete plata.
 *             También sirve a quien prefiere pagar presencial.
 *   RESERVA → pagó el 100% y el producto queda a su nombre.
 *
 * LEY 21.719: el correo se guarda con una finalidad única y acotada —
 * avisar de ESTE producto— con consentimiento fechado, y la fila pasa a
 * NOTIFICADO cuando se cumple. No es una lista de marketing y nunca debe
 * usarse como tal: ese consentimiento es otro y vive en perfiles_clientes.
 */

export interface AvisoProducto {
  id: number;
  producto_pos_id: number;
  sku: string;
  nombre_producto: string;
  tipo: 'AVISO' | 'RESERVA';
  email: string;
  nombre: string | null;
  telefono: string | null;
  numero_pedido: string | null;
  estado: 'PENDIENTE' | 'NOTIFICADO' | 'CANCELADO';
  notificado_en: string | null;
  creado_en: string;
}

/**
 * Anota a alguien en la lista de espera.
 *
 * Si ya estaba anotado y pendiente, no falla ni duplica: se trata como
 * éxito. Para el cliente el resultado es el mismo —va a recibir el aviso—
 * y decirle "ya estabas en la lista" como si fuera un error solo lo
 * confundiría.
 */
export async function anotarAviso(datos: {
  productoPosId: number;
  sku: string;
  nombreProducto: string;
  tipo?: 'AVISO' | 'RESERVA';
  email: string;
  nombre?: string | null;
  telefono?: string | null;
  numeroPedido?: string | null;
}): Promise<{ ok: boolean; yaEstaba: boolean }> {
  const { error } = await supabaseWeb.from('avisos_producto').insert({
    producto_pos_id: datos.productoPosId,
    sku: datos.sku,
    nombre_producto: datos.nombreProducto,
    tipo: datos.tipo || 'AVISO',
    email: datos.email.trim().toLowerCase(),
    nombre: datos.nombre?.trim() || null,
    telefono: datos.telefono?.trim() || null,
    numero_pedido: datos.numeroPedido || null,
    consentimiento: true,
    version_politica: VERSION_POLITICA_PRIVACIDAD,
  });

  if (error) {
    // 23505 = índice único: ya está anotado y pendiente.
    if (error.code === '23505') return { ok: true, yaEstaba: true };
    console.error('[avisos] no se pudo anotar:', error.message);
    throw new Error('No pudimos anotarte. Intenta de nuevo en unos minutos.');
  }

  return { ok: true, yaEstaba: false };
}

/** Quiénes esperan un producto. La usa el disparador de "ya llegó". */
export async function avisosPendientesDe(productoPosId: number): Promise<AvisoProducto[]> {
  const { data, error } = await supabaseWeb
    .from('avisos_producto')
    .select('*')
    .eq('producto_pos_id', productoPosId)
    .eq('estado', 'PENDIENTE')
    .order('creado_en', { ascending: true });

  if (error) {
    console.error('[avisos] no se pudieron leer los pendientes:', error.message);
    return [];
  }
  return (data || []) as AvisoProducto[];
}

/**
 * Cierra los avisos ya enviados.
 *
 * Se marcan DESPUÉS de mandar el correo, nunca antes: si el envío falla,
 * la fila sigue pendiente y el próximo intento la vuelve a tomar. Al revés
 * —marcar primero— se perdería el aviso en silencio, que es justo lo que
 * el cliente estaba esperando.
 */
export async function marcarAvisosNotificados(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabaseWeb
    .from('avisos_producto')
    .update({ estado: 'NOTIFICADO', notificado_en: new Date().toISOString() })
    .in('id', ids);
  if (error) console.error('[avisos] no se pudieron marcar como notificados:', error.message);
}
