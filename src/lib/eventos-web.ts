import { supabaseWeb } from './supabase-web';

/**
 * Eventos de catálogo (búsquedas y vistas de producto) — el POS los lee
 * directo de `eventos_web` para el panel "Más buscados" (ver
 * sevelin-pos-oficial/api/index.js, ruta GET /api/pos/mas-buscados). Mejor
 * esfuerzo: nunca lanza, un fallo acá no puede tumbar una página real de
 * la tienda. Se llaman con `after()` (next/server) desde el Server
 * Component correspondiente, para no retrasar la respuesta al cliente.
 */
export async function registrarBusqueda(termino: string): Promise<void> {
  const limpio = termino.trim().slice(0, 200);
  if (!limpio) return;
  try {
    const { error } = await supabaseWeb.from('eventos_web').insert({ tipo: 'busqueda', termino: limpio });
    if (error) console.error('[eventos-web] No se pudo registrar la búsqueda:', error.message);
  } catch (err) {
    console.error('[eventos-web] No se pudo registrar la búsqueda:', err instanceof Error ? err.message : err);
  }
}

export async function registrarVistaProducto(productoPosId: number): Promise<void> {
  try {
    const { error } = await supabaseWeb.from('eventos_web').insert({ tipo: 'vista_producto', producto_pos_id: productoPosId });
    if (error) console.error('[eventos-web] No se pudo registrar la vista:', error.message);
  } catch (err) {
    console.error('[eventos-web] No se pudo registrar la vista:', err instanceof Error ? err.message : err);
  }
}
