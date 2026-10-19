/**
 * Listas que se guardan solo en este navegador, sin cuenta (18-10-2026):
 *   - "vistos": los últimos productos abiertos, para "Vistos recientemente" (#11).
 *   - "comparar": hasta 3 productos elegidos para compararlos (#7).
 * localStorage puede fallar (modo privado, almacenamiento lleno): todo va en
 * try/catch y, si falla, la lista simplemente queda vacía.
 */
const CLAVES = { vistos: "sevelin_vistos", comparar: "sevelin_comparar" } as const;
const TOPES = { vistos: 12, comparar: 3 } as const;
export type ListaNavegador = keyof typeof CLAVES;
export const EVENTO_LISTAS = "sevelin:listas";

export function leerLista(lista: ListaNavegador): string[] {
  try {
    const valor = JSON.parse(window.localStorage.getItem(CLAVES[lista]) || "[]");
    return Array.isArray(valor) ? valor.filter((s): s is string => typeof s === "string").slice(0, TOPES[lista]) : [];
  } catch {
    return [];
  }
}

function guardarLista(lista: ListaNavegador, skus: string[]): void {
  try {
    window.localStorage.setItem(CLAVES[lista], JSON.stringify(skus.slice(0, TOPES[lista])));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  window.dispatchEvent(new Event(EVENTO_LISTAS));
}

/** Pone el SKU primero (sin repetir). En "comparar", si ya hay 3 sale el más antiguo. */
export function agregarALista(lista: ListaNavegador, sku: string): void {
  guardarLista(lista, [sku, ...leerLista(lista).filter((s) => s !== sku)]);
}

export function quitarDeLista(lista: ListaNavegador, sku: string): void {
  guardarLista(lista, leerLista(lista).filter((s) => s !== sku));
}

export function reemplazarLista(lista: ListaNavegador, skus: string[]): void {
  guardarLista(lista, skus);
}
