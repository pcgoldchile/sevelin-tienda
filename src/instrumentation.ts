/**
 * Punto de entrada de Next.js para instrumentación del servidor.
 *
 * Deja todos los errores del servidor de la tienda en el panel Salud del POS
 * (ver src/lib/registro-errores.ts y supabase/33):
 *   · register(): engancha console.error, que ya usan webhooks, correos,
 *     llamadas al POS y páginas del catálogo.
 *   · onRequestError(): errores NO controlados de rutas y páginas, que no
 *     pasan por ningún console.error propio.
 *
 * Solo en el runtime de Node: el proxy (middleware) corre en edge y ahí no
 * existe la service_role.
 */
import type { Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { engancharConsoleError } = await import('./lib/registro-errores');
  engancharConsoleError();
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { registrarErrorSalud } = await import('./lib/registro-errores');
  const error = err as Error & { digest?: string };
  await registrarErrorSalud({
    ruta: request.path.split('?')[0],
    metodo: request.method,
    estadoHttp: 500,
    mensaje: `Error no controlado: ${error?.message || String(err)}`,
    detalle: `${context.routeType} ${context.routePath}${error?.digest ? ` · digest ${error.digest}` : ''}`,
  });
};
