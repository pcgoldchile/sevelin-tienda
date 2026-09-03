import { DIRECCION_TIENDA } from './distancia';
import { formatoCLP } from './formato';
import { URL_RESENA_GOOGLE } from './resena-google';
import type { PedidoWeb } from './tipos';

const AZUL = '#2b3f66';
const TEXTO = '#1a1f29';
const TEXTO_SUAVE = '#5b6472';
const BORDE = '#e4e7ec';

function filaItem(nombre: string, cantidad: number, subtotal: number): string {
  return `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid ${BORDE};color:${TEXTO};font-size:14px;">${nombre} × ${cantidad}</td>
      <td style="padding:8px 0;border-bottom:1px solid ${BORDE};color:${TEXTO};font-size:14px;text-align:right;white-space:nowrap;">${formatoCLP.format(subtotal)}</td>
    </tr>`;
}

/** Envoltorio HTML compartido — mismo look simple para confirmación y cancelación,
 * sin depender de ningún CSS externo (el correo se renderiza aislado, cada cliente
 * de correo interpreta las reglas a su manera). */
function envoltorio(titulo: string, contenidoHtml: string): string {
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDE};">
        <tr><td style="background:${AZUL};padding:20px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.02em;">SEVELIN</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:${TEXTO};">${titulo}</h1>
          ${contenidoHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;background:${'#f9fafb'};border-top:1px solid ${BORDE};">
          <p style="margin:0;font-size:12px;color:${TEXTO_SUAVE};">Sevelin · Arica, Chile · Este es un correo automático, no respondas directamente a esta dirección.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Confirmación de pedido — se envía cuando Flow confirma el pago (ver
 * POST /api/flow-webhook). No incluye datos de pago ni de tarjeta: eso lo
 * respalda Flow directamente. */
export function correoConfirmacionPedido(pedido: PedidoWeb): { subject: string; html: string } {
  const nombre = pedido.cliente_nombre || 'Hola';
  const filas = pedido.items.map((it) => filaItem(it.nombre, it.cantidad, it.precio_web * it.cantidad)).join('');
  const metodo = pedido.metodo_envio === 'RETIRO'
    ? `Retiro en tienda (${DIRECCION_TIENDA})`
    : pedido.metodo_envio === 'LOCAL'
      ? `Despacho a domicilio en Arica — ${pedido.direccion_envio.calle} ${pedido.direccion_envio.numero}, ${pedido.direccion_envio.comuna}`
      : `Envío por Chilexpress — ${pedido.direccion_envio.calle} ${pedido.direccion_envio.numero}, ${pedido.direccion_envio.comuna}`;

  const contenido = `
    <p style="margin:0 0 16px;font-size:14px;color:${TEXTO_SUAVE};">${nombre}, recibimos tu pago. Este es el resumen de tu pedido <strong style="color:${TEXTO};">${pedido.numero_pedido}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${filas}
      <tr><td style="padding:10px 0 0;font-size:14px;color:${TEXTO_SUAVE};">Envío</td><td style="padding:10px 0 0;font-size:14px;color:${TEXTO};text-align:right;">${pedido.costo_envio === 0 ? 'Gratis' : formatoCLP.format(pedido.costo_envio)}</td></tr>
      <tr><td style="padding:6px 0 0;font-size:16px;font-weight:700;color:${TEXTO};">Total</td><td style="padding:6px 0 0;font-size:16px;font-weight:700;color:${TEXTO};text-align:right;">${formatoCLP.format(pedido.total)}</td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:${TEXTO_SUAVE};"><strong style="color:${TEXTO};">Entrega:</strong> ${metodo}</p>
  `;

  return {
    subject: `Confirmamos tu pedido ${pedido.numero_pedido} — Sevelin`,
    html: envoltorio('¡Gracias por tu compra!', contenido),
  };
}

/** Recordatorio de carrito abandonado — la manda el cron
 * (GET /api/cron/recordar-carritos) cuando el cliente dejó su correo en el
 * checkout pero no volvió a completar la compra dentro de 24h. Los items ya
 * vienen resueltos contra el catálogo real (nombre/precio vigentes), nunca
 * "congelados" del momento en que dejó el correo. */
export function correoCarritoAbandonado(items: { nombre: string; cantidad: number; precio_web: number }[]): { subject: string; html: string } {
  const filas = items.map((it) => filaItem(it.nombre, it.cantidad, it.precio_web * it.cantidad)).join('');
  const urlTienda = process.env.NEXT_PUBLIC_SITE_URL || 'https://sevelin.cl';
  const contenido = `
    <p style="margin:0 0 16px;font-size:14px;color:${TEXTO_SUAVE};">Dejaste estos productos en tu carrito — siguen disponibles, pero no alcanzaste a terminar la compra.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">${filas}</table>
    <a href="${urlTienda}/productos" style="display:inline-block;background:${AZUL};color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:999px;font-size:14px;font-weight:600;">Volver a la tienda</a>
  `;
  return {
    subject: 'Dejaste productos en tu carrito — Sevelin',
    html: envoltorio('¿Te faltó terminar tu compra?', contenido),
  };
}

/** Alerta interna de sobreventa — se la manda la tienda A SÍ MISMA (al
 * correo del dueño, ver ALERTA_STOCK_EMAIL/obtenerCorreoAlertaStock en
 * POST /api/flow-webhook), nunca al cliente: un pago se confirmó pero el
 * stock ya no alcanzaba. Ver Reporte de Seguridad Consolidado B, hallazgo
 * #4 — el sistema no reembolsa ni cancela solo, esto es lo que reemplaza
 * al console.error silencioso de antes. */
export function correoAlertaStockSinDespacho(pedido: PedidoWeb, detalleTecnico: string): { subject: string; html: string } {
  const filas = pedido.items.map((it) => filaItem(it.nombre, it.cantidad, it.precio_web * it.cantidad)).join('');
  const contenido = `
    <p style="margin:0 0 16px;font-size:14px;color:${TEXTO_SUAVE};">
      El pedido <strong style="color:${TEXTO};">${pedido.numero_pedido}</strong> se pagó de verdad en Flow
      (${formatoCLP.format(pedido.total)}), pero al intentar descontar el stock en el POS el sistema
      respondió que ya no alcanza. Nadie reembolsó ni canceló nada automáticamente — hay que decidirlo
      a mano (reembolso por Flow, conseguir el producto, ofrecer un cambio, contactar al cliente).
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">${filas}</table>
    <p style="margin:0 0 4px;font-size:13px;color:${TEXTO};"><strong>Cliente:</strong> ${pedido.cliente_nombre || ''} ${pedido.cliente_apellido || ''} — ${pedido.cliente_email || 'sin correo'} — ${pedido.cliente_telefono || 'sin teléfono'}</p>
    <p style="margin:0;font-size:12px;color:${TEXTO_SUAVE};font-family:monospace;">Detalle técnico: ${detalleTecnico}</p>
  `;
  return {
    subject: `⚠️ Pago cobrado sin stock — pedido ${pedido.numero_pedido}`,
    html: envoltorio('Revisar manualmente: pago sin stock', contenido),
  };
}

/** Entrega de pedido — se envía cuando el POS marca el pedido como
 * ENTREGADO (Página Web → Pedidos Web), vía POST /api/pos/notificar-entrega
 * (mismo patrón que correoCancelacionPedido: el POS no tiene la API key de
 * Resend ni la plantilla). Incluye el pedido de reseña de Google — es el
 * segundo empujón, después del que ya se muestra en la página de estado
 * del pedido justo al comprar (ver src/app/pedido/[numero]/page.tsx). */
export function correoEntregaPedido(pedido: PedidoWeb): { subject: string; html: string } {
  const nombre = pedido.cliente_nombre || 'Hola';
  const contenido = `
    <p style="margin:0 0 20px;font-size:14px;color:${TEXTO_SUAVE};">${nombre}, tu pedido <strong style="color:${TEXTO};">${pedido.numero_pedido}</strong> fue entregado. ¡Esperamos que lo disfrutes!</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f9fafb;border-radius:10px;">
      <tr><td style="padding:20px;text-align:center;">
        <p style="margin:0 0 12px;font-size:14px;color:${TEXTO};">¿Todo bien con tu compra? Nos ayuda mucho que nos cuentes en una reseña de Google.</p>
        <a href="${URL_RESENA_GOOGLE}" style="display:inline-block;background:${AZUL};color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:999px;font-size:14px;font-weight:600;">⭐ Dejar una reseña</a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:${TEXTO_SUAVE};">¿Algo no llegó como esperabas? Escríbenos y lo revisamos contigo.</p>
  `;
  return {
    subject: `Tu pedido ${pedido.numero_pedido} fue entregado — Sevelin`,
    html: envoltorio('¡Tu pedido llegó!', contenido),
  };
}

/** Cancelación de pedido — misma estructura, la usa el POS (Pedidos Web →
 * Cancelar) llamando a esta misma tienda vía POST /api/pos/notificar-cancelacion
 * (el POS no tiene acceso directo a Resend con este remitente ni a este
 * template; centralizar el envío acá evita mantener dos copias del HTML). */
export function correoCancelacionPedido(pedido: PedidoWeb): { subject: string; html: string } {
  const nombre = pedido.cliente_nombre || 'Hola';
  const contenido = `
    <p style="margin:0 0 16px;font-size:14px;color:${TEXTO_SUAVE};">${nombre}, tu pedido <strong style="color:${TEXTO};">${pedido.numero_pedido}</strong> fue cancelado.</p>
    <p style="margin:0;font-size:14px;color:${TEXTO_SUAVE};">Si ya se te cobró y esperabas este pedido, contáctanos y lo revisamos contigo.</p>
  `;
  return {
    subject: `Tu pedido ${pedido.numero_pedido} fue cancelado — Sevelin`,
    html: envoltorio('Pedido cancelado', contenido),
  };
}
