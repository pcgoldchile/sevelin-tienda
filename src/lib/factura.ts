/**
 * Factura en la tienda. Apagada el 02-10-2026 por decisión del dueño: todavía
 * no puede emitirla (falta la verificación de actividades en el SII,
 * pendiente #47 del POS).
 *
 * En false: el checkout no ofrece "Solicitar factura", el servidor ignora
 * esos datos si igual llegan, y las Preguntas Frecuentes, los Términos y la
 * página del pedido hablan solo de boleta. Para volver a ofrecerla basta
 * cambiar este valor (y el texto de /venta-mayorista, que lo dice a mano).
 */
export const FACTURA_HABILITADA = false;
