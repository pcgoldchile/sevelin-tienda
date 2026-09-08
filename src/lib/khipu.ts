import { createHmac } from 'crypto';

/**
 * Cliente de Khipu (pasarela de pago por transferencia bancaria) — segundo
 * medio de pago del checkout, en paralelo a Flow (ver src/lib/flow.ts).
 * Server-only (usa KHIPU_API_KEY): nunca se importa desde código 'use client'.
 *
 * A diferencia de Flow, Khipu NO tiene un dominio de sandbox separado: es
 * la misma API (https://payment-api.khipu.com) para pruebas y producción —
 * la diferencia la da la cuenta de cobro detrás de la API key ("modo
 * desarrollador", con bancos ficticios, vs. cuenta regular con bancos
 * reales). Ver developers.khipu.com, sección "Integración Khipu".
 *
 * SIN VERIFICAR contra la API real todavía (03-09-2026): implementado a
 * partir de la documentación mientras se esperan las credenciales de la
 * cuenta de cobro. Antes del primer pago real hay que probar de punta a
 * punta: crear un cobro, pagarlo con la cuenta en modo desarrollador, y
 * confirmar que khipuHabilitado()/crearPagoKhipu()/obtenerEstadoPagoKhipu()
 * responden como se espera.
 */

const KHIPU_API_BASE = 'https://payment-api.khipu.com';

/** Igual que openFacturaHabilitada() (src/lib/openfactura.ts): permite que
 * el checkout no ofrezca Khipu como opción mientras no haya credenciales
 * configuradas, sin que eso sea un error. */
export function khipuHabilitado(): boolean {
  return !!process.env.KHIPU_API_KEY;
}

function apiKeyKhipu(): string {
  const apiKey = process.env.KHIPU_API_KEY;
  if (!apiKey) throw new Error('Falta KHIPU_API_KEY (ver .env.local.example).');
  return apiKey;
}

async function llamarKhipu(
  ruta: string,
  metodo: 'GET' | 'POST' | 'DELETE',
  cuerpo?: Record<string, string | number | boolean>
): Promise<Record<string, unknown>> {
  const apiKey = apiKeyKhipu();

  const respuesta = await fetch(`${KHIPU_API_BASE}${ruta}`, {
    method: metodo,
    headers: {
      'x-api-key': apiKey,
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });

  const data = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const mensaje = (data as { message?: string })?.message || JSON.stringify(data);
    throw new Error(`Khipu respondió ${respuesta.status}: ${mensaje}`);
  }
  return data;
}

export interface PagoKhipuCreado {
  paymentId: string;
  url: string;
}

/**
 * Crea el cobro en Khipu (POST /v3/payments) y devuelve la URL de pago
 * (payment_url — muestra las opciones de banco si el cliente aún no eligió
 * una). `transaction_id` se guarda como el numero_pedido: es lo que
 * permite cruzar la notificación del webhook con nuestro pedido sin
 * depender solo del payment_id.
 */
export async function crearPagoKhipu(datos: {
  numeroPedido: string;
  monto: number;
  email: string;
}): Promise<PagoKhipuCreado> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error('Falta NEXT_PUBLIC_SITE_URL (ver .env.local.example).');

  const data = await llamarKhipu('/v3/payments', 'POST', {
    amount: Math.round(datos.monto),
    currency: 'CLP',
    subject: `Pedido ${datos.numeroPedido} — Sevelin`,
    transaction_id: datos.numeroPedido,
    payer_email: datos.email,
    return_url: `${siteUrl}/pedido/${datos.numeroPedido}`,
    cancel_url: `${siteUrl}/pedido/${datos.numeroPedido}`,
    notify_url: `${siteUrl}/api/khipu-webhook`,
    notify_api_version: '3.0',
  });

  return {
    paymentId: data.payment_id as string,
    url: data.payment_url as string,
  };
}

export const KHIPU_ESTADO_PAGADO = 'done';

export interface EstadoPagoKhipu {
  payment_id: string;
  status: string;
  transaction_id: string;
  [clave: string]: unknown;
}

/**
 * Consulta el estado real de un pago con credenciales PROPIAS (GET
 * /v3/payments/{id}) — mismo criterio que obtenerEstadoPagoFlow(): el body
 * del webhook nunca se usa por sí solo como prueba de pago, aunque venga
 * firmado (defensa en profundidad, ver verificarFirmaWebhookKhipu()).
 */
export async function obtenerEstadoPagoKhipu(paymentId: string): Promise<EstadoPagoKhipu> {
  const data = await llamarKhipu(`/v3/payments/${paymentId}`, 'GET');
  return data as EstadoPagoKhipu;
}

/**
 * Verifica la cabecera `x-khipu-signature` de una notificación de pago.
 * ------------------------------------------------------------
 * Formato: `t=<timestamp-ms>,s=<hmac-base64>`. La firma es un HMAC-SHA256
 * en base64 sobre el string `"<timestamp>.<cuerpo-crudo-del-POST>"`.
 * Verificado contra el vector de prueba oficial de la documentación
 * (docs.khipu.com → Instant Payments → Webhook for Notifications): con el
 * secreto, la cabecera y el cuerpo del ejemplo, este cálculo reproduce
 * exactamente la firma `rq08YUGSaWa1D0RAwhMnJTRHMNmY4ToCn2Gd6G9LaDg=`.
 *
 * `cuerpoCrudo` DEBE ser el texto tal cual llegó en el POST, sin
 * re-serializar el JSON: Khipu firma los bytes exactos que envió, y
 * volver a serializar puede cambiar orden de claves o escapes.
 *
 * DOS ERRORES QUE ESTA FUNCIÓN TUVO Y NO PUEDE VOLVER A TENER
 * (encontrados el 08-09-2026 probando contra el vector oficial, ANTES de
 * encender Khipu — los dos, por separado, rechazaban el 100% de las
 * notificaciones reales y habrían dejado pedidos pagados sin marcar):
 *
 * 1. `par.split('=')` para leer la cabecera **se come el `=` final del
 *    base64**. Un HMAC-SHA256 son 32 bytes → su base64 SIEMPRE termina en
 *    un `=` de relleno, así que la comparación fallaba siempre. Hay que
 *    cortar en el PRIMER `=` y quedarse con todo el resto.
 *
 * 2. El secreto de la firma **no es la API key** (el UUID de `x-api-key`),
 *    sino la *llave de cobrador* del panel (40 caracteres hexadecimales)
 *    — el ejemplo de la documentación usa justamente ese formato. Como la
 *    documentación dice "merchant secret" sin nombrar el campo del panel,
 *    acá se aceptan las dos y se registra en el log cuál calzó: el primer
 *    pago real deja la respuesta por escrito. Aceptar ambas no debilita
 *    nada — las dos son secretos que solo Khipu y nosotros conocemos.
 */
export function verificarFirmaWebhookKhipu(cabecera: string | null, cuerpoCrudo: string): boolean {
  if (!cabecera) return false;

  const partes: Record<string, string> = {};
  for (const par of cabecera.split(',')) {
    const corte = par.indexOf('=');
    if (corte === -1) continue;
    partes[par.slice(0, corte).trim()] = par.slice(corte + 1);
  }

  const timestamp = partes.t;
  const firmaRecibida = partes.s;
  if (!timestamp || !firmaRecibida) return false;

  const firmar = (secreto: string) =>
    createHmac('sha256', secreto).update(`${timestamp}.${cuerpoCrudo}`).digest('base64');

  const secretoCobrador = process.env.KHIPU_SECRET?.trim();
  if (secretoCobrador && firmar(secretoCobrador) === firmaRecibida) {
    console.info('[khipu] firma válida con KHIPU_SECRET (llave de cobrador)');
    return true;
  }

  /* apiKeyKhipu() LANZA si falta la variable. Acá eso no puede propagarse:
     esta función la llama el webhook antes de cualquier try/catch, así que
     una excepción se convertiría en un 500 y Khipu reintentaría el mismo
     pago una y otra vez. Un verificador de firma responde sí o no; si no
     hay con qué verificar, la respuesta es no. */
  let apiKey: string | null = null;
  try {
    apiKey = apiKeyKhipu();
  } catch {
    apiKey = null;
  }
  if (apiKey && firmar(apiKey) === firmaRecibida) {
    console.info('[khipu] firma válida con KHIPU_API_KEY');
    return true;
  }

  console.error(
    '[khipu] firma inválida.',
    secretoCobrador
      ? 'No calzó ni con la llave de cobrador ni con la API key.'
      : 'Solo se probó con la API key: falta definir KHIPU_SECRET (llave de cobrador) en las variables de entorno.'
  );
  return false;
}
