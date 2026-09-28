import { randomBytes } from 'crypto';
import { supabaseWeb } from './supabase-web';

/** Ventana del recordatorio de un carrito de checkout: pasado este plazo ya no
 * se manda (el link para retomarlo sigue sirviendo igual). */
export const DURACION_CARRITO_MS = 24 * 60 * 60 * 1000;

/** Los carritos compartidos no vencen (dueño, 27-09-2026). La columna
 * expira_en es NOT NULL, así que llevan una fecha que no se alcanza. */
const SIN_VENCIMIENTO = '2999-12-31T23:59:59.000Z';

export interface ItemCarritoWeb {
  sku: string;
  cantidad: number;
}

export type OrigenCarrito = 'compartido' | 'checkout';

function generarToken(): string {
  return randomBytes(9).toString('base64url');
}

function calcularExpiracion(): string {
  return new Date(Date.now() + DURACION_CARRITO_MS).toISOString();
}

function sitio(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://sevelin.cl').replace(/\/+$/, '');
}

/** Link para abrir un carrito guardado (compartido o de checkout). */
export function urlCarrito(token: string): string {
  return `${sitio()}/carrito-compartido?t=${encodeURIComponent(token)}`;
}

/** Página para dejar de recibir recordatorios de carrito. */
export function urlBajaRecordatorios(token: string): string {
  return `${sitio()}/baja-recordatorio?t=${encodeURIComponent(token)}`;
}

/** El robot de Google Merchant Center prueba el checkout con correos de este
 * dominio: recordarle un carrito solo gasta envíos (4 de los 6 "abandonos" de
 * septiembre fueron suyos). */
export function esCorreoDeRobot(correo: string): boolean {
  return /@([a-z0-9-]+\.)*joonix\.net$/i.test(correo.trim());
}

export async function crearCarritoCompartido(items: ItemCarritoWeb[]): Promise<{ token: string }> {
  const token = generarToken();
  const { error } = await supabaseWeb
    .from('carritos_web')
    .insert({ token, origen: 'compartido', items, expira_en: SIN_VENCIMIENTO });
  if (error) throw new Error('No se pudo crear el link de carrito: ' + error.message);
  return { token };
}

/** `null` si el token no existe. No vence: los productos se revalidan contra
 * el catálogo al abrirlo, así que un link viejo nunca vende a un precio viejo. */
export async function obtenerCarritoPorToken(token: string): Promise<{ items: ItemCarritoWeb[]; origen: OrigenCarrito } | null> {
  const { data, error } = await supabaseWeb
    .from('carritos_web')
    .select('items, origen')
    .eq('token', token)
    .maybeSingle();
  if (error || !data) return null;
  return { items: data.items as ItemCarritoWeb[], origen: data.origen as OrigenCarrito };
}

/** Guarda (o actualiza) el carrito de quien llegó al checkout y dejó su
 * correo, para recordarle si no termina. `id` viene del llamado anterior
 * (mismo checkout); si no llega o ya no existe, se crea una fila nueva. */
export async function guardarCarritoAbandonado(params: {
  id?: string;
  items: ItemCarritoWeb[];
  correo: string;
  nombre?: string | null;
  telefono?: string | null;
}): Promise<{ id: string }> {
  const datos = {
    items: params.items,
    correo: params.correo,
    nombre: params.nombre || null,
    telefono: params.telefono || null,
    expira_en: calcularExpiracion(),
  };

  if (params.id) {
    const { data, error } = await supabaseWeb
      .from('carritos_web')
      .update({ ...datos, actualizado_en: new Date().toISOString() })
      .eq('id', params.id)
      .eq('origen', 'checkout')
      .select('id')
      .maybeSingle();
    if (!error && data) return { id: data.id };
  }

  const { data, error } = await supabaseWeb
    .from('carritos_web')
    .insert({ token: generarToken(), origen: 'checkout', ...datos })
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

/** ¿Este correo pidió no recibir más recordatorios? */
export async function correoDadoDeBaja(correo: string): Promise<boolean> {
  const { data } = await supabaseWeb
    .from('correos_sin_recordatorio')
    .select('correo')
    .eq('correo', correo.trim().toLowerCase())
    .maybeSingle();
  return !!data;
}

/** Da de baja el correo del carrito de ese token. Devuelve el correo, o null
 * si el token no existe o no tiene correo. */
export async function darDeBajaRecordatorios(token: string): Promise<string | null> {
  const { data } = await supabaseWeb
    .from('carritos_web')
    .select('correo')
    .eq('token', token)
    .maybeSingle();
  const correo = (data?.correo || '').trim().toLowerCase();
  if (!correo) return null;
  const { error } = await supabaseWeb.from('correos_sin_recordatorio').upsert({ correo }, { onConflict: 'correo' });
  if (error) throw new Error('No se pudo registrar la baja: ' + error.message);
  return correo;
}
