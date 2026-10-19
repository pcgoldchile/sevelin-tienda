/** Por qué un producto está en Destacados (columna motivo_destacado, supabase/46). Sin
 *  dependencias: lo usan el servidor y el navegador (la vitrina del inicio). */
export type MotivoDestacado = 'VENDIDO' | 'VISTO' | 'TENDENCIA' | 'CALOR' | 'NOVEDAD' | 'OFERTA';

export const TEXTO_MOTIVO: Record<MotivoDestacado, string> = {
  VENDIDO: '⭐ Más vendido',
  VISTO: '👀 Lo más visto',
  TENDENCIA: '🔥 En tendencia',
  CALOR: '☀️ Para el calor',
  NOVEDAD: '🆕 Novedad',
  OFERTA: '🏷️ En oferta',
};
