/**
 * Precio diferenciado por medio de pago.
 * ------------------------------------------------------------
 * Ver `docs/PLAN-PRECIOS-DIFERENCIADOS.md` para el plan completo y las
 * decisiones del dueño (08-09-2026).
 *
 * REGLA DEL NEGOCIO — el recargo NO es "por pagar con tarjeta", es por
 * pagar a través de la pasarela del checkout web (Flow, 2,89% + IVA):
 *
 *   Efectivo / transferencia presencial ....... precio base
 *   Débito o crédito en el mostrador (TUU) .... precio base
 *   Link de pago de TUU (a pedido) ............ precio base
 *   Transferencia web (Khipu, 1%) ............. precio base
 *   Tarjeta en el checkout web (Flow) ......... precio base + RECARGO
 *
 * `productos_web.precio_web` sigue siendo la ÚNICA fuente de verdad y es
 * el precio base (el bajo). El precio con recargo se calcula siempre acá,
 * nunca se guarda en la base: dos precios guardados son dos precios que
 * algún día se desincronizan, y cambiar el porcentaje obligaría a
 * re-migrar los 130 productos en vez de tocar una constante.
 */

/**
 * 3%. El techo legal es la comisión real que cobra Flow — 2,89% + IVA =
 * 3,44% — porque el TDLC solo permite el precio diferenciado cuando el
 * recargo NO EXCEDE la comisión y se informa de forma pública y
 * transparente. 3% queda por debajo de ese techo y da números redondos
 * ($99.990 → $102.990).
 *
 * ⚠️ Si algún día sube, revisar primero cuánto cobra Flow de verdad: pasarse
 * del 3,44% deja de ser un recargo legítimo y pasa a ser un problema legal.
 */
export const RECARGO_CHECKOUT_TARJETA = 0.03;

/** Los dos medios que ofrece el checkout web (ver formulario-checkout.tsx). */
export type MetodoPagoWeb = "FLOW" | "KHIPU";

/**
 * Precio unitario que paga quien elige tarjeta en el checkout web.
 * Redondeado a la decena para que nunca aparezca un $102.989,7 en pantalla
 * ni en la boleta.
 */
export function precioConRecargo(precioBase: number): number {
  return Math.round((precioBase * (1 + RECARGO_CHECKOUT_TARJETA)) / 10) * 10;
}

/** Cuánto suma el recargo en UNA unidad de este producto. */
export function recargoUnitario(precioBase: number): number {
  return precioConRecargo(precioBase) - precioBase;
}

/**
 * Precio unitario efectivo según el medio elegido — el único lugar donde
 * se decide qué precio aplica.
 */
export function precioSegunMetodo(precioBase: number, metodo: MetodoPagoWeb): number {
  return metodo === "FLOW" ? precioConRecargo(precioBase) : precioBase;
}

/**
 * Recargo total de un carrito. Se calcula sumando el recargo POR UNIDAD, no
 * aplicando el porcentaje al subtotal: así el total siempre es exactamente
 * la suma de los precios que el cliente vio en pantalla, y puede
 * comprobarlo con una calculadora. Aplicar el % al subtotal daría un peso
 * de diferencia por el redondeo y esa clase de descuadre es la que termina
 * en un reclamo.
 *
 * NO incluye el envío: decisión D1 del dueño — el recargo aplica solo a los
 * productos, igual que Tecnomás.
 */
export function recargoTotal(
  items: { precio_web: number; cantidad: number }[],
  metodo: MetodoPagoWeb
): number {
  if (metodo !== "FLOW") return 0;
  return items.reduce((suma, item) => suma + recargoUnitario(item.precio_web) * item.cantidad, 0);
}
