import { NextRequest, NextResponse } from 'next/server';
import { obtenerPedidoPorToken, guardarPagoKhipu } from '@/lib/pedidos';
import { crearPagoKhipu, khipuHabilitado } from '@/lib/khipu';

/**
 * POST /api/pedido/:token/reintentar-pago
 *
 * QUÉ RESUELVE
 * El cliente llega a Khipu, se arrepiente o se le corta, y vuelve atrás.
 * El pedido queda en CREADO y hasta ahora no había forma de retomarlo:
 * tenía que armar el carrito de nuevo, con los datos de envío otra vez.
 * La mayoría no lo hace — es una venta que ya estaba decidida y se pierde
 * en el último paso.
 *
 * SOLO SI EL PEDIDO NO SE COMPLETÓ
 * Únicamente estado CREADO. Un pedido PAGADO no se vuelve a cobrar jamás,
 * y uno EXPIRADO tampoco entra: pasaron más de 24 horas, los precios y el
 * stock pueden haber cambiado, y cobrar sobre una foto vieja del carrito
 * es cómo se termina vendiendo algo que ya no se tiene. Ese caso se arma
 * de nuevo desde el carrito, que revalida todo contra el catálogo.
 *
 * SE CREA UN COBRO NUEVO, no se reusa el link anterior: los links de las
 * pasarelas caducan, y uno vencido devolvería al cliente al mismo lugar
 * donde ya falló. El monto sale del pedido guardado en la base, nunca de
 * lo que mande el navegador.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
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

  if (!khipuHabilitado()) {
    return NextResponse.json({ error: 'El pago en línea no está disponible en este momento.' }, { status: 503 });
  }

  try {
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
