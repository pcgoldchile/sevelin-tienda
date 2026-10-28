import { supabaseWeb } from './supabase-web';

/** Ventana de "activo ahora" — con latidos cada 60 s (28-10-2026), 2 latidos y medio sin
 * responder y se considera que la persona ya no está. El POS usa la misma ventana. */
export const VENTANA_ACTIVO_MS = 150 * 1000;

/** Registra/actualiza el latido de una sesión — mejor esfuerzo, igual que
 * registrarVisita() en eventos-web.ts: nunca debe romper la navegación
 * del cliente por un fallo acá. */
export async function registrarLatido(sessionId: string): Promise<void> {
  try {
    await supabaseWeb.from('visitas_activas').upsert(
      { session_id: sessionId, ultima_actividad: new Date().toISOString() },
      { onConflict: 'session_id' }
    );
  } catch (err) {
    console.error('[visitas-activas] No se pudo registrar el latido:', err instanceof Error ? err.message : err);
  }
}

/** Cuántas sesiones distintas laten dentro de la ventana — usado por
 * GET /api/pos/metricas en el POS (dbWeb, no este cliente). Se exporta
 * también acá por si algún día se necesita desde dentro de esta tienda. */
export async function contarActivosAhora(): Promise<number> {
  const limite = new Date(Date.now() - VENTANA_ACTIVO_MS).toISOString();
  const { count } = await supabaseWeb
    .from('visitas_activas')
    .select('*', { count: 'exact', head: true })
    .gte('ultima_actividad', limite);
  return count || 0;
}
