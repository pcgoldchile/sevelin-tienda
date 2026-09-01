/**
 * Distancia real por carretera desde la tienda, con LocationIQ.
 *
 *   1. Search API (geocoding) convierte la dirección escrita en
 *      coordenadas.
 *   2. Directions API calcula la ruta manejando entre la tienda y esas
 *      coordenadas.
 *
 * POR QUÉ RUTA Y NO LÍNEA RECTA
 * La Fase 4 usaba Haversine (línea recta). En Arica eso subestima: el río,
 * la línea férrea y el cerro obligan rodeos que la recta ignora, así que un
 * domicilio "a 4 km" podía estar a 6,5 km de manejo real y quedaba cobrado
 * en el tramo equivocado. Por eso ahora manda la distancia de ruta.
 *
 * POR QUÉ LOCATIONIQ Y NO NOMINATIM/OSRM DIRECTO (versión original)
 * Nominatim resolvía mal direcciones reales de Arica. Caso real
 * (31-08-2026): "Linderos 3736, Arica" (el dueño dice que queda a pocas
 * cuadras de la tienda) geocodificaba a ~36 km de distancia. La causa NO
 * era un homónimo en otra región: "Linderos" también es el nombre de una
 * localidad rural real DENTRO de la propia comuna de Arica, y el texto
 * libre ("Linderos 3736, Arica, Chile") calzaba con esa localidad en vez
 * de con la calle real "Avenida Linderos" que sí existe en Arica urbana —
 * un `viewbox` no alcanza para distinguirlas porque las dos caen dentro
 * de la misma comuna. El fix real fue separar la consulta en campos
 * estructurados (`street`/`city`, ver `geocodificar()` más abajo): eso le
 * dice al buscador "esto es una calle", y ya no compite contra el nombre
 * de una localidad. LocationIQ agrega además `viewbox` + `bounded=1`
 * (ver `CAJA_ARICA_GRADOS`), que sigue sumando como red de seguridad
 * contra cualquier otro homónimo fuera de la región. (31-08-2026, primer
 * intento: se probó Google Geocoding + Distance Matrix, pero se descartó
 * a pedido del dueño por la fricción de configurar facturación/
 * restricciones en Google Cloud — LocationIQ no lo exige.)
 *
 * LÍMITE: un solo `LOCATIONIQ_API_KEY` para ambas llamadas (geocoding y
 * ruta) — a diferencia de Google, que exige una key por API. Plan gratuito
 * de LocationIQ: 5.000 peticiones/día, de sobra para una tienda chica.
 *
 * Se cachea en memoria por dirección normalizada: el checkout cotiza varias
 * veces mientras el cliente edita el formulario, y sin caché cada tecla
 * podría gatillar una petición nueva por nada.
 */

/**
 * San Rafael 896, Arica — origen de todos los despachos.
 *
 * NO se codifican coordenadas a mano. Se resuelven geocodificando la
 * propia dirección de la tienda con el MISMO servicio que las
 * direcciones de destino, y se puede fijar por entorno
 * (TIENDA_LAT / TIENDA_LON) cuando se tenga el punto exacto.
 *
 * Por qué: un origen equivocado corre TODAS las tarifas a la vez, y es un
 * error invisible (los números salen plausibles, solo que mal). Pasó en el
 * primer borrador de este archivo: las coordenadas escritas de memoria
 * quedaron a 4,7 km de la dirección real, o sea dos tramos de diferencia
 * en cada despacho. Resolver origen y destino con el mismo geocodificador
 * también evita que un sesgo del servicio afecte solo a un extremo.
 */
export const DIRECCION_TIENDA = 'San Rafael 896, Arica';

/**
 * Coordenadas confirmadas por el dueño (30-08-2026). NO se geocodifican:
 * al resolver "San Rafael 896, Arica", Nominatim devolvía un punto ~4 km
 * al norte del local, y como el origen corre todas las tarifas a la vez,
 * el error era invisible (los precios salían plausibles, solo que mal).
 * Se pueden sobreescribir por entorno si el local se muda.
 */
const TIENDA_LAT_POR_DEFECTO = -18.4619;
const TIENDA_LON_POR_DEFECTO = -70.2976;

let origenCacheado: { lat: number; lon: number } | null = null;

export function origenTienda(): { lat: number; lon: number } {
  if (origenCacheado) return origenCacheado;

  const lat = Number(process.env.TIENDA_LAT);
  const lon = Number(process.env.TIENDA_LON);
  origenCacheado =
    Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0
      ? { lat, lon }
      : { lat: TIENDA_LAT_POR_DEFECTO, lon: TIENDA_LON_POR_DEFECTO };

  return origenCacheado;
}

/**
 * Valles rurales: la numeración es un marcador de kilómetro, no una
 * dirección, así que el geocodificador no sirve (ancla el punto al inicio
 * del camino y cobraría tarifa urbana mínima). En vez de geocodificar, el
 * cliente declara el kilómetro en el checkout y se suma a la distancia
 * hasta la entrada del valle. Las bases las midió el dueño.
 */
export const VALLES = {
  AZAPA: { etiqueta: 'Valle de Azapa', baseKm: 4.5, referencia: 'Rotonda Azapeños / Diego Portales' },
  LLUTA: { etiqueta: 'Valle de Lluta', baseKm: 5.0, referencia: 'Rotonda Lluta / Panamericana Norte' },
} as const;

export type ClaveValle = keyof typeof VALLES;

export function esValleValido(valor: unknown): valor is ClaveValle {
  return typeof valor === 'string' && valor in VALLES;
}

/** Distancia total para una dirección de valle: entrada del valle + km declarado. */
export function distanciaValle(valle: ClaveValle, km: number): ResultadoDistancia {
  const kmDeclarado = Math.max(0, Number(km) || 0);
  return {
    km: VALLES[valle].baseKm + kmDeclarado,
    estimada: false,
    origen: 'valle-declarado',
    coordenadas: origenTienda(),
  };
}

const LOCATIONIQ_BASE = 'https://us1.locationiq.com/v1';

const TIMEOUT_MS = 7000;

/**
 * Medio grado (~55 km) alrededor de la tienda, en cada dirección. Cubre
 * Arica urbana + Azapa/Lluta + un margen amplio, y descarta de raíz
 * cualquier homónimo lejano (el caso real: "Linderos" también es una
 * localidad de Buin, Región Metropolitana). Con `bounded=1` esto es un
 * límite DURO (no un sesgo): si no hay nada dentro de la caja, la
 * geocodificación no devuelve nada — mejor "no se pudo ubicar" (ver
 * distanciaDesdeTienda) que inventar un domicilio a miles de km.
 */
const CAJA_ARICA_GRADOS = 0.6;

export interface ResultadoDistancia {
  km: number;
  /** true si NO se pudo rutear y el número viene de una estimación. */
  estimada: boolean;
  /** Qué se logró resolver — sirve para explicar la tarifa y para depurar. */
  origen: 'ruta' | 'estimacion-linea-recta' | 'valle-declarado';
  coordenadas: { lat: number; lon: number };
}

const cacheDistancia = new Map<string, ResultadoDistancia | null>();

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** fetch con corte por tiempo: si LocationIQ se cuelga, el checkout no
 *  puede quedarse esperando indefinidamente. */
async function fetchConTimeout(url: string, init?: RequestInit): Promise<Response> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: control.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

/** Una búsqueda concreta contra LocationIQ Search — devuelve el primer
 *  resultado, o null si no hay nada o falla la petición. Sin reintento a
 *  propósito (a diferencia de distanciaRutaKm): un fallo acá solo hace
 *  que falte la opción de despacho local esta vez — nunca cachea un
 *  número equivocado — así que no vale la pena alargar el checkout con
 *  otro intento; el siguiente llamado (recotizar, o el propio checkout)
 *  ya vuelve a probar. */
async function buscarLocationIQ(params: Record<string, string>): Promise<{ lat: number; lon: number } | null> {
  const url = `${LOCATIONIQ_BASE}/search?${new URLSearchParams(params).toString()}`;

  try {
    const res = await fetchConTimeout(url);
    if (!res.ok) return null;

    const datos = (await res.json()) as { lat?: string; lon?: string }[];
    const primero = datos?.[0];
    if (!primero?.lat || !primero?.lon) return null;

    const lat = Number(primero.lat);
    const lon = Number(primero.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return { lat, lon };
  } catch {
    return null;
  }
}

/**
 * Dirección escrita → coordenadas, vía LocationIQ Search (geocoding).
 * `viewbox` + `bounded=1` (ver CAJA_ARICA_GRADOS) restringen la búsqueda
 * a Arica. Sin `LOCATIONIQ_API_KEY` configurada, devuelve null de una
 * (mismo criterio de "degradar, no romper" que el resto del módulo).
 *
 * PRIMERO estructurada (street/city separados), NO texto libre. Caso real
 * (31-08-2026): "Linderos 3736" con `q` de texto libre resolvía a
 * "Linderos", una localidad rural real a 36 km — DENTRO de la misma
 * comuna de Arica, así que `bounded=1` no la descartaba. Con la búsqueda
 * separada en `street="Linderos 3736"` + `city="Arica"` el resultado es
 * otro: "Avenida Linderos" en Arica urbana, a 3 km de la tienda — que es
 * lo que el dueño esperaba. Separar los campos le da al buscador la
 * intención real ("esto es una calle", no "encuéntrame cualquier lugar
 * con este nombre"), en vez de dejarlo adivinar de un texto ambiguo.
 * Si la estructurada no encuentra nada (direcciones atípicas, sin
 * número, etc.) cae a texto libre como respaldo.
 */
export async function geocodificar(
  calle: string,
  numero: string,
  comuna: string
): Promise<{ lat: number; lon: number } | null> {
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) return null;

  const origen = origenTienda();
  // viewbox = left,top,right,bottom (minLon,maxLat,maxLon,minLat).
  const viewbox = [
    origen.lon - CAJA_ARICA_GRADOS,
    origen.lat + CAJA_ARICA_GRADOS,
    origen.lon + CAJA_ARICA_GRADOS,
    origen.lat - CAJA_ARICA_GRADOS,
  ].join(',');
  const base = { key: apiKey, format: 'json', countrycodes: 'cl', viewbox, bounded: '1', limit: '1' };

  const estructurada = await buscarLocationIQ({
    ...base,
    street: `${calle} ${numero}`,
    city: comuna,
    country: 'Chile',
  });
  if (estructurada) return estructurada;

  return buscarLocationIQ({ ...base, q: `${calle} ${numero}, ${comuna}, Chile` });
}

/** Distancia en línea recta (Haversine). Solo se usa como respaldo cuando
 *  Distance Matrix no responde: se le aplica un factor de rodeo para no
 *  subestimar. */
function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Factor de rodeo aplicado al respaldo de línea recta. 1,35 es el valor
 * habitual para trama urbana; se prefiere sobreestimar antes que cobrar de
 * menos un despacho que en la práctica es más largo.
 */
const FACTOR_RODEO = 1.35;

/** Un intento de pedir la ruta a LocationIQ Directions. */
async function intentarRutaKm(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number },
  apiKey: string
): Promise<number | null> {
  // Igual que OSRM: la ruta va en lon,lat (al revés de lo habitual) —
  // invertirlo da rutas silenciosamente equivocadas, no un error.
  const coords = `${origen.lon},${origen.lat};${destino.lon},${destino.lat}`;
  const params = new URLSearchParams({ key: apiKey, overview: 'false', alternatives: 'false' });
  const url = `${LOCATIONIQ_BASE}/directions/driving/${coords}?${params.toString()}`;

  try {
    const res = await fetchConTimeout(url);
    if (!res.ok) return null;

    const datos = (await res.json()) as { code?: string; routes?: { distance?: number }[] };
    if (datos.code !== 'Ok') return null;

    const metros = datos.routes?.[0]?.distance;
    if (typeof metros !== 'number' || !Number.isFinite(metros)) return null;

    return metros / 1000;
  } catch {
    return null;
  }
}

/** Distancia de manejo entre la tienda y un punto, vía LocationIQ
 *  Directions (compatible con OSRM). Sin `LOCATIONIQ_API_KEY` configurada,
 *  devuelve null (cae al respaldo de línea recta, ver
 *  distanciaDesdeTienda).
 *
 *  Un reintento tras una pausa corta: el plan gratuito de LocationIQ
 *  aplica un límite de ~2 peticiones/segundo, y un choque pasajero con
 *  ese límite (o un timeout de red) no debería condenar a una dirección
 *  a la estimación por línea recta — con un segundo intento casi siempre
 *  alcanza. */
async function distanciaRutaKm(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number }
): Promise<number | null> {
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) return null;

  const primero = await intentarRutaKm(origen, destino, apiKey);
  if (primero !== null) return primero;

  await new Promise((resolve) => setTimeout(resolve, 600));
  return intentarRutaKm(origen, destino, apiKey);
}

/**
 * Distancia por carretera desde la tienda hasta la dirección dada.
 * Devuelve `null` solo si ni siquiera se pudo ubicar la dirección — en ese
 * caso el llamador NO debe inventar una tarifa (ver src/lib/envio.ts).
 */
export async function distanciaDesdeTienda(
  calle: string,
  numero: string,
  comuna: string
): Promise<ResultadoDistancia | null> {
  const clave = normalizar(`${calle}|${numero}|${comuna}`);
  if (cacheDistancia.has(clave)) return cacheDistancia.get(clave) ?? null;

  const coordenadas = await geocodificar(calle, numero, comuna);
  if (!coordenadas) {
    // NO se cachea el null: un fallo de geocodificación puede ser
    // transitorio (LocationIQ caído, timeout, rate limit) — cachearlo
    // dejaría a esa dirección puntual sin despacho local hasta que la
    // función serverless se reciclara, aunque el servicio ya hubiera
    // vuelto. Mismo motivo que abajo con la estimación por línea recta.
    return null;
  }

  const origen = origenTienda();
  const km = await distanciaRutaKm(origen, coordenadas);

  if (km !== null) {
    const resultado: ResultadoDistancia = { km, estimada: false, origen: 'ruta', coordenadas };
    cacheDistancia.set(clave, resultado);
    return resultado;
  }

  // LocationIQ Directions no respondió (o falta la API key): se estima
  // con línea recta + factor de rodeo. Caso real (01-09-2026): un fallo
  // transitorio justo en la primera consulta de una dirección quedaba
  // cacheado como "estimada" PARA SIEMPRE (mientras viviera la instancia
  // serverless), aunque reintentar un segundo después funcionara
  // perfecto — por eso este resultado NO se cachea: cada consulta nueva
  // reintenta la ruta real, y solo un éxito real queda guardado.
  return {
    km: haversineKm(origen, coordenadas) * FACTOR_RODEO,
    estimada: true,
    origen: 'estimacion-linea-recta',
    coordenadas,
  };
}
