import { emitirBoleta, openFacturaHabilitada } from './openfactura';
import { ajustarStockPos, registrarVentaWebEnPos } from './pos-interno';
import { anotarReservasDePedido } from './avisos-producto';
import { acreditarPuntosPedidoWeb } from './puntos';
import { guardarDatosBoleta, marcarErrorStockSinDespacho, marcarPedidoPagado, obtenerPedidoPorNumero } from './pedidos';
import { correoAlertaPedidoExpiradoPagado, correoAlertaStockSinDespacho, correoConfirmacionPedido } from './correo-pedido';
import { obtenerImagenesPorProductoPosId } from './catalogo';
import { enviarCorreo } from './resend';
import type { PedidoWeb } from './tipos';

/** A dónde avisar cuando algo de un pago necesita ojos humanos. */
export function correoDeAlertas(): string {
  return process.env.ALERTA_STOCK_EMAIL || process.env.NEXT_PUBLIC_PRIVACIDAD_EMAIL || 'sevelin.contacto@gmail.com';
}

export type ResultadoPagoConfirmado =
  /** Pasó de CREADO a PAGADO en esta llamada y se hizo todo lo demás. */
  | { resultado: 'procesado'; pedido: PedidoWeb; sinStock: boolean }
  /** Ya no estaba en CREADO: otro aviso del mismo pago llegó antes (o está anulado). */
  | { resultado: 'ya_procesado'; pedido: PedidoWeb }
  | { resultado: 'no_encontrado' };

/**
 * LO QUE PASA CUANDO UN PAGO QUEDA CONFIRMADO, en un solo lugar.
 * ------------------------------------------------------------
 * La usan los dos pagos con tarjeta (supabase/42): el retorno de Webpay y el
 * botón "Confirmar pago" del POS para el link de Haulmer. Es la misma
 * secuencia que ya corre en POST /api/khipu-webhook, que se dejó como está
 * (cobra en producción y no se toca sin motivo):
 *
 *   1. CREADO → PAGADO, condicionado al estado. Es el candado: si el mismo
 *      pago se avisa dos veces, la segunda no encuentra el pedido en CREADO y
 *      no se descuenta stock ni se manda el correo otra vez.
 *   2. La venta queda anotada en el POS (nunca lanza: es registro, no cobro).
 *   3. Se descuenta el stock (o se anota la reserva de algo por llegar). Si no
 *      alcanza, el pedido queda en ERROR_STOCK_SIN_DESPACHO y se avisa al
 *      dueño: la plata ya entró y nadie reembolsa solo.
 *   4. Correo de confirmación al cliente, con las fotos.
 *   5. Boleta, si la emisión automática está encendida.
 *
 * Quien llama YA comprobó que el pago es real (Transbank lo autorizó, o el
 * dueño lo vio en su cuenta). Esta función no decide si se pagó.
 */
export async function procesarPagoConfirmado(numeroPedido: string, origen: string): Promise<ResultadoPagoConfirmado> {
  const pedido = await marcarPedidoPagado(numeroPedido);

  if (!pedido) {
    const existente = await obtenerPedidoPorNumero(numeroPedido).catch(() => null);
    if (!existente) return { resultado: 'no_encontrado' };

    /* Se pagó un pedido que el cron ya había dado por vencido: hay plata de
       por medio y un pedido que nadie va a preparar. Se avisa, no se arregla solo. */
    if (existente.estado === 'EXPIRADO') {
      const { subject, html } = correoAlertaPedidoExpiradoPagado(existente);
      await enviarCorreo({ to: correoDeAlertas(), subject, html }).catch(() => {});
    }
    return { resultado: 'ya_procesado', pedido: existente };
  }

  await registrarVentaWebEnPos(pedido);
  // Puntos Sevelin (supabase/47): nunca lanza.
  await acreditarPuntosPedidoWeb(pedido);

  let sinStock = false;
  try {
    await ajustarStockPos(pedido.items);
    await anotarReservasDePedido(pedido);
  } catch (err) {
    sinStock = true;
    const detalleTecnico = err instanceof Error ? err.message : String(err);
    console.error(`[${origen}] ${numeroPedido}: ALERTA — pago cobrado, sin stock para despachar:`, detalleTecnico);

    await marcarErrorStockSinDespacho(numeroPedido, detalleTecnico).catch((errMarcar) => {
      console.error(
        `[${origen}] ${numeroPedido}: además falló al marcar ERROR_STOCK_SIN_DESPACHO (queda en PAGADO sin la alerta visible, revisar a mano):`,
        errMarcar instanceof Error ? errMarcar.message : errMarcar
      );
    });

    const { subject, html } = correoAlertaStockSinDespacho(pedido, detalleTecnico);
    await enviarCorreo({ to: correoDeAlertas(), subject, html }).catch(() => {});
  }

  if (pedido.cliente_email) {
    try {
      // Sin fotos el correo sale igual: una miniatura que falta no frena la confirmación.
      const imagenes = await obtenerImagenesPorProductoPosId(pedido.items.map((it) => it.producto_pos_id)).catch(() => ({}));
      const { subject, html } = correoConfirmacionPedido(pedido, imagenes);
      await enviarCorreo({ to: pedido.cliente_email, subject, html });
    } catch (err) {
      console.error(`[${origen}] ${numeroPedido}: no se pudo enviar el correo de confirmación:`, err instanceof Error ? err.message : err);
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
      console.error(`[${origen}] ${numeroPedido}: no se pudo emitir la boleta:`, err instanceof Error ? err.message : err);
    }
  }

  return { resultado: 'procesado', pedido, sinStock };
}
