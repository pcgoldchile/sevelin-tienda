import { COMUNAS_POR_REGION } from './comunas-chile';

/**
 * Autocompletado de direcciones en el checkout — Google Places API (New).
 *
 * Dos pasos, como cualquier autocompletado de mapas:
 *   1. Autocomplete (New): el cliente escribe, se piden sugerencias en
 *      vivo (nombre de la calle + comuna, sin coordenadas todavía) — de
 *      CUALQUIER ciudad de Chile, no solo Arica (ver la nota de v36 más
 *      abajo).
 *   2. Place Details (New): al elegir una sugerencia, se piden sus datos
 *      completos — ahí sí vienen las coordenadas EXACTAS (mismo nivel
 *      ROOFTOP que ya usa Geocoding, ver src/lib/distancia.ts) y, cuando
 *      Google los separa, calle/número/comuna.
 *
 * Con las coordenadas de Place Details el checkout puede pedirle la
 * distancia real a Distance Matrix DIRECTO, sin pasar por Geocoding — el
 * cliente ya confirmó exactamente qué lugar quiso decir, no hace falta
 * adivinarlo de un texto libre. Esto solo se usa para el despacho LOCAL
 * (dentro de Arica); fuera de Arica el courier (Chilexpress/Starken)
 * cotiza por región/comuna de todos modos, así que ahí el placeId no
 * cambia el precio — sí sirve para que calle/número/comuna queden
 * completados con precisión en vez de a mano.
 *
 * v36 (01-09-2026): antes el autocompletado estaba restringido DURO a un
 * círculo de 50km alrededor de Arica (pedido explícito de esa sesión). El
 * dueño pidió después que funcionara para cualquier ciudad de Chile — se
 * sacó la restricción geográfica (queda solo `includedRegionCodes: ['cl']`,
 * Chile entero) y, al elegir una sugerencia, la región/comuna del
 * formulario se completan solas a partir de la comuna real que devuelve
 * Google (resolverComuna más abajo) en vez de fijarlas siempre en Arica —
 * así nunca queda una dirección real desincronizada de la región/comuna
 * que el cliente eligió a mano antes de escribir la calle.
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
 * Comuna (normalizada, sin tildes/mayúsculas) → nombre canónico de comuna +
 * región, construido una sola vez a partir de COMUNAS_POR_REGION — es la
 * misma lista de 346 comunas que ya usa el select del formulario, así que
 * "resolver la comuna que devolvió Google" y "comuna válida en el
 * checkout" son SIEMPRE la misma fuente de verdad.
 */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

const COMUNA_POR_NOMBRE_NORMALIZADO = new Map<string, { region: string; comuna: string }>();
for (const [region, comunas] of Object.entries(COMUNAS_POR_REGION)) {
  for (const comuna of comunas) {
    COMUNA_POR_NOMBRE_NORMALIZADO.set(normalizar(comuna), { region, comuna });
  }
}

/**
 * Busca, entre los `addressComponents` que devuelve Place Details, uno que
 * coincida con una comuna real de Chile — en ese orden de tipos de Google
 * (una dirección chilena normalmente trae la comuna como
 * `administrative_area_level_3`, pero se revisan alternativas por si
 * Google la clasificó distinto para ese lugar puntual). Si ninguno calza
 * con nuestra lista de 346 comunas, se retorna `null` — el llamador no
 * fuerza ninguna región/comuna a partir de un dato que no pudo confirmar.
 */
function resolverComuna(
  componentes: { longText?: string; types?: string[] }[]
): { region: string; comuna: string } | null {
  const tiposEnOrden = ['administrative_area_level_3', 'locality', 'sublocality', 'administrative_area_level_2'];
  for (const tipo of tiposEnOrden) {
    const texto = componentes.find((c) => c.types?.includes(tipo))?.longText;
    if (!texto) continue;
    const encontrada = COMUNA_POR_NOMBRE_NORMALIZADO.get(normalizar(texto));
    if (encontrada) return encontrada;
  }
  return null;
}

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
    // Chile entero, sin sesgo ni restricción geográfica dentro del país —
    // ver la nota de v36 al inicio del archivo (antes restringido a un
    // círculo de 50km alrededor de Arica).
    includedRegionCodes: ['cl'],
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
  /** Región/comuna reales del lugar, YA validadas contra COMUNAS_POR_REGION
   *  (mismo string que usan los <select> del formulario) — `null` si Google
   *  no trajo un componente que calzara con ninguna de las 346 comunas. */
  region: string | null;
  comuna: string | null;
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
    const comunaResuelta = resolverComuna(componentes);

    return {
      calle: buscar('route'),
      numero: buscar('street_number'),
      lat,
      lon,
      region: comunaResuelta?.region ?? null,
      comuna: comunaResuelta?.comuna ?? null,
    };
  } catch {
    return null;
  }
}
