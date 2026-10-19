import type { ProductoWeb } from "./tipos";

/**
 * Buscador que perdona (dueño, 18-10-2026). Medido antes de hacerlo: de 185
 * búsquedas, 59 no encontraban nada, y muchas veces el producto sí estaba:
 *   "pasta termica"   → "Pasta Térmica"           (tildes)
 *   "teclados"        → "Teclado"                 (plural)
 *   "pendrive 128gb"  → "Pendrive Kingston … 128GB" (palabras en otro orden)
 *   "funte de poder"  → "Fuente de poder"         (error de tipeo)
 *   "cable iphone"    → "Cable … Lightning"       (otra palabra para lo mismo)
 *
 * Cómo funciona: el texto se pasa a minúsculas sin tildes ni signos, se parte
 * en palabras (y "128gb" en "128" + "gb"), se le quitan las palabras de relleno
 * ("de", "para"…) y cada palabra tiene que aparecer en el producto: en el
 * nombre, la marca, la categoría o sus casillas de filtros. Una palabra
 * "aparece" si está igual, en singular, como sinónimo o con un error de tipeo
 * chico. Se ordena por cuánto calza con el NOMBRE.
 *
 * Se hace en memoria: el catálogo publicado son unos cientos de productos.
 */

/* Otra palabra para lo mismo. Clave = lo que escribe el cliente (ya sin tildes,
   en singular); valor = palabras que pueden estar en el producto. Para sumar
   uno nuevo, se agrega acá (lo que pide la gente en el mostrador, por ejemplo). */
export const SINONIMOS: Record<string, string[]> = {
  iphone: ["lightning", "magsafe"],
  ipad: ["lightning", "tablet"],
  aro: ["anillo"],
  ethernet: ["red", "rj45", "utp", "lan"],
  internet: ["red", "rj45", "utp", "wifi"],
  lan: ["red", "rj45", "utp"],
  wifi: ["wi-fi", "inalambrico"],
  externo: ["cofre", "carcasa", "usb"],
  externa: ["cofre", "carcasa", "usb"],
  disco: ["ssd", "hdd", "cofre"],
  duro: ["hdd", "ssd"],
  dura: ["duro", "hdd"],
  memoria: ["ram", "pendrive", "microsd", "tarjeta"],
  usb: ["pendrive"],
  micro: ["microsd"],
  sd: ["microsd", "tarjeta"],
  bateria: ["power", "bank", "pila"],
  powerbank: ["power", "bank"],
  cargador: ["power", "bank", "cargador"],
  joystick: ["mando", "control"],
  control: ["mando", "joystick"],
  mando: ["joystick", "control"],
  ps4: ["playstation", "ps4"],
  ps3: ["playstation", "ps3"],
  play: ["playstation"],
  audifono: ["audifono", "auricular", "headset"],
  auricular: ["audifono"],
  parlante: ["parlante", "altavoz", "bocina", "sonido"],
  bocina: ["parlante"],
  pantalla: ["monitor"],
  tele: ["tv", "televisor"],
  television: ["tv"],
  computador: ["pc", "computador"],
  computadora: ["pc", "computador"],
  pc: ["computador", "pc"],
  notebook: ["notebook", "laptop", "portatil"],
  laptop: ["notebook"],
  camara: ["camara", "webcam"],
  webcam: ["camara"],
  fuente: ["fuente", "poder"],
  ventilador: ["ventilador", "fan", "cooler"],
  cooler: ["cooler", "disipador", "ventilador"],
  disipador: ["cooler", "disipador"],
  grafica: ["video"],
  tarjeta: ["tarjeta"],
  teclado: ["teclado", "combo", "kit"],
  raton: ["mouse"],
  adaptador: ["adaptador", "convertidor", "hub"],
  convertidor: ["adaptador"],
  aire: ["soplador", "aire"],
  limpiador: ["limpia", "soplador"],
  luz: ["led", "luz", "ampolleta"],
  ampolleta: ["led", "ampolleta"],
};

/* Palabras que no dicen qué producto es: si se exigieran, "fuente de poder"
   pediría un "de" en el producto. */
const RELLENO = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "para", "con", "sin", "y", "o", "a", "en", "por", "mi", "tu", "que",
]);

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

/** La palabra y sus singulares posibles: "adaptadores" → adaptadore, adaptador;
 *  "fuentes" → fuente; "teclados" → teclado. Sobran formas raras, pero da igual:
 *  solo se usan para comparar. */
export function formas(palabra: string): string[] {
  const lista = [palabra];
  if (palabra.length > 3 && palabra.endsWith("s")) lista.push(palabra.slice(0, -1));
  if (palabra.length > 4 && palabra.endsWith("es")) lista.push(palabra.slice(0, -2));
  return lista;
}

export function palabrasDe(texto: string): string[] {
  return normalizar(texto).split(" ").filter((p) => p && !RELLENO.has(p));
}

/* Distancia de edición con tope: corta apenas pasa el máximo. */
function distancia(a: string, b: string, maximo: number): number {
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + costo);
      if (actual[j] < menor) menor = actual[j];
    }
    if (menor > maximo) return maximo + 1;
    previa = actual;
  }
  return previa[b.length];
}

/** Cuántas letras de error se aceptan: ninguna en palabras cortas (o "hp" sería "hd"). */
function errorPermitido(palabra: string): number {
  if (/^[0-9]+$/.test(palabra)) return 0;
  if (palabra.length >= 8) return 2;
  if (palabra.length >= 5) return 1;
  return 0;
}

/** 0 = no calza; 3 = igual; 2 = singular/sinónimo/empieza igual; 1 = con error de tipeo. */
function calce(buscada: string, delProducto: string[]): number {
  const propias = formas(buscada);
  const sinonimos = new Set(propias.flatMap((f) => SINONIMOS[f] ?? []));
  const base = propias[propias.length - 1];
  const tope = errorPermitido(buscada);
  let mejor = 0;
  for (const palabra of delProducto) {
    const suyas = formas(palabra);
    if (suyas.some((f) => propias.includes(f))) return 3;
    if (suyas.some((f) => sinonimos.has(f))) { mejor = Math.max(mejor, 2); continue; }
    // "pend" → "pendrive": solo como comienzo y desde 3 letras (para las sugerencias al escribir)
    if (buscada.length >= 3 && !/^[0-9]+$/.test(buscada) && palabra.startsWith(buscada)) { mejor = Math.max(mejor, 2); continue; }
    if (tope && suyas.some((f) => distancia(base, f, tope) <= tope)) mejor = Math.max(mejor, 1);
  }
  return mejor;
}

function textoDeProducto(p: ProductoWeb): { nombre: string[]; resto: string[] } {
  const casillas = p.caracteristicas && typeof p.caracteristicas === "object"
    ? Object.values(p.caracteristicas).flat().filter((v): v is string => typeof v === "string")
    : [];
  return {
    nombre: palabrasDe(p.nombre),
    resto: palabrasDe([p.marca, p.categoria, p.subcategoria, ...casillas].filter(Boolean).join(" ")),
  };
}

/* Unidades: "240gb" se parte en "240" + "gb", y que un producto diga "GB" no lo hace parecido. */
const UNIDADES = new Set(["gb", "tb", "mb", "w", "v", "mah", "m", "mm", "cm", "hz", "a", "k", "mhz", "ghz", "pulgada"]);

interface Puntuado<T> { p: T; puntos: number; calzan: number; utiles: number }

function puntuar<T extends ProductoWeb>(productos: T[], texto: string): { buscadas: string[]; lista: Puntuado<T>[] } {
  const buscadas = palabrasDe(texto).slice(0, 8);
  const frase = buscadas.join(" ");
  const sku = normalizar(texto).replace(/ /g, "");
  const lista: Puntuado<T>[] = [];
  if (buscadas.length === 0) return { buscadas, lista };
  for (const p of productos) {
    const { nombre, resto } = textoDeProducto(p);
    let puntos = 0;
    let calzan = 0;
    let utiles = 0;
    for (const b of buscadas) {
      const enNombre = calce(b, nombre);
      const enResto = enNombre ? 0 : calce(b, resto);
      if (enNombre || enResto) { calzan++; if (!UNIDADES.has(b)) utiles++; }
      puntos += enNombre ? enNombre * 2 : enResto;
    }
    // La frase entera tal cual en el nombre ("pasta termica" en "Pasta Térmica Kronos") va primero
    if (buscadas.length > 1 && nombre.join(" ").includes(frase)) puntos += 4;
    // El SKU tal cual (a veces lo pegan) sigue funcionando
    if (sku.length >= 4 && (p.sku || "").replace(/-/g, "").includes(sku)) { calzan = buscadas.length; utiles = calzan; puntos = Math.max(puntos, 1); }
    if (calzan) lista.push({ p, puntos, calzan, utiles });
  }
  return { buscadas, lista };
}

/* A igual puntaje: primero lo que se lleva (no un servicio) y lo que tiene stock. */
function ordenar<T extends ProductoWeb>(lista: Puntuado<T>[]): T[] {
  const peso = (p: ProductoWeb) => (p.categoria === "Servicios Técnicos" ? 1 : 0) + (p.stock_web > 0 || p.es_pedido_encargo ? 0 : 2);
  return lista
    .sort((a, b) => b.puntos - a.puntos || peso(a.p) - peso(b.p) || a.p.nombre.length - b.p.nombre.length)
    .map((x) => x.p);
}

/**
 * Productos que calzan con el texto, del que más calza al que menos. Cada
 * palabra buscada tiene que estar (en el nombre o en el resto); si ninguna
 * palabra útil queda (ej. "de la"), no devuelve nada.
 */
export function buscarEnProductos<T extends ProductoWeb>(productos: T[], texto: string): T[] {
  const { buscadas, lista } = puntuar(productos, texto);
  return ordenar(lista.filter((x) => x.calzan === buscadas.length));
}

/**
 * Como buscarEnProductos, pero si nada calza entero y se buscaron 2 o más
 * palabras, devuelve los que calzan con al menos la mitad, marcados como
 * "parecidos" ("crucial ram ddr4 64gb sodimm" → las memorias RAM que hay).
 */
export function buscarConParecidos<T extends ProductoWeb>(productos: T[], texto: string): { productos: T[]; parecidos: boolean } {
  const { buscadas, lista } = puntuar(productos, texto);
  const enteros = lista.filter((x) => x.calzan === buscadas.length);
  if (enteros.length || buscadas.length < 2) return { productos: ordenar(enteros), parecidos: false };
  const minimo = Math.ceil(buscadas.length / 2);
  const candidatos = lista.filter((x) => x.utiles > 0);
  const mejor = Math.max(0, ...candidatos.map((x) => x.calzan));
  if (mejor < minimo) return { productos: [], parecidos: false };
  return { productos: ordenar(candidatos.filter((x) => x.calzan === mejor)).slice(0, 24), parecidos: true };
}
