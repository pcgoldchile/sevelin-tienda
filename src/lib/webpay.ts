/**
 * Cliente de Webpay Plus (Transbank), API REST v1.2 — pago con tarjeta de
 * débito, crédito o prepago. Server-only (usa la llave secreta): nunca se
 * importa desde código 'use client'.
 *
 * Fuente: transbankdevelopers.cl/referencia/webpay y
 * /documentacion/webpay-plus, leídas el 11-10-2026.
 *
 * CÓMO FUNCIONA (no hay webhook)
 *  1. crearTransaccionWebpay() → Transbank devuelve `token` y `url`.
 *  2. El navegador del cliente va a `url` con el token en `token_ws` (POST).
 *  3. El cliente paga en el formulario de Transbank (4 minutos en producción,
 *     10 en integración).
 *  4. Transbank lo devuelve a `return_url` (GET /api/webpay/retorno) con:
 *       · token_ws                          → terminó (aprobado O rechazado)
 *       · TBK_TOKEN + TBK_ORDEN_COMPRA + …  → apretó "anular" en el formulario
 *       · TBK_ORDEN_COMPRA + TBK_ID_SESION  → se le acabó el tiempo
 *  5. confirmarTransaccionWebpay(token) → recién acá queda cobrado. Si esto no
 *     se llama, Transbank reversa el cargo solo.
 *
 * TRES ESTADOS, y la diferencia importa:
 *  · Producción   → WEBPAY_AMBIENTE=produccion + código de comercio + llave
 *                   secreta propios. Se ofrece en el checkout y cobra de verdad.
 *  · Pruebas      → ambiente de integración de Transbank, con las credenciales
 *                   públicas de su documentación. SOLO fuera de producción y
 *                   con WEBPAY_PRUEBAS=1: un pago de prueba deja el pedido
 *                   PAGADO sin que entre un peso (pasó con el sandbox de Flow,
 *                   y además descontaba stock real).
 *  · Apagado      → cualquier otro caso. El checkout no lo ofrece y la ruta de
 *                   retorno no confirma nada.
 */

const HOST_PRODUCCION = 'https://webpay3g.transbank.cl';
const HOST_INTEGRACION = 'https://webpay3gint.transbank.cl';
const RUTA_TRANSACCIONES = '/rswebpaytransaction/api/webpay/v1.2/transactions';

/* Credenciales PÚBLICAS del ambiente de integración (están en la
   documentación de Transbank; no son un secreto ni mueven plata). */
const INTEGRACION_CODIGO_COMERCIO = '597055555532';
const INTEGRACION_LLAVE_SECRETA = '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';

export type AmbienteWebpay = 'produccion' | 'integracion';

interface ConfigWebpay {
  ambiente: AmbienteWebpay;
  host: string;
  codigoComercio: string;
  llaveSecreta: string;
}

/** null = Webpay apagado. Un solo lugar decide si se puede cobrar y contra qué. */
function configWebpay(): ConfigWebpay | null {
  const ambiente = (process.env.WEBPAY_AMBIENTE || '').trim().toLowerCase();
  const codigoComercio = (process.env.WEBPAY_COMMERCE_CODE || '').trim();
  const llaveSecreta = (process.env.WEBPAY_API_KEY_SECRET || '').trim();

  if (ambiente === 'produccion') {
    if (!codigoComercio || !llaveSecreta) return null;
    /* Con las credenciales de prueba, "producción" sería un pago de mentira
       contra el host real: Transbank lo rechazaría, pero mejor ni intentarlo. */
    if (codigoComercio === INTEGRACION_CODIGO_COMERCIO || llaveSecreta === INTEGRACION_LLAVE_SECRETA) return null;
    return { ambiente: 'produccion', host: HOST_PRODUCCION, codigoComercio, llaveSecreta };
  }

  const enProduccionReal = process.env.VERCEL_ENV === 'production';
  if (ambiente === 'integracion' && process.env.WEBPAY_PRUEBAS === '1' && !enProduccionReal) {
    return {
      ambiente: 'integracion',
      // WEBPAY_API_BASE solo la define una prueba local, para no llamar a Transbank.
      host: process.env.WEBPAY_API_BASE || HOST_INTEGRACION,
      codigoComercio: INTEGRACION_CODIGO_COMERCIO,
      llaveSecreta: INTEGRACION_LLAVE_SECRETA,
    };
  }
  return null;
}

/** ¿Se puede pagar con Webpay? (en producción, o en pruebas fuera de producción) */
export function webpayHabilitado(): boolean {
  return configWebpay() !== null;
}

/** ¿Webpay está cobrando plata de verdad? Es lo que apaga el link de pago. */
export function webpayEnProduccion(): boolean {
  return configWebpay()?.ambiente === 'produccion';
}

export function ambienteWebpay(): AmbienteWebpay | null {
  return configWebpay()?.ambiente ?? null;
}

async function llamarWebpay(
  metodo: 'POST' | 'PUT' | 'GET',
  ruta: string,
  cuerpo?: Record<string, string | number>
): Promise<Record<string, unknown>> {
  const config = configWebpay();
  if (!config) throw new Error('Webpay no está habilitado.');

  const respuesta = await fetch(`${config.host}${ruta}`, {
    method: metodo,
    headers: {
      'Tbk-Api-Key-Id': config.codigoComercio,
      'Tbk-Api-Key-Secret': config.llaveSecreta,
      'Content-Type': 'application/json',
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    cache: 'no-store',
  });

  const data = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;
  if (!respuesta.ok) {
    const mensaje = (data as { error_message?: string }).error_message || JSON.stringify(data);
    throw new Error(`Webpay respondió ${respuesta.status}: ${mensaje}`);
  }
  return data;
}

/**
 * Orden de compra de UN intento de pago. Transbank exige que sea única por
 * transacción y de 26 caracteres como máximo, así que un reintento del mismo
 * pedido no puede reusar la anterior: va el número de pedido, un punto y la
 * hora en base 36 ("WEB-000031.mgk3x1a9", 19 caracteres).
 */
export function ordenDeCompraWebpay(numeroPedido: string): string {
  return `${numeroPedido}.${Date.now().toString(36)}`.slice(0, 26);
}

export interface TransaccionWebpayCreada {
  token: string;
  /** Formulario de pago de Transbank: se llega por POST con el token en `token_ws`. */
  url: string;
  ordenCompra: string;
}

export async function crearTransaccionWebpay(datos: {
  numeroPedido: string;
  /* Viaja como session_id y vuelve en TBK_ID_SESION cuando el cliente deja
     pasar el tiempo: en ese caso no llega token, y es lo único que permite
     encontrar su pedido. */
  tokenPublico: string;
  monto: number;
}): Promise<TransaccionWebpayCreada> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error('Falta NEXT_PUBLIC_SITE_URL (ver .env.local.example).');

  const ordenCompra = ordenDeCompraWebpay(datos.numeroPedido);
  const data = await llamarWebpay('POST', RUTA_TRANSACCIONES, {
    buy_order: ordenCompra,
    session_id: datos.tokenPublico,
    amount: Math.round(datos.monto),
    return_url: `${siteUrl.replace(/\/+$/, '')}/api/webpay/retorno`,
  });

  const token = String(data.token || '');
  const url = String(data.url || '');
  if (!/^[0-9a-f]{64}$/i.test(token) || !/^https:\/\//.test(url)) {
    throw new Error('Webpay no entregó un token válido.');
  }
  return { token, url, ordenCompra };
}

/** Respuesta de confirmar (commit) o consultar (status) una transacción. */
export interface ResultadoWebpay {
  status: string;
  response_code: number | null;
  amount: number;
  buy_order: string;
  session_id: string;
  authorization_code: string | null;
  payment_type_code: string | null;
  installments_number: number | null;
  installments_amount: number | null;
  transaction_date: string | null;
  card_number: string | null;
}

function normalizarResultado(data: Record<string, unknown>): ResultadoWebpay {
  const tarjeta = (data.card_detail || {}) as { card_number?: string };
  const numero = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v));
  return {
    status: String(data.status || ''),
    response_code: numero(data.response_code),
    amount: Number(data.amount) || 0,
    buy_order: String(data.buy_order || ''),
    session_id: String(data.session_id || ''),
    authorization_code: data.authorization_code ? String(data.authorization_code) : null,
    payment_type_code: data.payment_type_code ? String(data.payment_type_code) : null,
    installments_number: numero(data.installments_number),
    installments_amount: numero(data.installments_amount),
    transaction_date: data.transaction_date ? String(data.transaction_date) : null,
    card_number: tarjeta.card_number ? String(tarjeta.card_number).slice(-4) : null,
  };
}

/** Confirma el pago (PUT). Sin esto, Transbank reversa el cargo. */
export async function confirmarTransaccionWebpay(token: string): Promise<ResultadoWebpay> {
  return normalizarResultado(await llamarWebpay('PUT', `${RUTA_TRANSACCIONES}/${token}`));
}

/** Consulta sin confirmar (GET): para un retorno repetido o un pago anulado. */
export async function estadoTransaccionWebpay(token: string): Promise<ResultadoWebpay> {
  return normalizarResultado(await llamarWebpay('GET', `${RUTA_TRANSACCIONES}/${token}`));
}

/** Aprobado = autorizado Y código de respuesta 0. Las dos cosas, siempre. */
export function webpayAprobado(r: ResultadoWebpay): boolean {
  return r.status === 'AUTHORIZED' && r.response_code === 0;
}

/**
 * Tipo de pago en palabras, para el comprobante y para que el POS sepa qué
 * comisión corresponde. VD = débito, VP = prepago; el resto (VN, VC, SI, S2,
 * NC) son ventas con tarjeta de crédito, con o sin cuotas.
 */
export function tipoDePagoWebpay(codigo: string | null | undefined): 'DEBITO' | 'PREPAGO' | 'CREDITO' {
  if (codigo === 'VD') return 'DEBITO';
  if (codigo === 'VP') return 'PREPAGO';
  return 'CREDITO';
}

export function nombreTipoDePagoWebpay(codigo: string | null | undefined): string {
  const nombres: Record<string, string> = {
    VD: 'Débito',
    VP: 'Prepago',
    VN: 'Crédito, sin cuotas',
    VC: 'Crédito, en cuotas',
    SI: 'Crédito, 3 cuotas sin interés',
    S2: 'Crédito, 2 cuotas sin interés',
    NC: 'Crédito, cuotas sin interés',
  };
  return nombres[codigo || ''] || 'Tarjeta';
}
