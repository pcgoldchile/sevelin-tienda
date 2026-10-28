import { unstable_cache } from 'next/cache';
import { supabaseWeb } from './supabase-web';
import { HORARIO_POR_DEFECTO, sanearHorario, type HorarioAtencion } from './horarios';

/**
 * El horario de atención vigente, el que el dueño guarda desde el POS (botón "🕒 Horario").
 * SOLO SERVIDOR: usa la llave de service_role.
 *
 * Queda en caché SIN vencimiento (revalidate: false) con la etiqueta 'horario': solo POST
 * /api/sync/horario la borra, apenas el POS guarda uno nuevo. Así las páginas fijas no se
 * rearman cada hora por esto (auditoría de costos del 28-10-2026) y el cambio igual se ve al tiro.
 * Si la fila no existe o la base falla, devuelve el de respaldo (src/lib/horarios.ts): un
 * horario viejo es mejor que una página caída.
 */
export const ETIQUETA_HORARIO = 'horario';

export const obtenerHorario = unstable_cache(
  async (): Promise<HorarioAtencion> => {
    try {
      const { data, error } = await supabaseWeb
        .from('ajustes_tienda')
        .select('valor')
        .eq('clave', 'horario')
        .maybeSingle();
      if (error) throw error;
      return sanearHorario(data?.valor) ?? HORARIO_POR_DEFECTO;
    } catch (err) {
      console.error('[horario] No se pudo leer ajustes_tienda:', err instanceof Error ? err.message : err);
      return HORARIO_POR_DEFECTO;
    }
  },
  ['horario-atencion'],
  { revalidate: false, tags: [ETIQUETA_HORARIO] }
);
