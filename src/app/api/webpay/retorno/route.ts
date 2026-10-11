import { NextRequest, NextResponse } from 'next/server';
import {
  ambienteWebpay,
  confirmarTransaccionWebpay,
  estadoTransaccionWebpay,
  tipoDePagoWebpay,
  webpayAprobado,
  webpayHabilitado,
  type ResultadoWebpay,
} from '@/lib/webpay';
import { guardarDetallePago, obtenerPedidoPorTokenWebpay } from '@/lib/pedidos';
import { correoDeAlertas, procesarPagoConfirmado } from '@/lib/pago-confirmado';
import { enviarCorreo } from '@/lib/resend';
import { escaparHtml } from '@/lib/escapar-html';
import type { PagoDetalle, PedidoWeb } from '@/lib/tipos';

export const maxDuration = 60;

/**
 * return_url de Webpay Plus: acá vuelve el cliente desde el formulario de pago
 * de Transbank, y acá se CONFIRMA el cobro. No hay webhook: si esta ruta no
 * llama a confirmar, Transbank reversa el cargo solo.
 *
 * Llega por GET (API 1.1 en adelante) o por POST (pago anulado en el ambiente
 * de integración), con una de estas combinaciones:
 *
 *   token_ws                              terminó: aprobado o rechazado
 *   TBK_TOKEN + TBK_ORDEN_COMPRA + …      apretó "anular" en el formulario
 *   TBK_ORDEN_COMPRA + TBK_ID_SESION      se le acabó el tiempo (sin token)
 *   token_ws + TBK_TOKEN + …              error en el formulario: no se pagó
 *
 * Siempre termina en la página del pedido, que es la que le cuenta al cliente
 * qué pasó (`?pago=` dice el motivo cuando no quedó pagado). Nunca se muestra
 * un error crudo: quien llega acá acaba de poner los datos de su tarjeta.
 */
type MotivoNoPagado = 'rechazado' | 'anulado' | 'tiempo' | 'error' | 'revisar';

function irA(req: NextRequest, ruta: string): NextResponse {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/+$/, '');
  // 303: aunque Transbank haya llegado por POST, el navegador sigue con un GET.
  return NextResponse.redirect(`${base}${ruta}`, 303);
}

function irAlPedido(req: NextRequest, tokenPublico: string, motivo?: MotivoNoPagado): NextResponse {
  return irA(req, `/pedido/${tokenPublico}${motivo ? `?pago=${motivo}` : ''}`);
}

/** Plata autorizada que no se pudo dejar registrada: lo ve una persona, hoy. */
async function avisarPagoPorRevisar(pedido: PedidoWeb, r: ResultadoWebpay, motivo: string): Promise<void> {
  console.error(`[webpay] ${pedido.numero_pedido}: PAGO AUTORIZADO SIN REGISTRAR — ${motivo}`, r);
  const html = `
    <p>Transbank autorizó un pago con tarjeta, pero el pedido <strong>${escaparHtml(pedido.numero_pedido)}</strong> no quedó registrado como pagado.</p>
    <p><strong>Motivo:</strong> ${escaparHtml(motivo)}</p>
    <p>Monto autorizado: $${Math.round(r.amount).toLocaleString('es-CL')} · Total del pedido: $${Math.round(pedido.total).toLocaleString('es-CL')}<br>
    Orden de compra: ${escaparHtml(r.buy_order)} · Código de autorización: ${escaparHtml(r.authorization_code || 'sin código')}</p>
    <p>Cliente: ${escaparHtml([pedido.cliente_nombre, pedido.cliente_apellido].filter(Boolean).join(' '))} · ${escaparHtml(pedido.cliente_telefono || '')} · ${escaparHtml(pedido.cliente_email || '')}</p>
    <p>Revisa el pago en el portal de Transbank y el pedido en el POS (Página Web → Pedidos Web). Nada se reembolsó ni se despachó solo.</p>`;
  await enviarCorreo({
    to: correoDeAlertas(),
    subject: `⚠️ Pago con tarjeta por revisar — pedido ${pedido.numero_pedido}`,
    html,
  }).catch(() => {});
}

async function manejar(req: NextRequest, p: Record<string, string>): Promise<NextResponse> {
  const tokenWs = (p.token_ws || '').trim();
  const tokenAnulado = (p.TBK_TOKEN || '').trim();
  const sesion = (p.TBK_ID_SESION || '').trim();

  if (!webpayHabilitado()) return irA(req, '/');

  // Anuló en el formulario, o el formulario falló: no hay nada que confirmar.
  if (tokenAnulado) {
    const pedido = await obtenerPedidoPorTokenWebpay(tokenAnulado).catch(() => null);
    return pedido ? irAlPedido(req, pedido.token_publico, 'anulado') : irA(req, '/carrito');
  }

  // Se le acabó el tiempo: no llega token; la sesión es la llave pública del pedido.
  if (!tokenWs) {
    return /^[0-9a-f]{32}$/.test(sesion) ? irAlPedido(req, sesion, 'tiempo') : irA(req, '/carrito');
  }

  const pedido = await obtenerPedidoPorTokenWebpay(tokenWs).catch(() => null);
  // Un token que no es de ningún pedido nuestro no se confirma.
  if (!pedido) return irA(req, '/carrito');

  let r: ResultadoWebpay;
  try {
    r = await confirmarTransaccionWebpay(tokenWs);
  } catch (errConfirmar) {
    /* Lo normal acá es una recarga de esta misma dirección: la transacción ya
       se confirmó en la primera pasada y Transbank no deja confirmarla dos
       veces. Se consulta cómo quedó en vez de dar el pago por perdido. */
    try {
      r = await estadoTransaccionWebpay(tokenWs);
    } catch {
      console.error(`[webpay] ${pedido.numero_pedido}: no se pudo confirmar ni consultar:`, errConfirmar instanceof Error ? errConfirmar.message : errConfirmar);
      return irAlPedido(req, pedido.token_publico, 'error');
    }
  }

  const detalle: PagoDetalle = {
    origen: 'WEBPAY',
    tipo: tipoDePagoWebpay(r.payment_type_code),
    orden_compra: r.buy_order,
    codigo_autorizacion: r.authorization_code,
    tipo_pago_codigo: r.payment_type_code,
    cuotas: r.installments_number,
    monto_cuota: r.installments_amount,
    tarjeta: r.card_number,
    fecha: r.transaction_date,
    ambiente: ambienteWebpay() ?? undefined,
  };

  if (!webpayAprobado(r)) {
    // El pedido sigue esperando pago: puede reintentar con otra tarjeta.
    await guardarDetallePago(pedido.numero_pedido, {
      origen: 'WEBPAY',
      orden_compra: pedido.pago_detalle?.orden_compra,
      rechazo: { en: new Date().toISOString(), codigo: r.response_code, estado: r.status },
    }).catch(() => {});
    return irAlPedido(req, pedido.token_publico, 'rechazado');
  }

  /* "El comercio debe verificar que los valores informados por Transbank
     (monto, orden de compra) coinciden con los que entregó al principio"
     (documentación de Transbank). Si no calzan, la plata quedó autorizada
     pero no es de este pedido tal como está: lo resuelve una persona. */
  const calza =
    Math.round(r.amount) === Math.round(pedido.total) &&
    r.buy_order === pedido.pago_detalle?.orden_compra &&
    r.session_id === pedido.token_publico;
  if (!calza) {
    await avisarPagoPorRevisar(pedido, r, 'El monto o la orden de compra que informó Transbank no calzan con el pedido.');
    return irAlPedido(req, pedido.token_publico, 'revisar');
  }

  try {
    await guardarDetallePago(pedido.numero_pedido, detalle, { confirmado: true });
    await procesarPagoConfirmado(pedido.numero_pedido, 'webpay');
  } catch (err) {
    await avisarPagoPorRevisar(pedido, r, `No se pudo guardar el pedido como pagado: ${err instanceof Error ? err.message : String(err)}`);
    return irAlPedido(req, pedido.token_publico, 'revisar');
  }

  return irAlPedido(req, pedido.token_publico);
}

export async function GET(req: NextRequest) {
  return manejar(req, Object.fromEntries(req.nextUrl.searchParams));
}

export async function POST(req: NextRequest) {
  const p: Record<string, string> = Object.fromEntries(req.nextUrl.searchParams);
  const formulario = await req.formData().catch(() => null);
  formulario?.forEach((valor, clave) => {
    if (typeof valor === 'string') p[clave] = valor;
  });
  return manejar(req, p);
}
