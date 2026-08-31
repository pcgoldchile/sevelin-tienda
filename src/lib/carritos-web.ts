import { randomBytes } from 'crypto';
import { supabaseWeb } from './supabase-web';

/** Duración de un carrito persistente (compartido o de abandono) — 24 horas.
 * Es el mismo número que se le muestra al usuario en el aviso de "Compartir
 * carrito" y el mismo plazo que se le da a un carrito abandonado antes de
 * que el link/recordatorio deje de servir. */
export const DURACION_CARRITO_MS = 24 * 60 * 60 * 1000;

export interface ItemCarritoWeb {
  sku: string;
  cantidad: number;
}

function generarToken(): string {
  return randomBytes(9).toString('base64url');
}

function calcularExpiracion(): string {
  return new Date(Date.now() + DURACION_CARRITO_MS).toISOString();
}

/** Crea el carrito detrás de un link "Compartir carrito" — antes viajaba
 * codificado en la URL sin vencimiento; ahora solo el token va en la URL. */
export async function crearCarritoCompartido(items: ItemCarritoWeb[]): Promise<{ token: string; expiraEn: string }> {
  const token = generarToken();
  const expiraEn = calcularExpiracion();
  const { error } = await supabaseWeb
    .from('carritos_web')
    .insert({ token, origen: 'compartido', items, expira_en: expiraEn });
  if (error) throw new Error('No se pudo crear el link de carrito: ' + error.message);
  return { token, expiraEn };
}

/** `null` si el token no existe. `expirado: true` si existe pero ya pasaron
 * las 24 horas — el llamador decide qué mostrar (nunca se borra la fila:
 * sirve para el conteo histórico de carritos compartidos). */
export async function obtenerCarritoCompartido(token: string): Promise<{ items: ItemCarritoWeb[]; expirado: boolean } | null> {
  const { data, error } = await supabaseWeb
    .from('carritos_web')
    .select('items, expira_en')
    .eq('token', token)
    .eq('origen', 'compartido')
    .maybeSingle();
  if (error || !data) return null;
  return { items: data.items as ItemCarritoWeb[], expirado: new Date(data.expira_en).getTime() < Date.now() };
}

/** Guarda (o actualiza) el carrito de un cliente que llegó al checkout y
 * completó su correo, para poder recordarle si no vuelve a comprar dentro
 * de 24h. `id` viene del llamado anterior si ya existía (mismo checkout,
 * el cliente sigue editando el carrito o el correo) — si no llega o ya no
 * existe, se crea una fila nueva. */
export async function guardarCarritoAbandonado(params: { id?: string; items: ItemCarritoWeb[]; correo: string }): Promise<{ id: string }> {
  const expiraEn = calcularExpiracion();
  const actualizadoEn = new Date().toISOString();

  if (params.id) {
    const { data, error } = await supabaseWeb
      .from('carritos_web')
      .update({ items: params.items, correo: params.correo, expira_en: expiraEn, actualizado_en: actualizadoEn })
      .eq('id', params.id)
      .eq('origen', 'checkout')
      .select('id')
      .maybeSingle();
    if (!error && data) return { id: data.id };
  }

  const token = generarToken();
  const { data, error } = await supabaseWeb
    .from('carritos_web')
    .insert({ token, origen: 'checkout', items: params.items, correo: params.correo, expira_en: expiraEn })
    .select('id')
    .single();
  if (error || !data) throw new Error('No se pudo guardar el carrito: ' + (error?.message || 'sin datos'));
  return { id: data.id };
}

/** Apaga el recordatorio de abandono: el carrito sí terminó en un pedido. */
export async function marcarCarritoConvertido(id: string | null | undefined, numeroPedido: string): Promise<void> {
  if (!id) return;
  await supabaseWeb.from('carritos_web').update({ numero_pedido: numeroPedido }).eq('id', id).eq('origen', 'checkout');
}
