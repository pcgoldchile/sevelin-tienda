import { NextRequest, NextResponse } from 'next/server';
import { obtenerPedidoPorToken } from '@/lib/pedidos';

/* GET /api/pedido/:token — estado del pedido para el comprador.
   -------------------------------------------------------------
   Es una consulta PÚBLICA a propósito: el checkout admite invitados sin
   cuenta, así que lo único que identifica al dueño del pedido es conocer
   su link. De ahí las DOS defensas que tiene esta ruta.

   1) LA URL NO SE PUEDE ADIVINAR (11-09-2026)
   Antes la ruta era /api/pedido/WEB-000009 y los números son
   correlativos: restando uno se llegaba al pedido de otra persona. Ahora
   se entra por `token_publico`, 32 hexadecimales aleatorios por pedido
   (ver supabase/26-token-publico-pedido.sql). Conocer un token no da
   ninguna pista sobre los demás.

   2) SE DEVUELVE LO JUSTO (10-09-2026)
   Este endpoint devolvía la fila completa de `pedidos_web`: nombre,
   apellido, RUT, correo, teléfono, dirección de envío, datos de
   facturación y hasta la nota interna del negocio. Acá se listan UNO POR
   UNO los campos que el comprador necesita para seguir su pedido, y nada
   más. Nunca `...pedido`.

   Las dos defensas se mantienen juntas a propósito: la primera evita que
   un extraño llegue, la segunda limita el daño si alguna vez un link se
   filtra (se reenvía un correo, queda en un historial compartido). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const pedido = await obtenerPedidoPorToken(token);
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
