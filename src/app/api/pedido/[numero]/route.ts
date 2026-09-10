import { NextRequest, NextResponse } from 'next/server';
import { obtenerPedidoPorNumero } from '@/lib/pedidos';

/* GET /api/pedido/:numero — estado del pedido para el comprador.
   ------------------------------------------------------------
   Es una consulta PÚBLICA a propósito: el checkout admite invitados sin
   cuenta, así que lo único que identifica al dueño del pedido es conocer
   su número. Eso obliga a una regla estricta sobre QUÉ se devuelve.

   HALLAZGO DEL 10-09-2026 (corregido acá)
   Este endpoint devolvía la fila completa de `pedidos_web`: nombre,
   apellido, RUT, correo, teléfono, dirección de envío, datos de
   facturación y hasta la nota interna del negocio. Como los números son
   correlativos y predecibles (WEB-000001, WEB-000002, …), cualquiera
   podía recorrerlos y sacar los datos personales de todos los clientes.
   Lo reportó el dueño al notar que bajando el número en la URL veía
   otros pedidos.

   LA REGLA: acá se listan UNO POR UNO los campos que el comprador
   necesita para seguir su pedido, y nada más. Nunca `...pedido`. Si
   mañana la página necesita otro dato, se agrega a esta lista a
   conciencia — que es exactamente el momento de preguntarse si ese dato
   puede quedar expuesto a quien adivine un número. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  try {
    const pedido = await obtenerPedidoPorNumero(numero);
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    return NextResponse.json({
      numero_pedido: pedido.numero_pedido,
      estado: pedido.estado,
      // Los ítems son del propio comprador y no traen datos personales.
      items: pedido.items,
      subtotal: pedido.subtotal,
      costo_envio: pedido.costo_envio,
      recargo_medio_pago: pedido.recargo_medio_pago,
      total: pedido.total,
      metodo_envio: pedido.metodo_envio,
      metodo_pago: pedido.metodo_pago,
      // Para que pueda descargar su boleta y seguir su encomienda.
      url_boleta_sii: pedido.url_boleta_sii,
      tracking_courier: pedido.tracking_courier,
      creado_en: pedido.creado_en,
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo cargar el pedido';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
