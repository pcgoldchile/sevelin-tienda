import { supabaseWeb } from './supabase-web';
import { aplicarOferta } from './oferta';
import type { ProductoWeb } from './tipos';

/**
 * Agotados (30-09-2026, pedido del dueño: "un módulo de agotados, para que el
 * cliente cotice, pida un encargo en caso de ser necesario, o reserve la
 * unidad si está por llegar").
 *
 * "Agotado de verdad" = el mismo criterio de la ficha: publicado, sin stock,
 * sin reposición anunciada (los por_llegar se reservan en /por-llegar) y sin
 * ser encargo (esos nunca tienen stock propio a propósito).
 */
export async function listarAgotados(): Promise<ProductoWeb[]> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('publicado_web', true)
    .eq('es_pedido_encargo', false)
    .eq('por_llegar', false)
    .lte('stock_web', 0)
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((p) => aplicarOferta(p));
}

/** WhatsApp con el producto ya escrito: el cliente solo tiene que enviar. */
export function urlPedirAgotado(whatsapp: string | undefined, nombre: string, url: string): string | null {
  if (!whatsapp) return null;
  const mensaje =
    `Hola, vi en sevelin.cl "${nombre}", que está agotado. ` +
    `¿Me lo pueden conseguir por encargo o saben cuándo vuelve? ${url}`;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
