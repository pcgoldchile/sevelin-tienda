/**
 * Correo con la cotización que el cliente se generó solo (supabase/35).
 *
 * Mismo criterio visual que `correo-pedido.ts`: HTML con estilos en línea y
 * tabla de presentación — los clientes de correo (Outlook sobre todo) no
 * aplican CSS externo ni flexbox de forma confiable.
 *
 * El correo NO reemplaza al documento: lleva el detalle y un enlace a la
 * página de la cotización, donde está el botón para descargar el PDF. Un
 * adjunto generado en el servidor obligaría a traer una librería de PDF al
 * backend para algo que el navegador ya hace mejor.
 */

import { escaparHtml } from './escapar-html';
import { formatoCLP } from './formato';
import { enviarCorreo } from './resend';
import { fechaLargaChile, type LineaCotizacion, type TotalesCotizacion } from './cotizaciones';

const AZUL = '#2b3f66';
const TEXTO = '#1a1f29';
const TEXTO_SUAVE = '#5b6472';
const BORDE = '#e4e7ec';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sevelin.cl';

export async function enviarCorreoCotizacion(params: {
  para: string;
  nombre: string;
  numero: string;
  token: string;
  venceEn: string;
  lineas: LineaCotizacion[];
  totales: TotalesCotizacion;
}): Promise<boolean> {
  const { para, nombre, numero, token, venceEn, lineas, totales } = params;
  const url = `${SITE_URL}/cotizacion/${token}`;

  const filas = lineas
    .map(
      (l) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid ${BORDE};color:${TEXTO};font-size:14px;">
        ${escaparHtml(l.nombre)}<br>
        <span style="color:${TEXTO_SUAVE};font-size:12px;">${l.cantidad} × ${formatoCLP.format(l.precio_unitario)}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid ${BORDE};color:${TEXTO};font-size:14px;text-align:right;white-space:nowrap;vertical-align:top;">${formatoCLP.format(l.subtotal)}</td>
    </tr>`
    )
    .join('');

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f7f9;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
      <h1 style="margin:0 0 4px;color:${AZUL};font-size:20px;">Tu cotización ${escaparHtml(numero)}</h1>
      <p style="margin:0 0 20px;color:${TEXTO_SUAVE};font-size:14px;">
        Hola ${escaparHtml(nombre)}, acá está el detalle de lo que cotizaste en Sevelin.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        ${filas}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="padding:6px 0;color:${TEXTO_SUAVE};font-size:14px;">Neto</td>
          <td style="padding:6px 0;color:${TEXTO};font-size:14px;text-align:right;">${formatoCLP.format(totales.neto)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:${TEXTO_SUAVE};font-size:14px;">IVA 19%</td>
          <td style="padding:6px 0;color:${TEXTO};font-size:14px;text-align:right;">${formatoCLP.format(totales.iva)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0 0;color:${TEXTO};font-size:16px;font-weight:700;border-top:2px solid ${BORDE};">Total</td>
          <td style="padding:10px 0 0;color:${AZUL};font-size:18px;font-weight:700;text-align:right;border-top:2px solid ${BORDE};">${formatoCLP.format(totales.total)}</td>
        </tr>
      </table>

      <p style="margin:0 0 18px;padding:12px;background:#fff6e5;border-radius:8px;color:${TEXTO};font-size:13px;">
        <strong>Vigente hasta el ${escaparHtml(fechaLargaChile(venceEn))}.</strong><br>
        Los precios y la disponibilidad pueden cambiar después de esa fecha.
        Esta cotización no reserva stock.
      </p>

      <a href="${url}" style="display:inline-block;background:${AZUL};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;">
        Ver y descargar el PDF
      </a>

      <p style="margin:22px 0 0;color:${TEXTO_SUAVE};font-size:12px;line-height:1.6;">
        ¿Necesitas ajustar cantidades o pedir un plazo mayor? Respóndenos este correo
        o escríbenos por WhatsApp y lo vemos.
      </p>
    </div>
  </div>`;

  return enviarCorreo({
    to: para,
    subject: `Tu cotización ${numero} — Sevelin`,
    html,
  });
}
