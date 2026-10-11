import { webpayEnProduccion, webpayHabilitado } from './webpay';
import { LINK_PAGO_TUU_ENCENDIDO } from './tarjeta-en-sitio';

/**
 * Pago con tarjeta por el LINK DE PAGO de Haulmer (tuu.cl/sevelin).
 * ------------------------------------------------------------
 * Es un PUENTE (dueño, 11-10-2026): ofrece tarjeta en la tienda mientras
 * Transbank termina de habilitar Webpay Plus. No es una pasarela integrada:
 *
 *   · el link no recibe el monto por la dirección (probado el 11-10-2026) ni
 *     tiene un campo para el número de pedido: el cliente escribe el monto;
 *   · Haulmer no avisa a la tienda cuando alguien paga. El cliente manda su
 *     comprobante por WhatsApp y el dueño aprieta "Confirmar pago" en el POS.
 *
 * Por eso el pedido queda CREADO ("esperando pago") y nada se descuenta ni se
 * avisa hasta esa confirmación. Se apaga solo el día que Webpay cobre de
 * verdad: dos formas de pagar con tarjeta a la vez solo confunden.
 */
export const LINK_PAGO_TUU_URL = 'https://tuu.cl/sevelin';

export function linkPagoHabilitado(): boolean {
  return LINK_PAGO_TUU_ENCENDIDO && !webpayEnProduccion();
}

/** Las dos formas de pagar con tarjeta en la tienda. */
export type MedioTarjeta = 'WEBPAY' | 'LINK_TUU';

/**
 * Qué se ofrece al elegir "tarjeta": Webpay si está habilitado; si no, el
 * link. null = hoy no se puede pagar con tarjeta en el sitio.
 */
export function medioTarjetaDisponible(): MedioTarjeta | null {
  if (webpayHabilitado()) return 'WEBPAY';
  if (linkPagoHabilitado()) return 'LINK_TUU';
  return null;
}

/**
 * Horas que un pedido espera su pago antes de anularse solo (lo usa el cron
 * de vencimiento y la página del pedido, para decir hasta cuándo se puede
 * pagar). Con el link la confirmación es manual: quien paga un sábado en la
 * noche no puede encontrar su pedido anulado antes de que alguien vea el
 * comprobante. El cron corre una vez al día, así que en la práctica son
 * entre 24 y 48 horas.
 */
export const HORAS_PARA_PAGAR = 24;
