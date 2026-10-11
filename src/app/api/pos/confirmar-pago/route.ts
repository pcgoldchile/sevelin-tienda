import { NextRequest, NextResponse } from 'next/server';
import { guardarDetallePago, guardarPagoLink, obtenerPedidoPorNumero } from '@/lib/pedidos';
import { procesarPagoConfirmado } from '@/lib/pago-confirmado';
import { verificarSecretoSync } from '@/lib/verificar-secreto';

export const maxDuration = 60;

/**
 * El POS llama acá cuando el dueño aprieta "Confirmar pago" en Pedidos Web
 * (POST /api/pos/pedidos-web/:id/confirmar-pago), después de ver en su cuenta
 * de Haulmer que el pago con tarjeta por el link de pago sí entró.
 *
 * Haulmer no le avisa nada a la tienda: esta confirmación ES la prueba de
 * pago. Por eso solo se acepta con el SYNC_SECRET (viene del POS, donde ya se
 * exigió ser administrador) y solo para un pedido que sigue esperando su pago
 * (CREADO). El candado de siempre evita el doble cobro: si la pasarela
 * confirma el mismo pedido un segundo después, ya no lo encuentra en CREADO.
 *
 * Body: { numero_pedido, tipo: 'DEBITO' | 'CREDITO', referencia? }
 */
export async function POST(req: NextRequest) {
  if (!verificarSecretoSync(req)) {
    return NextResponse.json({ error: 'Secreto de sincronización inválido' }, { status: 401 });
  }

  let numeroPedido = '';
  let tipo: 'DEBITO' | 'CREDITO' = 'DEBITO';
  let referencia: string | null = null;
  try {
    const body = await req.json();
    numeroPedido = String(body?.numero_pedido || '').trim();
    tipo = String(body?.tipo || '').toUpperCase() === 'CREDITO' ? 'CREDITO' : 'DEBITO';
    referencia = String(body?.referencia || '').trim().slice(0, 120) || null;
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  if (!numeroPedido) return NextResponse.json({ error: 'Falta numero_pedido' }, { status: 400 });

  const pedido = await obtenerPedidoPorNumero(numeroPedido).catch(() => null);
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  if (pedido.estado !== 'CREADO') {
    const yaPagado = ['PAGADO', 'PREPARANDO', 'ENVIADO', 'ENTREGADO', 'ERROR_STOCK_SIN_DESPACHO'].includes(pedido.estado);
    return NextResponse.json(
      {
        error: yaPagado
          ? 'Este pedido ya tiene el pago confirmado.'
          : 'Este pedido ya no está vigente (se anuló por no pagarse a tiempo). Si el cliente pagó, hay que hacerlo de nuevo o devolverle la plata.',
        estado: pedido.estado,
      },
      { status: 409 }
    );
  }

  try {
    /* Un pedido que partió por Khipu y terminó pagándose por el link (el
       cliente cambió de idea) queda anotado como lo que fue: tarjeta por link. */
    if (pedido.metodo_pago !== 'LINK_TUU') await guardarPagoLink(numeroPedido);
    await guardarDetallePago(numeroPedido, { origen: 'LINK_TUU', tipo, referencia }, { confirmado: true });
    const r = await procesarPagoConfirmado(numeroPedido, 'link-pago');
    if (r.resultado === 'no_encontrado') return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    if (r.resultado === 'ya_procesado') {
      return NextResponse.json({ error: 'Otra confirmación de este pedido llegó primero.', estado: r.pedido.estado }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      numero_pedido: numeroPedido,
      estado: r.sinStock ? 'ERROR_STOCK_SIN_DESPACHO' : 'PAGADO',
      // El pago quedó anotado, pero no había stock para descontar: lo resuelve el dueño.
      sin_stock: r.sinStock,
      correo_cliente: !!r.pedido.cliente_email,
    });
  } catch (err) {
    console.error('[confirmar-pago]', numeroPedido, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'No se pudo confirmar el pago. Inténtalo de nuevo en un momento.' }, { status: 500 });
  }
}
