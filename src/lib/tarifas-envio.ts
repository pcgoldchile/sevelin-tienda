/**
 * Tarifas de despacho a domicilio según la distancia REAL por carretera
 * desde San Rafael 896, Arica (ver src/lib/distancia.ts).
 *
 * Reemplaza la tarifa plana única de la v6: el negocio necesita que un
 * despacho a la vuelta de la esquina y uno al valle de Azapa no cuesten lo
 * mismo. Los tramos y la fórmula los definió el dueño.
 */

/** Hasta acá se considera radio urbano de Arica. */
export const LIMITE_URBANO_KM = 9.5;

/**
 * Escala urbana. `hasta` es inclusivo: el tramo siguiente parte en el
 * primer valor mayor (0–1,5 / 1,51–2,5 / …), tal como se definieron.
 * El orden importa: se recorre de menor a mayor y gana el primero que
 * cubra la distancia.
 */
export const TRAMOS_URBANOS: { hasta: number; costo: number; ejemplo?: string }[] = [
  { hasta: 1.5, costo: 2000 },
  { hasta: 2.5, costo: 2500 },
  { hasta: 4.0, costo: 3000, ejemplo: 'Diego Portales / Terminal' },
  { hasta: 5.5, costo: 3500, ejemplo: 'Saucache UTA / Agro / Centro' },
  { hasta: 7.5, costo: 4000, ejemplo: 'Sector Norte / Silva Henríquez' },
  { hasta: 9.5, costo: 4500, ejemplo: 'Las Machas / Costanera Sur' },
];

/** Base y escalón de la fórmula de valles/periferia (Azapa, Lluta, etc.). */
export const PERIFERIA_BASE = 5000;
export const PERIFERIA_ESCALON_KM = 1.5;
export const PERIFERIA_ESCALON_COSTO = 500;

export interface TarifaPorDistancia {
  costo: number;
  /** Texto corto para mostrarle al cliente por qué cuesta eso. */
  detalle: string;
  zona: 'URBANA' | 'PERIFERIA';
  km: number;
}

/**
 * Tarifa de despacho para una distancia dada.
 *
 * Urbano (≤ 9,5 km): tramo fijo de la tabla.
 * Periferia (> 9,5 km): 5000 + techo((km − 9,5) / 1,5) × 500.
 *
 * El `Math.ceil` es intencional y va sobre el excedente, no sobre el total:
 * cada 1,5 km empezados por sobre el límite urbano suman $500. A 9,6 km ya
 * corresponde el primer escalón ($5.500), porque el viaje al valle empieza
 * a costar apenas se sale del radio urbano.
 */
export function tarifaPorDistancia(km: number): TarifaPorDistancia {
  const distancia = Math.max(0, km);

  if (distancia <= LIMITE_URBANO_KM) {
    const tramo = TRAMOS_URBANOS.find((t) => distancia <= t.hasta);
    // El último tramo cubre hasta el límite urbano, así que siempre hay
    // coincidencia; el respaldo existe solo por seguridad de tipos.
    const elegido = tramo ?? TRAMOS_URBANOS[TRAMOS_URBANOS.length - 1];
    return {
      costo: elegido.costo,
      detalle: `Despacho en Arica · ${distancia.toFixed(1)} km desde la tienda`,
      zona: 'URBANA',
      km: distancia,
    };
  }

  const excedente = distancia - LIMITE_URBANO_KM;
  const escalones = Math.ceil(excedente / PERIFERIA_ESCALON_KM);
  const costo = PERIFERIA_BASE + escalones * PERIFERIA_ESCALON_COSTO;

  return {
    costo,
    detalle: `Despacho fuera del radio urbano · ${distancia.toFixed(1)} km desde la tienda`,
    zona: 'PERIFERIA',
    km: distancia,
  };
}
