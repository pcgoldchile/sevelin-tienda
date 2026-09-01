/**
 * Autocompletado de direcciones en el checkout — Google Places API (New).
 *
 * Dos pasos, como cualquier autocompletado de mapas:
 *   1. Autocomplete (New): el cliente escribe, se piden sugerencias en
 *      vivo (nombre de la calle + comuna, sin coordenadas todavía).
 *   2. Place Details (New): al elegir una sugerencia, se piden sus datos
 *      completos — ahí sí vienen las coordenadas EXACTAS (mismo nivel
 *      ROOFTOP que ya usa Geocoding, ver src/lib/distancia.ts).
 *
 * Con las coordenadas de Place Details el checkout puede pedirle la
 * distancia real a Distance Matrix DIRECTO, sin pasar por Geocoding — el
 * cliente ya confirmó exactamente qué lugar quiso decir, no hace falta
 * adivinarlo de un texto libre.
 *
 * `GOOGLE_PLACES_API_KEY`: llave separada de Geocoding/Distance Matrix
 * (mismo criterio de "una key por API, restringida solo a esa API" — ver
 * .env.local.example), pero puede apuntar al mismo proyecto de Google
 * Cloud.
 */

const PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACES_DETALLE_URL = 'https://places.googleapis.com/v1/places';

const TIMEOUT_MS = 7000;

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
 * Centro aproximado de Arica para sesgar las sugerencias — mismo valor
 * por defecto de la tienda (ver TIENDA_LAT/LON_POR_DEFECTO en
 * src/lib/distancia.ts). Deliberadamente NO se importa desde ese archivo:
 * evita un import circular (distancia.ts va a importar `obtenerDetalleLugar`
 * de este archivo para resolver un placeId). Un pequeño desvío acá no
 * importa — es solo el centro del círculo que restringe el autocompletado
 * (ver RADIO_RESTRICCION_METROS), no el origen real que se usa para
 * cobrar (ese siempre sale de origenTienda()).
 */
const CENTRO_ARICA = { lat: -18.4463734, lon: -70.2877686 };
// 50.000 m es el máximo que acepta la API (rechaza con 400 INVALID_ARGUMENT
// por encima de eso) — igual cubre Arica urbana + Azapa/Lluta de sobra.
const RADIO_RESTRICCION_METROS = 50000;

export interface SugerenciaDireccion {
  placeId: string;
  /** Texto completo de la sugerencia, ej. "Avenida Linderos 3736, Arica, Chile". */
  texto: string;
  /** Segunda línea (comuna/región), cuando Google la separa. */
  textoSecundario: string | null;
}

/**
 * Sugerencias en vivo mientras el cliente escribe. Sin
 * `GOOGLE_PLACES_API_KEY` configurada, o con menos de 3 caracteres,
 * devuelve una lista vacía (degrada a "sin autocompletado", nunca rompe
 * el campo de texto libre).
 */
export async function autocompletarDireccion(input: string): Promise<SugerenciaDireccion[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const texto = input.trim();
  if (!apiKey || texto.length < 3) return [];

  const body = {
    input: texto,
    includedRegionCodes: ['cl'],
    // `locationRestriction` (límite DURO), no `locationBias` (solo un
    // sesgo de ranking): probado a mano el 01-09-2026 — con `bias`,
    // "Linderos" seguía sugiriendo la localidad homónima de Buin (Región
    // Metropolitana) entre los primeros resultados; con `restriction`
    // desaparece por completo, ni siquiera aparece más abajo en la lista.
    locationRestriction: {
      circle: {
        center: { latitude: CENTRO_ARICA.lat, longitude: CENTRO_ARICA.lon },
        radius: RADIO_RESTRICCION_METROS,
      },
    },
  };

  try {
    const res = await fetchConTimeout(PLACES_AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];

    const datos = (await res.json()) as {
      suggestions?: {
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: { secondaryText?: { text?: string } };
        };
      }[];
    };

    return (datos.suggestions || [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => !!p?.placeId && !!p.text?.text)
      .map((p) => ({
        placeId: p.placeId as string,
        texto: p.text?.text as string,
        textoSecundario: p.structuredFormat?.secondaryText?.text || null,
      }));
  } catch {
    return [];
  }
}

export interface DetalleLugar {
  calle: string | null;
  numero: string | null;
  lat: number;
  lon: number;
}

/**
 * Detalle completo de una sugerencia ya elegida — trae las coordenadas
 * exactas (ROOFTOP cuando Google lo tiene) y, si vienen, la calle y el
 * número por separado (para rellenar los campos del formulario). Sin
 * `GOOGLE_PLACES_API_KEY` configurada, devuelve null.
 */
export async function obtenerDetalleLugar(placeId: string): Promise<DetalleLugar | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const id = placeId.trim();
  if (!apiKey || !id) return null;

  const url = `${PLACES_DETALLE_URL}/${encodeURIComponent(id)}`;

  try {
    const res = await fetchConTimeout(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        // Field mask obligatorio en Places API (New) — sin esto rechaza la
        // petición. Se piden solo los campos que se usan, no el lugar
        // completo (nombre comercial, horarios, fotos, etc.)
        'X-Goog-FieldMask': 'location,addressComponents',
      },
    });
    if (!res.ok) return null;

    const datos = (await res.json()) as {
      location?: { latitude?: number; longitude?: number };
      addressComponents?: { longText?: string; types?: string[] }[];
    };

    const lat = datos.location?.latitude;
    const lon = datos.location?.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;

    const componentes = datos.addressComponents || [];
    const buscar = (tipo: string) => componentes.find((c) => c.types?.includes(tipo))?.longText || null;

    return {
      calle: buscar('route'),
      numero: buscar('street_number'),
      lat,
      lon,
    };
  } catch {
    return null;
  }
}
