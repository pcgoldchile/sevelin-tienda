import { NextRequest, NextResponse } from 'next/server';
import { FLOW_ESTADO_PAGADO, obtenerEstadoPagoFlow } from '@/lib/flow';
import { emitirBoleta, openFacturaHabilitada } from '@/lib/openfactura';
import { ajustarStockPos } from '@/lib/pos-interno';
import { guardarDatosBoleta, marcarPedidoPagado, obtenerPedidoPorNumero } from '@/lib/pedidos';

// Regla dura de Flow (README sección 6, paso 3): responder 200 en menos de
// 15s. maxDuration necesita plan Vercel Pro para superar los 10s del plan
// Hobby — no aplica hasta que exista el proyecto Vercel real (ver
// docs/SNAPSHOT.md).
export const maxDuration = 60;

/**
 * urlConfirmation de Flow. El body del POST NUNCA se usa como prueba de
 * pago (cualquiera puede hacer POST a una URL pública): solo dispara una
 * consulta a getStatus con nuestras propias credenciales (README sección
 * 6, paso 4).
 */
export async function POST(req: NextRequest) {
  let token: string | null = null;
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      token = body?.token || null;
    } else {
      const form = await req.formData();
      token = (form.get('token') as string) || null;
    }
  } catch {
    // cuerpo ilegible: no hay token que verificar, se responde 200 igual
    // (Flow no debe reintentar por esto — no es una confirmación válida).
  }

  if (!token) return NextResponse.json({ ok: true, motivo: 'sin_token' });

  let estado;
  try {
    estado = await obtenerEstadoPagoFlow(token);
  } catch (err) {
    console.error('[flow-webhook] No se pudo confirmar el pago con Flow:', err instanceof Error ? err.message : err);
    // Se responde 200 igual: si el error es transitorio, Flow reintentará
    // el webhook más tarde; nuestro propio 500 aquí no cambia eso.
    return NextResponse.json({ ok: true, motivo: 'error_getStatus' });
  }

  if (estado.status !== FLOW_ESTADO_PAGADO) {
    return NextResponse.json({ ok: true, motivo: 'no_pagado', status: estado.status });
  }

  const numeroPedido = estado.commerceOrder;

  // Mutex contra reintentos del webhook: si esto no afecta ninguna fila,
  // el pedido ya se procesó (o no existe) y no se repite nada más abajo.
  const pedido = await marcarPedidoPagado(numeroPedido).catch((err) => {
    console.error('[flow-webhook] No se pudo marcar el pedido como pagado:', err.message);
    return null;
  });

  if (!pedido) {
    const yaExistente = await obtenerPedidoPorNumero(numeroPedido).catch(() => null);
    return NextResponse.json({
      ok: true,
      motivo: yaExistente ? 'ya_procesado' : 'pedido_no_encontrado',
    });
  }

  // El pago ya está capturado y el pedido en PAGADO. Un fallo desde acá en
  // adelante (POS caído, OpenFactura caído) queda logueado fuerte para
  // revisión manual — no hay panel de reconciliación en esta fase, es una
  // limitación conocida (ver docs/SNAPSHOT.md), no un fallo silencioso.
  try {
    await ajustarStockPos(pedido.items);
  } catch (err) {
    console.error(`[flow-webhook] ${numeroPedido}: no se pudo ajustar stock en el POS:`, err instanceof Error ? err.message : err);
  }

  // OpenFactura está deshabilitado a propósito (costo mensual, decisión del
  // negocio — ver src/lib/openfactura.ts): el comprobante de pago de Flow
  // respalda la venta, y boleta/factura se emite manual si el cliente la
  // pide. No es un error ni algo que loguear como falla en cada pago.
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
      console.error(`[flow-webhook] ${numeroPedido}: no se pudo emitir la boleta:`, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ ok: true, motivo: 'procesado', numero_pedido: numeroPedido });
}
