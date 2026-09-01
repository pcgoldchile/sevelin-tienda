/**
 * Tarifas de despacho a domicilio según la distancia REAL por carretera
 * desde San Rafael 896, Arica (ver src/lib/distancia.ts).
 *
 * Reemplaza la tarifa plana única de la v6: el negocio necesita que un
 * despacho a la vuelta de la esquina y uno al valle de Azapa no cuesten lo
 * mismo. Los tramos y la fórmula los definió el dueño.
 *
 * ESCALA RECALIBRADA (31-08-2026): el dueño usó Héctor Ruiz 280 (8,4 km
 * reales por carretera desde la tienda, confirmado en Google Maps) como
 * referencia — un despacho ahí le costó $6.000 en InDrive. Con la escala
 * vieja esos 8,4 km caían en el tramo de $4.500, muy por debajo de lo que
 * cuesta en la práctica moverse esa distancia en Arica. Se subió toda la
 * escala urbana proporcionalmente (el tramo 7,51–9,5 km, donde cae ese
 * caso, quedó en $5.800) y el piso de 0–1,5 km (al lado de la tienda) se
 * mantiene en $2.000 a pedido explícito del dueño — no vale la pena cobrar
 * más por una vuelta a la manzana. La fórmula de periferia se corrió en la
 * misma proporción para no generar un salto brusco justo en el límite
 * urbano (ver PERIFERIA_BASE).
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
  { hasta: 2.5, costo: 2800 },
  { hasta: 4.0, costo: 3600, ejemplo: 'Diego Portales / Terminal' },
  { hasta: 5.5, costo: 4300, ejemplo: 'Saucache UTA / Agro / Centro' },
  { hasta: 7.5, costo: 5000, ejemplo: 'Sector Norte / Silva Henríquez' },
  { hasta: 9.5, costo: 5800, ejemplo: 'Las Machas / Costanera Sur · ej. Héctor Ruiz (8,4 km)' },
];

/** Base y escalón de la fórmula de valles/periferia (Azapa, Lluta, etc.).
 *  BASE continúa exactamente donde termina el último tramo urbano (5.800),
 *  para que no haya una caída de precio justo al cruzar los 9,5 km. */
export const PERIFERIA_BASE = 5800;
export const PERIFERIA_ESCALON_KM = 1.5;
export const PERIFERIA_ESCALON_COSTO = 650;

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
