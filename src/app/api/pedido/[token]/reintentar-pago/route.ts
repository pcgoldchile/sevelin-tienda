import { NextRequest, NextResponse } from 'next/server';
import { obtenerPedidoPorToken, guardarPagoKhipu, guardarPagoLink, guardarPagoWebpay } from '@/lib/pedidos';
import { crearPagoKhipu, khipuHabilitado } from '@/lib/khipu';
import { crearTransaccionWebpay } from '@/lib/webpay';
import { medioTarjetaDisponible } from '@/lib/link-pago';

/**
 * POST /api/pedido/:token/reintentar-pago
 *
 * QUÉ RESUELVE
 * El cliente llega a pagar, se arrepiente o se le corta, y vuelve atrás.
 * El pedido queda en CREADO y sin esto tendría que armar el carrito de
 * nuevo, con los datos de envío otra vez. La mayoría no lo hace — es una
 * venta que ya estaba decidida y se pierde en el último paso.
 *
 * Desde supabase/42 también sirve para CAMBIAR de medio: quien eligió
 * tarjeta puede terminar pagando por transferencia, y al revés. El body
 * opcional `{ medio: 'KHIPU' | 'TARJETA' }` dice cuál; sin body se reintenta
 * con el medio que el pedido ya tenía.
 *
 * SOLO SI EL PEDIDO NO SE COMPLETÓ
 * Únicamente estado CREADO. Un pedido PAGADO no se vuelve a cobrar jamás,
 * y uno EXPIRADO tampoco entra: pasaron más de 24 horas, los precios y el
 * stock pueden haber cambiado, y cobrar sobre una foto vieja del carrito
 * es cómo se termina vendiendo algo que ya no se tiene. Ese caso se arma
 * de nuevo desde el carrito, que revalida todo contra el catálogo.
 *
 * SE CREA UN COBRO NUEVO, no se reusa el anterior: los links de las
 * pasarelas caducan (el de Webpay, a los 5 minutos). El monto sale del
 * pedido guardado en la base, nunca de lo que mande el navegador.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const pedido = await obtenerPedidoPorToken(token).catch(() => null);
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  if (pedido.estado === 'PAGADO' || ['PREPARANDO', 'ENVIADO', 'ENTREGADO'].includes(pedido.estado)) {
    return NextResponse.json(
      { error: 'Este pedido ya está pagado.', yaPagado: true },
      { status: 409 }
    );
  }

  if (pedido.estado !== 'CREADO') {
    return NextResponse.json(
      { error: 'Este pedido ya no está vigente. Vuelve a agregar los productos al carrito.' },
      { status: 409 }
    );
  }

  const cuerpo = (await req.json().catch(() => null)) as { medio?: string } | null;
  const pedida = String(cuerpo?.medio || '').toUpperCase();
  const conTarjeta = pedida
    ? pedida === 'TARJETA'
    : pedido.metodo_pago === 'WEBPAY' || pedido.metodo_pago === 'LINK_TUU';

  try {
    if (conTarjeta) {
      const medio = medioTarjetaDisponible();
      if (!medio) {
        return NextResponse.json({ error: 'El pago con tarjeta no está disponible en este momento.' }, { status: 503 });
      }
      if (medio === 'WEBPAY') {
        const transaccion = await crearTransaccionWebpay({
          numeroPedido: pedido.numero_pedido,
          tokenPublico: pedido.token_publico,
          monto: pedido.total,
        });
        await guardarPagoWebpay(pedido.numero_pedido, transaccion.token, transaccion.ordenCompra);
        return NextResponse.json({ ok: true, webpay: { url: transaccion.url, token: transaccion.token } });
      }
      // Link de pago: no hay cobro que generar; la página del pedido explica cómo pagar.
      await guardarPagoLink(pedido.numero_pedido);
      return NextResponse.json({ ok: true, url_pago: `/pedido/${pedido.token_publico}` });
    }

    if (!khipuHabilitado()) {
      return NextResponse.json({ error: 'El pago por transferencia no está disponible en este momento.' }, { status: 503 });
    }
    const pago = await crearPagoKhipu({
      numeroPedido: pedido.numero_pedido,
      tokenPublico: pedido.token_publico,
      monto: pedido.total,
      email: pedido.cliente_email || '',
    });
    await guardarPagoKhipu(pedido.numero_pedido, pago.paymentId);
    return NextResponse.json({ ok: true, url_pago: pago.url });
  } catch (err) {
    console.error('[reintentar-pago]', pedido.numero_pedido, err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'No pudimos generar el cobro. Intenta de nuevo en unos minutos.' },
      { status: 502 }
    );
  }
}
