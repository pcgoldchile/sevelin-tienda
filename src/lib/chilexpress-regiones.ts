import { REGIONES_CHILE } from './regiones-chile';

/**
 * Código de región de Chilexpress para cada una de las 16 regiones de Chile
 * (ver REGIONES_CHILE en regiones-chile.ts) — "R" + el número de región INE,
 * salvo la Metropolitana (ineRegionCode 13), que usa "RM" en vez de "R13".
 *
 * CONFIRMADO OFICIAL el 31-08-2026 contra `GET /georeference/api/v1.0/regions`
 * (developers.wschilexpress.com/api-details#api=georeference-rest-api&
 * operation=GetRegions) — ese endpoint devuelve el listado completo de las
 * 16 regiones con su `regionId` exacto, no hubo que inferirlo probando
 * comuna por comuna (como se hizo en un primer intento contra
 * coverage-areas, antes de encontrar este endpoint dedicado).
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
