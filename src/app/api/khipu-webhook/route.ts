import { NextRequest, NextResponse } from 'next/server';
import { KHIPU_ESTADO_PAGADO, obtenerEstadoPagoKhipu, verificarFirmaWebhookKhipu } from '@/lib/khipu';
import { emitirBoleta, openFacturaHabilitada } from '@/lib/openfactura';
import { ajustarStockPos } from '@/lib/pos-interno';
import {
  guardarDatosBoleta,
  marcarErrorStockSinDespacho,
  marcarPedidoPagado,
  obtenerPedidoPorNumero,
} from '@/lib/pedidos';
import { correoAlertaPedidoExpiradoPagado, correoAlertaStockSinDespacho, correoConfirmacionPedido } from '@/lib/correo-pedido';
import { enviarCorreo } from '@/lib/resend';

/**
 * Mismo criterio que POST /api/flow-webhook (ver ese archivo para el
 * detalle de cada paso — la lógica de negocio de acá en adelante es
 * idéntica, solo cambia la pasarela): el ajuste de stock/boleta/correo es
 * provider-agnóstico, así que este webhook reutiliza exactamente las
 * mismas funciones de src/lib/pedidos.ts, src/lib/pos-interno.ts, etc.
 *
 * A dónde avisar cuando un pago se cobra pero no hay stock — mismo valor
 * por defecto que flow-webhook.
 */
function obtenerCorreoAlertaStock(): string {
  return process.env.ALERTA_STOCK_EMAIL || process.env.NEXT_PUBLIC_PRIVACIDAD_EMAIL || 'sevelin.contacto@gmail.com';
}

export const maxDuration = 60;

/**
 * notify_url de Khipu. A diferencia de Flow, el body de la notificación SÍ
 * viene firmado (cabecera x-khipu-signature, ver verificarFirmaWebhookKhipu)
 * y contiene los datos del pago directamente — pero, mismo criterio que
 * Flow, NUNCA se usa ese body como prueba de pago por sí solo: solo
 * dispara una consulta a GET /v3/payments/{id} con nuestras propias
 * credenciales. Esto además evita duplicar la lógica de parseo del status
 * en dos lugares (firma vs. estado real).
 *
 * IMPORTANTE: se lee el cuerpo con `.text()` (nunca `.json()`) porque la
 * verificación de firma necesita los bytes exactos que Khipu envió — volver
 * a serializar un JSON ya parseado puede no ser byte-a-byte idéntico
 * (orden de claves, espacios) y hacer fallar la verificación.
 */
export async function POST(req: NextRequest) {
  const cuerpoCrudo = await req.text();

  let paymentId: string | null = null;
  try {
    const body = JSON.parse(cuerpoCrudo);
    paymentId = body?.payment_id || null;
  } catch {
    return NextResponse.json({ ok: true, motivo: 'cuerpo_ilegible' });
  }

  if (!paymentId) return NextResponse.json({ ok: true, motivo: 'sin_payment_id' });

  const firmaValida = verificarFirmaWebhookKhipu(req.headers.get('x-khipu-signature'), cuerpoCrudo);
  if (!firmaValida) {
    console.error('[khipu-webhook] Firma inválida para payment_id:', paymentId);
    // Se responde 200 igual (no es una petición de Khipu si la firma no
    // calza — no tiene sentido que Khipu la reintente).
    return NextResponse.json({ ok: true, motivo: 'firma_invalida' });
  }

  let estado;
  try {
    estado = await obtenerEstadoPagoKhipu(paymentId);
  } catch (err) {
    console.error('[khipu-webhook] No se pudo confirmar el pago con Khipu:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: true, motivo: 'error_getPayment' });
  }

  if (estado.status !== KHIPU_ESTADO_PAGADO) {
    return NextResponse.json({ ok: true, motivo: 'no_pagado', status: estado.status });
  }

  const numeroPedido = estado.transaction_id;

  const pedido = await marcarPedidoPagado(numeroPedido).catch((err) => {
    console.error('[khipu-webhook] No se pudo marcar el pedido como pagado:', err.message);
    return null;
  });

  if (!pedido) {
    const yaExistente = await obtenerPedidoPorNumero(numeroPedido).catch(() => null);

    if (yaExistente?.estado === 'EXPIRADO') {
      const { subject, html } = correoAlertaPedidoExpiradoPagado(yaExistente);
      await enviarCorreo({ to: obtenerCorreoAlertaStock(), subject, html }).catch((err) => {
        console.error('[khipu-webhook] No se pudo enviar la alerta de pedido expirado con pago:', err instanceof Error ? err.message : err);
      });
    }

    return NextResponse.json({
      ok: true,
      motivo: yaExistente ? 'ya_procesado' : 'pedido_no_encontrado',
    });
  }

  try {
    await ajustarStockPos(pedido.items);
  } catch (err) {
    const detalleTecnico = err instanceof Error ? err.message : String(err);
    console.error(`[khipu-webhook] ${numeroPedido}: ALERTA — pago cobrado, sin stock para despachar:`, detalleTecnico);

    await marcarErrorStockSinDespacho(numeroPedido, detalleTecnico).catch((errMarcar) => {
      console.error(
        `[khipu-webhook] ${numeroPedido}: además falló al marcar ERROR_STOCK_SIN_DESPACHO ` +
          '(el pedido queda en PAGADO sin la alerta visible, revisar a mano):',
        errMarcar instanceof Error ? errMarcar.message : errMarcar
      );
    });

    const { subject, html } = correoAlertaStockSinDespacho(pedido, detalleTecnico);
    await enviarCorreo({ to: obtenerCorreoAlertaStock(), subject, html }).catch(() => {});
  }

  if (pedido.cliente_email) {
    try {
      const { subject, html } = correoConfirmacionPedido(pedido);
      await enviarCorreo({ to: pedido.cliente_email, subject, html });
    } catch (err) {
      console.error(`[khipu-webhook] ${numeroPedido}: no se pudo enviar el correo de confirmación:`, err instanceof Error ? err.message : err);
    }
  }

  if (openFacturaHabilitada()) {
    try {
      const boleta = await emitirBoleta({
        numeroPedido,
        clienteNombre: [pedido.cliente_nombre, pedido.cliente_apellido].filter(Boolean).join(' ') || 'Cliente',
        items: pedido.items,
        costoEnvio: pedido.costo_envio,
        total: pedido.total,
      });
      await guardarDatosBoleta(numeroPedido, boleta.folio, boleta.urlBoletaSii);
    } catch (err) {
      console.error(`[khipu-webhook] ${numeroPedido}: no se pudo emitir la boleta:`, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ ok: true, motivo: 'procesado', numero_pedido: numeroPedido });
}
