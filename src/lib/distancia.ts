import { obtenerDetalleLugar } from './places';

/**
 * Distancia real por carretera desde la tienda, con Google Maps Platform.
 *
 *   1. Geocoding API convierte la dirección escrita en coordenadas.
 *   2. Distance Matrix API calcula la ruta manejando entre la tienda y
 *      esas coordenadas.
 *
 * POR QUÉ RUTA Y NO LÍNEA RECTA
 * La Fase 4 usaba Haversine (línea recta). En Arica eso subestima: el río,
 * la línea férrea y el cerro obligan rodeos que la recta ignora, así que un
 * domicilio "a 4 km" podía estar a 6,5 km de manejo real y quedaba cobrado
 * en el tramo equivocado. Por eso ahora manda la distancia de ruta.
 *
 * POR QUÉ GOOGLE (segundo intento, 01-09-2026) Y NO LOCATIONIQ/NOMINATIM
 * Se probó primero LocationIQ (compatible con Nominatim/OSM, sin la
 * fricción de facturación de Google). Pero OpenStreetMap NO tiene mapeado
 * el número de casa exacto para varias calles de Arica (ej. "Avenida
 * Linderos", "Héctor Ruiz") — solo sabe que la calle existe, no en qué
 * punto cae el número. Se confirmó pidiendo la MISMA dirección varias
 * veces: devolvía puntos distintos de la misma calle cada vez (entre 2 y
 * 4,4 km de la tienda para un domicilio real a ~650 m). Ningún ajuste de
 * consulta arregla esto: el dato simplemente no existe en esa base. Google
 * sí tiene ese nivel de precisión para Arica (confirmado a mano contra
 * Google Maps para las mismas direcciones) — a cambio de la fricción de
 * configurar facturación y restricciones en Google Cloud.
 *
 * LÍMITES (ambas son APIs PAGADAS de Google Maps Platform — requieren
 * facturación habilitada en la cuenta de Google Cloud del dueño; no hay
 * volumen mensual gratis garantizado)
 * - `GOOGLE_GEOCODING_API_KEY` (Geocoding API): su "Restricción de la
 *   aplicación" debe ser "Ninguna" o "Direcciones IP" — NUNCA "Referencias
 *   HTTP", porque esta llamada la hace el servidor (Vercel), que no manda
 *   ese header (así falló la primera vez, 31-08-2026).
 * - `GOOGLE_DISTANCE_MATRIX_API_KEY` (Distance Matrix API): el proyecto de
 *   Google Cloud debe tener facturación habilitada (así falló la primera
 *   vez también).
 * - Ambas deben estar habilitadas en el proyecto de Google Cloud
 *   correspondiente a cada key.
 *
 * Se cachea en memoria SOLO un resultado de ruta exitoso — nunca un fallo
 * ni una estimación por línea recta (bug real encontrado el 01-09-2026:
 * un fallo transitorio en la primera consulta de una dirección quedaba
 * cacheado "para siempre" en esa instancia serverless, aunque reintentar
 * un segundo después funcionara perfecto). El checkout cotiza varias
 * veces mientras el cliente edita el formulario, y sin caché cada tecla
 * podría gatillar una petición nueva (y un cobro extra) por nada.
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
 * Coordenadas ROOFTOP de Google Geocoding para "San Rafael 896, Arica,
 * Chile" (verificadas a mano el 01-09-2026, `location_type: "ROOFTOP"` —
 * el nivel de precisión más alto que da Google, anclado al edificio
 * exacto, no interpolado).
 *
 * Reemplazan un valor anterior (-18.4619,-70.2976) que a su vez había
 * reemplazado el geocoding de Nominatim (~4 km al norte del local) por
 * "coordenadas confirmadas por el dueño" — pero ese valor manual TAMBIÉN
 * estaba mal, por ~1,8 km. Se descubrió recién ahora, comparando contra
 * Google Distance Matrix: el caso real "San Rafael 896 → Linderos 3736"
 * debía dar 0,65 km (confirmado en Google Maps por el dueño) y con el
 * origen viejo daba 2,9 km — con este origen da 0,67 km. Mismo chequeo
 * con Héctor Ruiz 280: 8,3 km acá vs 8,4 km en Google Maps. Un origen
 * equivocado corre TODAS las tarifas de despacho local a la vez, y es un
 * error invisible (los números salen plausibles, solo que mal) — por eso
 * quedó sin detectarse dos veces seguidas. Se pueden sobreescribir por
 * entorno (TIENDA_LAT/TIENDA_LON) si el local se muda.
 */
const TIENDA_LAT_POR_DEFECTO = -18.4463734;
const TIENDA_LON_POR_DEFECTO = -70.2877686;

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

const GOOGLE_GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

const TIMEOUT_MS = 7000;

/**
 * Medio grado (~55 km) alrededor de la tienda, en cada dirección. Cubre
 * Arica urbana + Azapa/Lluta + un margen amplio, y sesga el resultado
 * hacia Arica cuando el nombre de una calle se repite en otra parte de
 * Chile. En Google `bounds` es un SESGO (no un límite duro como el
 * `bounded=1` de Nominatim/LocationIQ): puede devolver algo fuera de la
 * caja si no encuentra nada mejor adentro.
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

/** fetch con corte por tiempo: si Google Maps se cuelga, el checkout no
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

/**
 * Dirección escrita → coordenadas, vía Google Geocoding API. `bounds`
 * (ver CAJA_ARICA_GRADOS) sesga el resultado hacia Arica, y `region=cl`
 * refuerza el país. Sin `GOOGLE_GEOCODING_API_KEY` configurada, devuelve
 * null de una (mismo criterio de "degradar, no romper" que el resto del
 * módulo).
 */
export async function geocodificar(
  calle: string,
  numero: string,
  comuna: string
): Promise<{ lat: number; lon: number } | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) return null;

  const origen = origenTienda();
  const bounds =
    `${origen.lat - CAJA_ARICA_GRADOS},${origen.lon - CAJA_ARICA_GRADOS}` +
    `|${origen.lat + CAJA_ARICA_GRADOS},${origen.lon + CAJA_ARICA_GRADOS}`;
  const params = new URLSearchParams({
    address: `${calle} ${numero}, ${comuna}, Chile`,
    region: 'cl',
    bounds,
    key: apiKey,
  });
  const url = `${GOOGLE_GEOCODING_URL}?${params.toString()}`;

  try {
    const res = await fetchConTimeout(url);
    if (!res.ok) return null;

    const datos = (await res.json()) as {
      status?: string;
      results?: { geometry?: { location?: { lat?: number; lng?: number } } }[];
    };
    if (datos.status !== 'OK') return null;

    const loc = datos.results?.[0]?.geometry?.location;
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null;

    return { lat: loc.lat, lon: loc.lng };
  } catch {
    return null;
  }
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

/** Un intento de pedir la ruta a Google Distance Matrix. */
async function intentarRutaKm(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number },
  apiKey: string
): Promise<number | null> {
  const params = new URLSearchParams({
    origins: `${origen.lat},${origen.lon}`,
    destinations: `${destino.lat},${destino.lon}`,
    mode: 'driving',
    units: 'metric',
    key: apiKey,
  });
  const url = `${GOOGLE_DISTANCE_MATRIX_URL}?${params.toString()}`;

  try {
    const res = await fetchConTimeout(url);
    if (!res.ok) return null;

    const datos = (await res.json()) as {
      status?: string;
      rows?: { elements?: { status?: string; distance?: { value?: number } }[] }[];
    };
    if (datos.status !== 'OK') return null;

    const elemento = datos.rows?.[0]?.elements?.[0];
    if (elemento?.status !== 'OK') return null;

    const metros = elemento.distance?.value;
    if (typeof metros !== 'number' || !Number.isFinite(metros)) return null;

    return metros / 1000;
  } catch {
    return null;
  }
}

/** Distancia de manejo entre la tienda y un punto, vía Google Distance
 *  Matrix API. Sin `GOOGLE_DISTANCE_MATRIX_API_KEY` configurada, devuelve
 *  null (cae al respaldo de línea recta, ver distanciaDesdeTienda).
 *
 *  Un reintento tras una pausa corta: un timeout de red pasajero no
 *  debería condenar a una dirección a la estimación por línea recta. */
async function distanciaRutaKm(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number }
): Promise<number | null> {
  const apiKey = process.env.GOOGLE_DISTANCE_MATRIX_API_KEY;
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
    // transitorio (Google caído, timeout) — cachearlo dejaría a esa
    // dirección puntual sin despacho local hasta que la función
    // serverless se reciclara, aunque el servicio ya hubiera vuelto.
    // Mismo motivo que abajo con la estimación por línea recta.
    return null;
  }

  const origen = origenTienda();
  const km = await distanciaRutaKm(origen, coordenadas);

  if (km !== null) {
    const resultado: ResultadoDistancia = { km, estimada: false, origen: 'ruta', coordenadas };
    cacheDistancia.set(clave, resultado);
    return resultado;
  }

  // Distance Matrix no respondió (o falta la API key): se estima con
  // línea recta + factor de rodeo. NO se cachea: un fallo transitorio en
  // la primera consulta de una dirección no debe quedar pegado para
  // siempre en esa instancia serverless — la próxima consulta siempre
  // reintenta la ruta real, y solo un éxito real queda guardado.
  return {
    km: haversineKm(origen, coordenadas) * FACTOR_RODEO,
    estimada: true,
    origen: 'estimacion-linea-recta',
    coordenadas,
  };
}

/**
 * Distancia por carretera desde la tienda hasta un lugar ya elegido en el
 * autocompletado del checkout (ver src/lib/places.ts). Salta Geocoding
 * por completo: el cliente ya confirmó exactamente qué lugar quiso decir,
 * así que se usan las coordenadas de Place Details directo (mismo nivel
 * de precisión ROOFTOP) — mismo camino de ruta real + caché + reintento
 * que `distanciaDesdeTienda`, solo cambia cómo se consiguen las
 * coordenadas del destino.
 */
export async function distanciaDesdePlaceId(placeId: string): Promise<ResultadoDistancia | null> {
  const clave = normalizar(`place:${placeId}`);
  if (cacheDistancia.has(clave)) return cacheDistancia.get(clave) ?? null;

  const detalle = await obtenerDetalleLugar(placeId);
  if (!detalle) return null; // no se cachea: mismo motivo que el resto del módulo

  const coordenadas = { lat: detalle.lat, lon: detalle.lon };
  const origen = origenTienda();
  const km = await distanciaRutaKm(origen, coordenadas);

  if (km !== null) {
    const resultado: ResultadoDistancia = { km, estimada: false, origen: 'ruta', coordenadas };
    cacheDistancia.set(clave, resultado);
    return resultado;
  }

  return {
    km: haversineKm(origen, coordenadas) * FACTOR_RODEO,
    estimada: true,
    origen: 'estimacion-linea-recta',
    coordenadas,
  };
}
