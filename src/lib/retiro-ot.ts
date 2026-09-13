/**
 * QR de retiro seguro de las Órdenes de Trabajo del POS
 * (sevelin-pos-oficial/sql/47-qr-retiro-ot.sql).
 *
 * No siempre quien trae el equipo es quien lo retira. El POS genera un
 * código aleatorio por orden y la tienda le da cara pública: el correo con
 * el QR y la página /retiro/<código>, que el dueño del equipo puede
 * reenviar a quien quiera. En el mostrador, el POS escanea ese QR.
 *
 * La tienda NO guarda nada de las OT: las consulta al POS en cada visita,
 * así un QR reemplazado deja de servir en el mismo instante.
 */

const PATRON_TOKEN = /^[0-9a-f]{32}$/;

export function esTokenRetiroValido(token: unknown): token is string {
  return typeof token === 'string' && PATRON_TOKEN.test(token);
}

export function urlRetiro(token: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sevelin.cl').replace(/\/+$/, '');
  return `${base}/retiro/${token}`;
}

export interface RetiroOT {
  numero_ot: string;
  entregado: boolean;
  nombre: string | null;
  dispositivo: string | null;
}

/**
 * Datos mínimos de la orden para la página pública. null = el código no
 * existe o fue reemplazado. Lanza solo si el POS no responde, para que la
 * página diga "intenta más tarde" en vez de "este QR no sirve".
 *
 * La URL se deriva de POS_INTERNAL_API_URL (termina en ajustar-stock), igual
 * que registrarVentaWebPos(): una variable nueva olvidada fallaría en silencio.
 */
export async function consultarRetiroOT(token: string): Promise<RetiroOT | null> {
  if (!esTokenRetiroValido(token)) return null;
  const base = process.env.POS_INTERNAL_API_URL;
  const secreto = process.env.SYNC_SECRET;
  if (!base || !secreto) throw new Error('Falta POS_INTERNAL_API_URL o SYNC_SECRET');
  const url = base.replace(/ajustar-stock\/?$/, `retiro/${token}`);
  if (url === base) throw new Error('POS_INTERNAL_API_URL no termina en ajustar-stock');

  const respuesta = await fetch(url, { headers: { 'x-sync-secret': secreto }, cache: 'no-store' });
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error(`El POS respondió ${respuesta.status}`);
  return (await respuesta.json()) as RetiroOT;
}
