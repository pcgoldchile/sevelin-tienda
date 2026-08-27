import { createHmac } from 'crypto';

/**
 * Cliente de Flow (pasarela de pago) — ver README-ECOMMERCE-SEVELIN.md
 * sección 6. Server-only (usa FLOW_SECRET_KEY): nunca se importa desde
 * código 'use client'.
 *
 * `crearPagoFlow()` / `firmarParametrosFlow()` — VERIFICADOS contra el
 * sandbox real (26-08-2026, con credenciales del usuario): la firma
 * original (basada en el README maestro, "clave=valor") daba "Invalid
 * Signature"; la correcta, confirmada contra
 * developers.flow.cl/en/docs/tutorial-basics/create-order, concatena
 * "claveValor" SIN el "=". `POST /payment/create` respondió 200 con
 * `url`/`token`/`flowOrder` reales tras el fix. Dato suelto: Flow rechaza
 * emails con pinta de prueba (`test@...`) como inválidos — usar un email
 * de aspecto real al probar.
 *
 * TODO pendiente — sin verificar: `obtenerEstadoPagoFlow()` (getStatus) y
 * los códigos de `FLOW_ESTADO_PAGADO` siguen sin probarse contra un pago
 * real completado (hace falta pasar por el checkout de Flow de principio a
 * fin, no solo crear la orden). Verificar antes del primer pago real.
 */

const FLOW_API_BASE = process.env.FLOW_API_BASE || 'https://sandbox.flow.cl/api';

function credencialesFlow(): { apiKey: string; secretKey: string } {
  const apiKey = process.env.FLOW_API_KEY;
  const secretKey = process.env.FLOW_SECRET_KEY;
  if (!apiKey || !secretKey) {
    throw new Error('Faltan FLOW_API_KEY / FLOW_SECRET_KEY (ver .env.local.example).');
  }
  return { apiKey, secretKey };
}

/**
 * Firma de Flow: ordenar los parámetros alfabéticamente por nombre de
 * clave, concatenar "claveValor" (SIN "=" ni separador entre pares — ej.
 * "amount5000apiKeyXXXcurrencyCLP") y firmar con HMAC-SHA256 usando el
 * secretKey del comercio. Verificado contra developers.flow.cl/en/docs/
 * tutorial-basics/create-order (el README maestro decía "clave=valor", que
 * es incorrecto — quedó corregido tras probar contra el sandbox real y
 * recibir "Invalid Signature").
 */
function firmarParametrosFlow(params: Record<string, string>, secretKey: string): string {
  const claves = Object.keys(params).sort();
  const cadena = claves.map((clave) => `${clave}${params[clave]}`).join('');
  return createHmac('sha256', secretKey).update(cadena).digest('hex');
}

async function llamarFlow(
  ruta: string,
  params: Record<string, string>,
  metodo: 'GET' | 'POST'
): Promise<Record<string, unknown>> {
  const { apiKey, secretKey } = credencialesFlow();
  const parametrosCompletos = { ...params, apiKey };
  const firma = firmarParametrosFlow(parametrosCompletos, secretKey);
  const cuerpo = new URLSearchParams({ ...parametrosCompletos, s: firma });

  const url = metodo === 'GET' ? `${FLOW_API_BASE}${ruta}?${cuerpo.toString()}` : `${FLOW_API_BASE}${ruta}`;
  const respuesta = await fetch(url, {
    method: metodo,
    headers: metodo === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
    body: metodo === 'POST' ? cuerpo : undefined,
  });

  const data = await respuesta.json();
  if (!respuesta.ok) {
    const mensaje = (data as { message?: string })?.message || JSON.stringify(data);
    throw new Error(`Flow respondió ${respuesta.status}: ${mensaje}`);
  }
  return data;
}

export interface PagoFlowCreado {
  url: string;
  token: string;
  flowOrder: number;
}

/**
 * Crea la orden de pago en Flow (README sección 6, paso 1). `urlConfirmation`
 * es nuestro webhook (POST /api/flow-webhook, servidor a servidor);
 * `urlReturn` es donde Flow devuelve al cliente en el navegador tras pagar.
 */
export async function crearPagoFlow(datos: {
  numeroPedido: string;
  monto: number;
  email: string;
}): Promise<PagoFlowCreado> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error('Falta NEXT_PUBLIC_SITE_URL (ver .env.local.example).');

  const data = await llamarFlow(
    '/payment/create',
    {
      commerceOrder: datos.numeroPedido,
      subject: `Pedido ${datos.numeroPedido} — Sevelin`,
      currency: 'CLP',
      amount: String(Math.round(datos.monto)),
      email: datos.email,
      urlConfirmation: `${siteUrl}/api/flow-webhook`,
      urlReturn: `${siteUrl}/pedido/${datos.numeroPedido}`,
    },
    'POST'
  );

  return {
    url: data.url as string,
    token: data.token as string,
    flowOrder: data.flowOrder as number,
  };
}

/**
 * Códigos de estado documentados por Flow (1 pendiente, 2 pagado,
 * 3 rechazado, 4 anulado) — SIN VERIFICAR contra la API real esta sesión,
 * ver el TODO al inicio del archivo.
 */
export const FLOW_ESTADO_PAGADO = 2;

export interface EstadoPagoFlow {
  status: number;
  commerceOrder: string;
  [clave: string]: unknown;
}

/**
 * Consulta el estado real de un pago con credenciales PROPIAS (README
 * sección 6, paso 4: el body del webhook nunca se usa como prueba de pago,
 * solo dispara esta consulta).
 */
export async function obtenerEstadoPagoFlow(token: string): Promise<EstadoPagoFlow> {
  const data = await llamarFlow('/payment/getStatus', { token }, 'GET');
  return data as EstadoPagoFlow;
}
