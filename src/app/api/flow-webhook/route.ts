import { NextRequest, NextResponse } from 'next/server';
import { FLOW_ESTADO_PAGADO, obtenerEstadoPagoFlow } from '@/lib/flow';
import { emitirBoleta, openFacturaHabilitada } from '@/lib/openfactura';
import { ajustarStockPos } from '@/lib/pos-interno';
import {
  guardarDatosBoleta,
  marcarErrorStockSinDespacho,
  marcarPedidoPagado,
  obtenerPedidoPorNumero,
} from '@/lib/pedidos';
import { correoAlertaStockSinDespacho, correoConfirmacionPedido } from '@/lib/correo-pedido';
import { enviarCorreo } from '@/lib/resend';

/**
 * A dónde avisar cuando un pago se cobra pero no hay stock (ver el bloque
 * ajustarStockPos más abajo). Mismo criterio que /privacidad con
 * NEXT_PUBLIC_PRIVACIDAD_EMAIL: valor por defecto real en el código para
 * que SIEMPRE haya un canal, la variable solo lo sobreescribe si el dueño
 * quiere mandarlo a otro correo específico para esto.
 */
function obtenerCorreoAlertaStock(): string {
  return process.env.ALERTA_STOCK_EMAIL || process.env.NEXT_PUBLIC_PRIVACIDAD_EMAIL || 'sevelin.contacto@gmail.com';
}

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
  // revisión manual.
  //
  // CASO ESPECIAL — sobreventa (Reporte de Seguridad Consolidado B,
  // hallazgo #4): dos checkouts casi simultáneos de la última unidad
  // pueden pagar los dos en Flow, pero el descuento de stock en el POS es
  // atómico (descontarStockNoLotes, con FOR UPDATE) — el primero gana, el
  // segundo recibe STOCK_INSUFICIENTE (409). ANTES ese error solo se
  // logueaba y el pedido quedaba en PAGADO como cualquier otro, sin
  // ninguna señal de que hay dinero cobrado sin producto para entregar.
  //
  // El sistema NUNCA reembolsa ni cancela por su cuenta acá — Flow no
  // tiene una integración de reembolsos en este proyecto, y automatizar
  // el movimiento de dinero de un cliente sin revisión humana es un riesgo
  // mayor que el problema que resuelve (decisión explícita del dueño). En
  // vez de eso: el pedido queda marcado ERROR_STOCK_SIN_DESPACHO (visible
  // en el panel "Pedidos Web" del POS, inconfundible con un pedido
  // normal) y se manda una alerta por correo — la decisión de reembolsar,
  // conseguir el producto u ofrecer un cambio queda en manos del dueño.
  try {
    await ajustarStockPos(pedido.items);
  } catch (err) {
    const detalleTecnico = err instanceof Error ? err.message : String(err);
    console.error(`[flow-webhook] ${numeroPedido}: ALERTA — pago cobrado, sin stock para despachar:`, detalleTecnico);

    await marcarErrorStockSinDespacho(numeroPedido, detalleTecnico).catch((errMarcar) => {
      console.error(
        `[flow-webhook] ${numeroPedido}: además falló al marcar ERROR_STOCK_SIN_DESPACHO ` +
          '(el pedido queda en PAGADO sin la alerta visible, revisar a mano):',
        errMarcar instanceof Error ? errMarcar.message : errMarcar
      );
    });

    // Mejor esfuerzo, igual que el resto de los envíos de este archivo: si
    // Resend falla, el error ya quedó logueado arriba y el pedido ya quedó
    // marcado en la base — no es la única forma de enterarse.
    const { subject, html } = correoAlertaStockSinDespacho(pedido, detalleTecnico);
    await enviarCorreo({ to: obtenerCorreoAlertaStock(), subject, html }).catch(() => {});
  }

  // Correo de confirmación — mejor esfuerzo, igual que el ajuste de stock
  // de arriba: si Resend falla (sin dominio verificado, por ejemplo) no
  // debe frenar el pedido ya pagado. Sin cliente_email (pedido antiguo o
  // dato incompleto) simplemente no hay a quién mandarlo.
  if (pedido.cliente_email) {
    try {
      const { subject, html } = correoConfirmacionPedido(pedido);
      await enviarCorreo({ to: pedido.cliente_email, subject, html });
    } catch (err) {
      console.error(`[flow-webhook] ${numeroPedido}: no se pudo enviar el correo de confirmación:`, err instanceof Error ? err.message : err);
    }
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
