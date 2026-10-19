/**
 * WhatsApp con el producto ya escrito (#5, 18-10-2026). El botón verde
 * flotante vive en el layout y no sabe qué producto se está mirando; la ficha
 * se lo cuenta acá al abrirse (MensajeWhatsappProducto) y lo borra al salir.
 * Así el chat abre con "Hola, me interesa el Monitor X ($99.990)…" en vez de
 * vacío: medido, la tienda tiene ~2.000 vistas al mes y 5 pedidos web; la venta
 * se cierra por WhatsApp.
 */
let mensajeActual: string | null = null;

export function ponerMensajeWhatsapp(mensaje: string | null): void {
  mensajeActual = mensaje;
}

export function mensajeWhatsappActual(): string | null {
  return mensajeActual;
}

/** El texto que aprobó el dueño. `url` es el enlace completo a la ficha. */
export function mensajeDeProducto(nombre: string, precio: string, url: string, desde = false): string {
  return `Hola, me interesa ${nombre} (${desde ? "desde " : ""}${precio}): ${url} ¿Lo puedo retirar hoy en San Rafael 896?`;
}
