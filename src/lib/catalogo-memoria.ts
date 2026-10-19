import { supabaseWeb } from './supabase-web';
import { aplicarOferta } from './oferta';
import type { ProductoWeb } from './tipos';

/* Lo publicado, guardado un minuto en la memoria del servidor. Lo usan las
   sugerencias del buscador (una consulta por tecla sería demasiado) y
   "vistos recientemente". Un precio o stock cambiado tarda como mucho un
   minuto en verse ahí; la ficha y el carrito siempre leen la base. */
const DURACION_MS = 60_000;
let guardado: { hasta: number; productos: ProductoWeb[] } | null = null;

export async function publicadosEnMemoria(): Promise<ProductoWeb[]> {
  if (guardado && guardado.hasta > Date.now()) return guardado.productos;
  const { data, error } = await supabaseWeb.from('productos_web').select('*').eq('publicado_web', true);
  if (error) throw new Error(error.message);
  const productos = (data || []).map((p) => aplicarOferta(p));
  guardado = { hasta: Date.now() + DURACION_MS, productos };
  return productos;
}
