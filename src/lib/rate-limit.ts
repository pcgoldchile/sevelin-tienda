import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

/**
 * Freno de tasa por IP para endpoints públicos que disparan llamadas
 * PAGADAS a Google Maps Platform (Geocoding, Distance Matrix, Places) —
 * ver docs/SNAPSHOT.md "Vigilar el costo de Google Cloud" y el Reporte de
 * Seguridad Consolidado B, hallazgos #3 y #5.
 *
 * POR QUÉ Upstash Redis y no un Map en memoria (como frenoLogin del POS,
 * antes de su propio fix): en funciones serverless de Vercel cada
 * invocación puede caer en una instancia distinta, y el estado en memoria
 * de un proceso NO se comparte entre ellas — un contador local daría una
 * falsa sensación de protección. Upstash expone Redis por HTTP (REST), sin
 * conexión persistente, así que es compatible con el modelo serverless.
 *
 * Sin UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN configuradas (ej.
 * desarrollo local sin Redis), degrada a "sin freno" en vez de romper el
 * checkout — mismo criterio de "degradar, no romper" que ya usa el resto
 * del proyecto ante servicios externos opcionales (Resend, Chilexpress,
 * la propia Google Maps).
 */

const redisConfigurado = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

if (!redisConfigurado) {
  console.warn(
    '[rate-limit] Falta UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN: los ' +
      'endpoints de Google Maps quedan SIN freno de tasa. Configúralas en Vercel ' +
      'antes de ir a producción (ver .env.local.example).'
  );
}

const redis = redisConfigurado ? Redis.fromEnv() : null;

export type NombreLimite = 'autocompletar-direccion' | 'detalle-direccion' | 'cotizar-envio';

interface ConfigLimite {
  /** Ráfaga corta: frena un script que dispara muchas peticiones seguidas. */
  rafagaMax: number;
  rafagaVentana: Parameters<typeof Ratelimit.slidingWindow>[1];
  /** Techo diario por IP — el freno real contra el sobrecosto de Google Cloud. */
  diarioMax: number;
}

/* Números calibrados contra el consumo real de un cliente (verificado en
   formulario-checkout.tsx, no estimado a ojo): el debounce de 300ms
   (autocompletado) y 600ms (cotizar envío) ya evita que cada tecla dispare
   una petición — una sesión de compra real gasta entre 8 y 20 peticiones
   combinadas entre los 3 endpoints, incluso con correcciones. El techo
   diario por IP de acá es ~7-8 veces ese uso real, con margen para IPs
   compartidas (oficina, NAT de un edificio), pero ya NO le regala a un solo
   atacante un tercio del presupuesto diario completo de la tienda como
   pasaba con los valores anteriores (300/150/200).

   Esto es la capa 2 de la protección (por IP individual) — la capa 1, el
   techo global diario de la cuenta de Google Cloud (Console → APIs &
   Services → Cuotas, fijado en 500/día combinado), la protege contra un
   ataque distribuido entre muchas IPs, que esta capa por sí sola no cubre.
   Ajustables sin tocar el resto del código. */
const CONFIGURACION: Record<NombreLimite, ConfigLimite> = {
  // Se dispara con cada tecla (mín. 3 caracteres) tras 300ms de pausa: es
  // la ráfaga la que más importa acá.
  'autocompletar-direccion': { rafagaMax: 20, rafagaVentana: '10 s', diarioMax: 60 },
  // Se dispara una vez por sugerencia elegida — mucho menos frecuente.
  'detalle-direccion': { rafagaMax: 10, rafagaVentana: '10 s', diarioMax: 30 },
  // Se dispara con debounce (600ms) mientras se edita dirección/cantidades.
  'cotizar-envio': { rafagaMax: 15, rafagaVentana: '10 s', diarioMax: 40 },
};

const limitadores = new Map<NombreLimite, { rafaga: Ratelimit; diario: Ratelimit }>();

function obtenerLimitador(nombre: NombreLimite) {
  if (!redis) return null;
  let par = limitadores.get(nombre);
  if (!par) {
    const cfg = CONFIGURACION[nombre];
    par = {
      rafaga: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(cfg.rafagaMax, cfg.rafagaVentana),
        prefix: `sevelin:rl:rafaga:${nombre}`,
        analytics: false,
      }),
      diario: new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(cfg.diarioMax, '1 d'),
        prefix: `sevelin:rl:diario:${nombre}`,
        analytics: false,
      }),
    };
    limitadores.set(nombre, par);
  }
  return par;
}

export interface ResultadoLimite {
  permitido: boolean;
  motivo?: 'rafaga' | 'diario';
  reintentarEnSegundos?: number;
}

/**
 * Chequea (y consume) el freno de tasa de `nombre` para `ip`. Se evalúa
 * primero la ráfaga corta (más barata de saturar) y recién si esa pasa, el
 * techo diario. Sin Redis configurado, siempre permite (ver nota de
 * arriba).
 */
export async function chequearLimite(nombre: NombreLimite, ip: string): Promise<ResultadoLimite> {
  const par = obtenerLimitador(nombre);
  if (!par) return { permitido: true };

  const rafaga = await par.rafaga.limit(ip);
  if (!rafaga.success) {
    return {
      permitido: false,
      motivo: 'rafaga',
      reintentarEnSegundos: Math.max(1, Math.ceil((rafaga.reset - Date.now()) / 1000)),
    };
  }

  const diario = await par.diario.limit(ip);
  if (!diario.success) {
    return {
      permitido: false,
      motivo: 'diario',
      reintentarEnSegundos: Math.max(1, Math.ceil((diario.reset - Date.now()) / 1000)),
    };
  }

  return { permitido: true };
}

/**
 * IP real del cliente detrás del proxy de Vercel. Vercel AGREGA la IP real
 * de la conexión al final de X-Forwarded-For aunque el cliente ya traiga
 * ese header con un valor propio — por eso se toma el ÚLTIMO valor de la
 * lista, nunca el primero (el primero lo puede escribir cualquiera). Mismo
 * criterio aplicado en api/index.js del POS (ver Reporte de Seguridad
 * Consolidado B, hallazgo #1) — se repite acá porque son runtimes
 * distintos (Request web estándar vs. Express) y no comparten código.
 */
export function ipReal(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const partes = xff.split(',').map((p) => p.trim()).filter(Boolean);
    if (partes.length) return partes[partes.length - 1];
  }
  return 'anon';
}

/** Respuesta 429 estándar para los 3 endpoints de Google Maps, con
 *  Retry-After para que el cliente (o un reintento automático) sepa cuánto
 *  esperar. */
export function respuestaLimiteExcedido(resultado: ResultadoLimite): NextResponse {
  const mensaje =
    resultado.motivo === 'diario'
      ? 'Se alcanzó el máximo de consultas de direcciones por hoy desde tu conexión. Probá de nuevo mañana o completá la dirección a mano.'
      : 'Demasiadas solicitudes seguidas. Esperá unos segundos e intentá de nuevo.';

  return NextResponse.json(
    { error: mensaje },
    {
      status: 429,
      headers: resultado.reintentarEnSegundos
        ? { 'Retry-After': String(resultado.reintentarEnSegundos) }
        : undefined,
    }
  );
}
