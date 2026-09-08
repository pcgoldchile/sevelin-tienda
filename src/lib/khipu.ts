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
 * Verifica la cabecera `x-khipu-signature` de una notificación de pago
 * (formato "t=<timestamp-ms>,s=<hmac-base64>"). La firma es un HMAC-SHA256
 * en base64 sobre el string "<timestamp>.<cuerpo-crudo-del-POST>", usando
 * la API key como secreto — ver developers.khipu.com, sección "Webhook
 * para notificaciones". IMPORTANTE: `cuerpoCrudo` debe ser el texto tal
 * cual llegó en el POST, sin re-serializar el JSON (Khipu firma los bytes
 * exactos que envió).
 */
export function verificarFirmaWebhookKhipu(cabecera: string | null, cuerpoCrudo: string): boolean {
  if (!cabecera) return false;

  const partes = Object.fromEntries(
    cabecera.split(',').map((par) => {
      const [clave, valor] = par.split('=');
      return [clave, valor];
    })
  );
  const timestamp = partes.t;
  const firmaRecibida = partes.s;
  if (!timestamp || !firmaRecibida) return false;

  const apiKey = apiKeyKhipu();
  const firmaEsperada = createHmac('sha256', apiKey)
    .update(`${timestamp}.${cuerpoCrudo}`)
    .digest('base64');

  return firmaEsperada === firmaRecibida;
}
