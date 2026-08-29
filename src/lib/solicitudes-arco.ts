import type { SupabaseClient } from '@supabase/supabase-js';
import type { SolicitudArco } from './tipos';

/**
 * Registra el ejercicio de un derecho ARCO en `solicitudes_arco`
 * (trazabilidad — Ley 21.719). Sirve tanto para el cliente del navegador
 * (RLS: el titular solo puede insertar su propia fila) como para el
 * cliente del servidor (service_role, sin esa restricción) — cualquiera
 * de los dos expone `.from()` igual.
 *
 * Es best-effort a propósito: si falla el registro de auditoría, NUNCA
 * debe tumbar la acción real que el titular pidió (editar su perfil,
 * descargar sus datos, eliminar su cuenta) — solo se deja constancia en
 * consola.
 */
export async function registrarSolicitudArco(
  supabase: SupabaseClient,
  datos: { usuarioId: string | null; email: string; tipo: SolicitudArco['tipo']; detalle?: string }
) {
  try {
    const { error } = await supabase.from('solicitudes_arco').insert({
      usuario_id: datos.usuarioId,
      email_snapshot: datos.email,
      tipo: datos.tipo,
      detalle: datos.detalle || null,
    });
    if (error) throw error;
  } catch (err) {
    console.error('[solicitudes_arco] No se pudo registrar la solicitud:', err instanceof Error ? err.message : err);
  }
}
