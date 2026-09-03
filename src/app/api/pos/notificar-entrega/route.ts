import { NextRequest, NextResponse } from 'next/server';
import { obtenerPedidoPorNumero } from '@/lib/pedidos';
import { correoEntregaPedido } from '@/lib/correo-pedido';
import { enviarCorreo } from '@/lib/resend';
import { verificarSecretoSync } from '@/lib/verificar-secreto';

/**
 * El POS (sevelin-pos-oficial) llama acá justo después de marcar un pedido
 * como ENTREGADO (PUT /api/pos/pedidos-web/:id con estado: 'ENTREGADO') —
 * mismo patrón exacto que /api/pos/notificar-cancelacion: el POS no tiene
 * la API key de Resend ni la plantilla del correo. Protegido con el mismo
 * SYNC_SECRET compartido de siempre.
 */
export async function POST(req: NextRequest) {
  if (!verificarSecretoSync(req)) {
    return NextResponse.json({ error: 'Secreto de sincronización inválido' }, { status: 401 });
  }

  let numeroPedido: string | null = null;
  try {
    const body = await req.json();
    numeroPedido = (body?.numero_pedido || '').trim() || null;
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  if (!numeroPedido) return NextResponse.json({ error: 'Falta numero_pedido' }, { status: 400 });

  const pedido = await obtenerPedidoPorNumero(numeroPedido).catch(() => null);
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  if (!pedido.cliente_email) {
    return NextResponse.json({ ok: true, motivo: 'sin_email' });
  }

  const { subject, html } = correoEntregaPedido(pedido);
  const enviado = await enviarCorreo({ to: pedido.cliente_email, subject, html });

  return NextResponse.json({ ok: true, enviado });
}
