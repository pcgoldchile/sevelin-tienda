/**
 * Interruptor manual del link de pago de Haulmer (ver src/lib/link-pago.ts).
 *
 * Vive en su propio archivo, sin importar nada, para que también lo pueda
 * leer el código del navegador (el aviso "paga con tarjeta" del carrito): si
 * estuviera junto al cliente de Webpay, ese archivo de servidor terminaría
 * empaquetado para el navegador.
 *
 * Mientras esté en `true` siempre hay una forma de pagar con tarjeta en el
 * sitio: Webpay si ya cobra, o este link mientras tanto.
 */
export const LINK_PAGO_TUU_ENCENDIDO = true;
