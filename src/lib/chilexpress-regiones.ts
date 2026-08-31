import { REGIONES_CHILE } from './regiones-chile';

/**
 * Código de región de Chilexpress para cada una de las 16 regiones de Chile
 * (ver REGIONES_CHILE en regiones-chile.ts) — "R" + el número de región
 * (numeración oficial en números romanos: XV=15, I=1... XVI=16), salvo la
 * Metropolitana, que usa "RM" en vez de "R13". Confirmado contra la API
 * real de Chilexpress (georeference/api/v1.0/coverage-areas, con la
 * suscripción real del 31-08-2026): las comunas cabecera de cada región
 * (Rancagua→R6, Talca→R7, Valdivia→R14, Coyhaique→R11, Punta Arenas→R12,
 * Arica→R15, Chillán→R16, Temuco→R9, Puerto Montt→R10, Iquique→R1,
 * Calama→R2, Copiapó→R3, La Serena→R4, Valparaíso→R5, Santiago→RM)
 * devolvieron exactamente estos códigos — no está documentado en ninguna
 * parte pública, developers.wschilexpress.com no expone esto (ver el aviso
 * al inicio de chilexpress.ts).
 */
export const CODIGO_REGION_CHILEXPRESS: Record<(typeof REGIONES_CHILE)[number], string> = {
  'Arica y Parinacota': 'R15',
  'Tarapacá': 'R1',
  'Antofagasta': 'R2',
  'Atacama': 'R3',
  'Coquimbo': 'R4',
  'Valparaíso': 'R5',
  'Metropolitana de Santiago': 'RM',
  "Libertador General Bernardo O'Higgins": 'R6',
  'Maule': 'R7',
  'Ñuble': 'R16',
  'Biobío': 'R8',
  'La Araucanía': 'R9',
  'Los Ríos': 'R14',
  'Los Lagos': 'R10',
  'Aysén del General Carlos Ibáñez del Campo': 'R11',
  'Magallanes y de la Antártica Chilena': 'R12',
};
