/** Versión de la Política de Privacidad vigente — se guarda junto al
 * consentimiento de cada cuenta/pedido (ver supabase/07-consentimiento-privacidad.sql)
 * para trazabilidad. Subir este número cada vez que cambie el contenido
 * real de /privacidad (no hace falta una tabla de versiones aparte). */
export const VERSION_POLITICA_PRIVACIDAD = "1.2";

/** Fecha de vigencia de la versión de arriba. La letra a) del Art. 14 ter
 * de la Ley 21.719 exige publicar "la fecha y versión" de la política, no
 * solo la versión — por eso va acá al lado y no solo en el texto. Formato
 * legible en español, se muestra tal cual en /privacidad. */
export const FECHA_POLITICA_PRIVACIDAD = "29 de agosto de 2026";
