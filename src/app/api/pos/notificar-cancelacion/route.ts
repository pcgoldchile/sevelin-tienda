import { NextRequest, NextResponse } from 'next/server';
import { obtenerPedidoPorNumero } from '@/lib/pedidos';
import { correoCancelacionPedido } from '@/lib/correo-pedido';
import { enviarCorreo } from '@/lib/resend';
import { verificarSecretoSync } from '@/lib/verificar-secreto';

/**
 * El POS (sevelin-pos-oficial) llama acá justo después de cancelar un
 * pedido (PUT /api/pos/pedidos-web/:id con estado: 'CANCELADO') — el POS
 * no tiene ni la API key de Resend ni la plantilla del correo; centralizar
 * el envío acá evita mantener dos copias del HTML y de la lógica de envío.
 * Protegido con el mismo SYNC_SECRET que ya comparten los dos proyectos
 * (ver POST /api/sync/producto y src/lib/verificar-secreto.ts) — quien
 * llama es el propio backend del POS, no una persona logueada.
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

  const { subject, html } = correoCancelacionPedido(pedido);
  const enviado = await enviarCorreo({ to: pedido.cliente_email, subject, html });

  return NextResponse.json({ ok: true, enviado });
}
