import type { ProductoWeb } from "./tipos";

/**
 * Panel "Filtrar" de /productos (dueño, 18-10-2026: "falta un tipo filtro aquí,
 * por ejemplo marcar la casilla si incluye HDMI, VGA, parlantes").
 *
 * De dónde sale cada filtro:
 *   - Las casillas de cada categoría (entradas, tamaño, conectores…): las marca
 *     el dueño en la ficha del POS y llegan en productos_web.caracteristicas
 *     (supabase/44). Nunca se adivinan leyendo la descripción: en la prueba eso
 *     dejó un monitor con HDMI como si no lo tuviera y otro sin HDMI como si sí.
 *   - Marca, precio y estado: de columnas que ya existían (marca, precio_web,
 *     condicion).
 *
 * Cómo se combinan: entre grupos distintos, el producto tiene que cumplir todos.
 * Dentro de un grupo depende de `multiple`:
 *   - multiple (puertos, extras): un producto tiene varios, así que marcar HDMI y
 *     VGA pide los dos.
 *   - de uno solo (tamaño, capacidad, precio): marcar dos muestra cualquiera de
 *     los dos.
 * El número junto a cada opción es cuántos productos quedarían al marcarla.
 */

export interface GrupoEsquema {
  id: string;
  nombre: string;
  multiple: boolean;
  valores: string[];
}

interface EntradaEsquema {
  categoria: string;
  subcategoria: string | null;
  grupos: GrupoEsquema[];
}

/* PAREJA EXACTA de CARACTERISTICAS_TIENDA en sevelin-pos-oficial/api/index.js
   (sin las pistas para la IA). Si se cambia algo allá, se cambia acá igual. Un
   valor que llegue y no esté acá igual se muestra, al final de su grupo. */
export const GRUPOS_FILTRO: EntradaEsquema[] = [
  { categoria: "Monitores", subcategoria: null, grupos: [
    { id: "entradas", nombre: "Entradas de video", multiple: true, valores: ["HDMI", "VGA", "DisplayPort", "DVI", "USB-C"] },
    { id: "extras", nombre: "Extras", multiple: true, valores: ["Parlantes incluidos", "Trae cable HDMI", "VESA (se cuelga en la pared)"] },
    { id: "tamano", nombre: "Tamaño", multiple: false, valores: ['Hasta 20"', '21" a 22"', '23" a 25"', '27" o más'] },
    { id: "resolucion", nombre: "Resolución", multiple: false, valores: ["Menor a Full HD", "Full HD (1920×1080)", "2K o más"] },
    { id: "hz", nombre: "Velocidad", multiple: false, valores: ["60 a 75 Hz", "100 a 144 Hz", "165 Hz o más"] },
    { id: "uso", nombre: "Uso", multiple: false, valores: ["Oficina y hogar", "Gamer"] },
  ] },
  { categoria: "Componentes PC", subcategoria: "Tarjetas de Video", grupos: [
    { id: "chip", nombre: "Chip", multiple: false, valores: ["NVIDIA", "AMD", "Intel"] },
    { id: "memoria_video", nombre: "Memoria de video", multiple: false, valores: ["Hasta 4 GB", "6 GB", "8 GB", "12 GB", "16 GB o más"] },
    { id: "salidas", nombre: "Salidas de video", multiple: true, valores: ["HDMI", "DisplayPort", "DVI", "VGA"] },
    { id: "extras", nombre: "Extras", multiple: true, valores: ["Perfil bajo (low profile)"] },
  ] },
  { categoria: "Componentes PC", subcategoria: "Fuentes de poder", grupos: [
    { id: "potencia", nombre: "Potencia", multiple: false, valores: ["Hasta 500 W", "550 a 650 W", "700 W o más"] },
    { id: "certificacion", nombre: "Certificación", multiple: false, valores: ["80 Plus", "80 Plus Bronze", "80 Plus Gold o superior"] },
  ] },
  { categoria: "Componentes PC", subcategoria: "Memorias RAM", grupos: [
    { id: "tipo_memoria", nombre: "Tipo", multiple: false, valores: ["DDR3", "DDR4", "DDR5"] },
    { id: "formato_ram", nombre: "Para", multiple: false, valores: ["PC de escritorio (DIMM)", "Notebook (SO-DIMM)"] },
    { id: "capacidad_ram", nombre: "Capacidad", multiple: false, valores: ["4 GB", "8 GB", "16 GB", "32 GB o más"] },
  ] },
  { categoria: "Componentes PC", subcategoria: "Placas Madre", grupos: [
    { id: "plataforma", nombre: "Procesador", multiple: false, valores: ["Intel", "AMD"] },
    { id: "tipo_memoria", nombre: "Memoria", multiple: true, valores: ["DDR3", "DDR4", "DDR5"] },
    { id: "formato_placa", nombre: "Formato", multiple: false, valores: ["ATX", "Micro ATX", "Mini ITX"] },
  ] },
  { categoria: "Componentes PC", subcategoria: "Gabinetes", grupos: [
    { id: "formato_placa", nombre: "Placa que recibe", multiple: true, valores: ["ATX", "Micro ATX", "Mini ITX"] },
    { id: "extras", nombre: "Extras", multiple: true, valores: ["Vidrio templado", "Ventiladores incluidos", "Iluminación RGB"] },
  ] },
  { categoria: "Componentes PC", subcategoria: "Coolers y Disipadores", grupos: [
    { id: "tipo_cooler", nombre: "Tipo", multiple: false, valores: ["Disipador de procesador", "Refrigeración líquida", "Ventilador de gabinete", "Pasta o masilla térmica"] },
    { id: "compatible", nombre: "Compatible con", multiple: true, valores: ["Intel", "AMD"] },
    { id: "extras", nombre: "Extras", multiple: true, valores: ["Iluminación RGB"] },
  ] },
  { categoria: "Cables y Adaptadores", subcategoria: null, grupos: [
    { id: "conectores", nombre: "Conectores", multiple: true,
      valores: ["HDMI", "VGA", "DisplayPort", "DVI", "USB-C", "USB-A", "Micro USB", "Lightning", "Red (RJ45)", "Fibra óptica", "Audio 3,5 mm", "SATA", "Enchufe de poder"] },
    { id: "largo", nombre: "Largo", multiple: false, valores: ["Menos de 1 m", "1 a 2 m", "3 a 5 m", "Más de 5 m"] },
    { id: "funciones", nombre: "Funciones", multiple: true, valores: ["Soporta 4K", "Carga rápida", "WiFi", "Bluetooth"] },
  ] },
  { categoria: "Cargadores", subcategoria: null, grupos: [
    { id: "conector", nombre: "Conector", multiple: true, valores: ["USB-C", "Lightning", "Micro USB", "USB-A", "Para notebook"] },
    { id: "potencia", nombre: "Potencia", multiple: false, valores: ["Hasta 20 W", "25 a 45 W", "65 W o más"] },
    { id: "extras", nombre: "Extras", multiple: true, valores: ["Carga rápida", "Incluye cable"] },
  ] },
  { categoria: "Energía Portátil", subcategoria: null, grupos: [
    { id: "capacidad_bateria", nombre: "Capacidad", multiple: false, valores: ["Hasta 5.000 mAh", "10.000 mAh", "20.000 mAh o más"] },
    { id: "puertos", nombre: "Puertos", multiple: true, valores: ["USB-C", "USB-A", "Micro USB", "Lightning"] },
    { id: "extras", nombre: "Extras", multiple: true,
      valores: ["Carga rápida", "MagSafe (se pega al iPhone)", "Pantalla de batería", "Cable incluido o integrado", "Sirve para notebook"] },
  ] },
  { categoria: "Energía Portátil", subcategoria: "Pilas y Energía Solar", grupos: [
    { id: "tipo_pila", nombre: "Tipo", multiple: false, valores: ["AA", "AAA", "9V", "Botón (CR2032 y similares)", "Kit solar"] },
  ] },
  { categoria: "Almacenamiento", subcategoria: null, grupos: [
    { id: "capacidad", nombre: "Capacidad", multiple: false, valores: ["32 GB o menos", "64 GB", "128 GB", "256 GB", "480 a 512 GB", "960 GB a 1 TB", "2 TB o más"] },
    { id: "conexion", nombre: "Conexión", multiple: true, valores: ["USB-A", "USB-C", 'SATA 2,5"', "M.2 NVMe", "M.2 SATA", "microSD"] },
  ] },
  { categoria: "Periféricos", subcategoria: null, grupos: [
    { id: "conexion", nombre: "Conexión", multiple: true, valores: ["Inalámbrico con receptor USB", "Bluetooth", "Con cable USB"] },
    { id: "extras", nombre: "Extras", multiple: true, valores: ["Gamer", "Iluminación RGB", "Recargable", "Silencioso"] },
  ] },
  { categoria: "Periféricos", subcategoria: "Mandos y Joystick", grupos: [
    { id: "compatible", nombre: "Compatible con", multiple: true, valores: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Celular"] },
  ] },
  { categoria: "Audio", subcategoria: null, grupos: [
    { id: "conexion", nombre: "Conexión", multiple: true, valores: ["Bluetooth", "Cable 3,5 mm", "USB"] },
    { id: "extras", nombre: "Extras", multiple: true,
      valores: ["Micrófono incluido", "Cancelación de ruido", "Iluminación RGB", "Radio FM", "Batería recargable", "Gamer"] },
  ] },
  { categoria: "Computadores", subcategoria: null, grupos: [
    { id: "tipo_equipo", nombre: "Tipo", multiple: false, valores: ["PC de escritorio", "Notebook", "All in one"] },
    { id: "procesador", nombre: "Procesador", multiple: false, valores: ["Intel Core i3", "Intel Core i5", "Intel Core i7", "AMD Ryzen"] },
    { id: "ram", nombre: "Memoria RAM", multiple: false, valores: ["4 GB", "8 GB", "16 GB o más"] },
    { id: "disco", nombre: "Disco", multiple: true, valores: ["SSD", "Disco duro (HDD)"] },
  ] },
];

/** Donde las subcategorías ya ordenan bien y un panel solo estorba. */
const CATEGORIAS_SIN_FILTROS = new Set(["Servicios Técnicos", "Hogar y Estilo de Vida"]);

/* Los tres que salen de columnas que ya existían. Van al final del panel. */
const TRAMOS_PRECIO: { etiqueta: string; hasta: number }[] = [
  { etiqueta: "Hasta $10.000", hasta: 10000 },
  { etiqueta: "$10.000 a $30.000", hasta: 30000 },
  { etiqueta: "$30.000 a $60.000", hasta: 60000 },
  { etiqueta: "$60.000 a $120.000", hasta: 120000 },
  { etiqueta: "Más de $120.000", hasta: Infinity },
];
const GRUPO_MARCA: GrupoEsquema = { id: "marca", nombre: "Marca", multiple: false, valores: [] };
const GRUPO_PRECIO: GrupoEsquema = { id: "precio", nombre: "Precio", multiple: false, valores: TRAMOS_PRECIO.map((t) => t.etiqueta) };
const GRUPO_ESTADO: GrupoEsquema = { id: "estado", nombre: "Estado", multiple: false, valores: ["Nuevo", "Reacondicionado"] };

/** Prefijo de los parámetros del enlace: ?categoria=Monitores&f_entradas=HDMI&f_entradas=VGA */
export const PREFIJO_FILTRO = "f_";

export interface OpcionFiltro {
  valor: string;
  cantidad: number;
  marcada: boolean;
}

export interface GrupoFiltro {
  id: string;
  nombre: string;
  multiple: boolean;
  opciones: OpcionFiltro[];
}

export interface FiltroActivo {
  grupo: string;
  nombreGrupo: string;
  valor: string;
}

export type SeleccionFiltros = Record<string, string[]>;

/** Los grupos de una categoría: los suyos y, encima, los de la subcategoría (misma regla que el POS). */
export function gruposDeCategoria(categoria?: string, subcategoria?: string): GrupoEsquema[] {
  if (!categoria) return [];
  const porId = new Map<string, GrupoEsquema>();
  for (const e of GRUPOS_FILTRO) {
    if (e.categoria !== categoria) continue;
    if (e.subcategoria && e.subcategoria !== subcategoria) continue;
    for (const g of e.grupos) {
      if (!e.subcategoria && porId.has(g.id)) continue;
      porId.set(g.id, g);
    }
  }
  return [...porId.values()];
}

export function categoriaTieneFiltros(categoria?: string): boolean {
  return !!categoria && !CATEGORIAS_SIN_FILTROS.has(categoria);
}

/** Lo marcado, sacado de los parámetros del enlace. Nunca confía en el largo ni en la cantidad. */
export function leerSeleccion(params: Record<string, string | string[] | undefined>): SeleccionFiltros {
  const seleccion: SeleccionFiltros = {};
  for (const [clave, valor] of Object.entries(params)) {
    if (!clave.startsWith(PREFIJO_FILTRO)) continue;
    const grupo = clave.slice(PREFIJO_FILTRO.length);
    if (!/^[a-z0-9_]{1,40}$/.test(grupo)) continue;
    const lista = (Array.isArray(valor) ? valor : [valor])
      .filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 60);
    const unicos = [...new Set(lista)].slice(0, 20);
    if (unicos.length) seleccion[grupo] = unicos;
  }
  return seleccion;
}

function tramoDePrecio(precio: number): string {
  return (TRAMOS_PRECIO.find((t) => precio <= t.hasta) ?? TRAMOS_PRECIO[TRAMOS_PRECIO.length - 1]).etiqueta;
}

function valoresDelProducto(p: ProductoWeb, grupos: GrupoEsquema[]): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  const caracteristicas = p.caracteristicas && typeof p.caracteristicas === "object" ? p.caracteristicas : {};
  for (const g of grupos) {
    const lista = (caracteristicas as Record<string, unknown>)[g.id];
    if (Array.isArray(lista)) mapa.set(g.id, lista.filter((v): v is string => typeof v === "string"));
  }
  if (p.marca && p.marca.trim() && p.marca.trim().toLowerCase() !== "genérica") mapa.set("marca", [p.marca.trim()]);
  if (Number.isFinite(p.precio_web) && !p.precio_a_consultar) mapa.set("precio", [tramoDePrecio(p.precio_web)]);
  if (p.condicion === "nuevo") mapa.set("estado", ["Nuevo"]);
  if (p.condicion === "reacondicionado") mapa.set("estado", ["Reacondicionado"]);
  return mapa;
}

function cumpleGrupo(tiene: string[] | undefined, marcados: string[], multiple: boolean): boolean {
  const lista = tiene ?? [];
  return multiple ? marcados.every((v) => lista.includes(v)) : marcados.some((v) => lista.includes(v));
}

/**
 * Filtra los productos ya cargados de una categoría y arma el panel. Se hace en
 * memoria: una categoría tiene a lo más unas decenas de productos.
 */
export function aplicarFiltros(
  productos: ProductoWeb[],
  categoria: string | undefined,
  subcategoria: string | undefined,
  seleccionPedida: SeleccionFiltros
): { productos: ProductoWeb[]; grupos: GrupoFiltro[]; activos: FiltroActivo[]; seleccion: SeleccionFiltros } {
  if (!categoriaTieneFiltros(categoria)) return { productos, grupos: [], activos: [], seleccion: {} };

  const esquema = [...gruposDeCategoria(categoria, subcategoria), GRUPO_MARCA, GRUPO_PRECIO, GRUPO_ESTADO];
  // Lo que pida el enlace para un grupo que esta categoría no tiene se ignora.
  const seleccion: SeleccionFiltros = {};
  for (const g of esquema) if (seleccionPedida[g.id]?.length) seleccion[g.id] = seleccionPedida[g.id];

  const valores = productos.map((p) => valoresDelProducto(p, esquema));
  const cumpleTodo = (i: number, salvo?: string) =>
    esquema.every((g) => g.id === salvo || !seleccion[g.id] || cumpleGrupo(valores[i].get(g.id), seleccion[g.id], g.multiple));

  const filtrados = productos.filter((_, i) => cumpleTodo(i));

  const grupos: GrupoFiltro[] = [];
  for (const g of esquema) {
    const marcados = seleccion[g.id] ?? [];
    // Todos los valores que existen en la categoría (sin filtrar), más los marcados.
    const presentes = new Set<string>(marcados);
    let conValor = 0;
    for (const v of valores) {
      const lista = v.get(g.id);
      if (lista?.length) { conValor++; lista.forEach((x) => presentes.add(x)); }
    }
    if (presentes.size === 0) continue;
    // Un grupo que no distingue nada (todos tienen lo mismo) no sirve, salvo que esté marcado.
    if (!marcados.length && presentes.size === 1 && conValor === productos.length) continue;

    const ordenEsquema = g.id === "marca"
      ? [...presentes].sort((a, b) => a.localeCompare(b, "es"))
      : [...g.valores.filter((v) => presentes.has(v)), ...[...presentes].filter((v) => !g.valores.includes(v)).sort((a, b) => a.localeCompare(b, "es"))];

    // Base del conteo: en "uno solo", sin este grupo (marcar otro suma); en "varios", con todo.
    const base = productos.map((_, i) => i).filter((i) => cumpleTodo(i, g.multiple ? undefined : g.id));
    grupos.push({
      id: g.id,
      nombre: g.nombre,
      multiple: g.multiple,
      opciones: ordenEsquema.map((valor) => ({
        valor,
        marcada: marcados.includes(valor),
        cantidad: base.filter((i) => (valores[i].get(g.id) ?? []).includes(valor)).length,
      })),
    });
  }

  const activos: FiltroActivo[] = esquema.flatMap((g) =>
    (seleccion[g.id] ?? []).map((valor) => ({ grupo: g.id, nombreGrupo: g.nombre, valor }))
  );
  return { productos: filtrados, grupos, activos, seleccion };
}

/** Enlace a /productos con la selección dada (mantiene categoría, subcategoría, búsqueda y orden). */
export function enlaceConFiltros(
  base: { categoria?: string; subcategoria?: string; q?: string; orden?: string },
  seleccion: SeleccionFiltros
): string {
  const params = new URLSearchParams();
  if (base.categoria) params.set("categoria", base.categoria);
  if (base.subcategoria) params.set("subcategoria", base.subcategoria);
  if (base.q) params.set("q", base.q);
  if (base.orden && base.orden !== "relevancia") params.set("orden", base.orden);
  for (const [grupo, lista] of Object.entries(seleccion)) for (const v of lista) params.append(PREFIJO_FILTRO + grupo, v);
  const query = params.toString();
  return query ? `/productos?${query}` : "/productos";
}

/** La selección con un valor puesto o sacado. */
export function alternarFiltro(seleccion: SeleccionFiltros, grupo: string, valor: string): SeleccionFiltros {
  const actual = seleccion[grupo] ?? [];
  const siguiente = actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor];
  const copia = { ...seleccion };
  if (siguiente.length) copia[grupo] = siguiente; else delete copia[grupo];
  return copia;
}
