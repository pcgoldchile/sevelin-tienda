import { NextRequest, NextResponse } from 'next/server';
import { obtenerPedidoPorNumero } from '@/lib/pedidos';
import { obtenerImagenesPorProductoPosId } from '@/lib/catalogo';
import { correoListoParaRetiro } from '@/lib/correo-pedido';
import { enviarCorreo } from '@/lib/resend';
import { verificarSecretoSync } from '@/lib/verificar-secreto';

/**
 * El POS (sevelin-pos-oficial) llama acá cuando el dueño aprieta "Listo
 * para retiro" en Pedidos Web (POST /api/pos/pedidos-web/:id/listo-retiro).
 * Mismo patrón que /api/pos/notificar-entrega: el POS no tiene la API key de
 * Resend ni la plantilla. Protegido con el SYNC_SECRET de siempre.
 *
 * `skus` son los productos que quedaron listos. El resto de los productos
 * del pedido se nombra como "todavía no", para que el cliente no venga
 * creyendo que se lleva todo. Los servicios técnicos no entran: esos tienen
 * su propio aviso (el QR de retiro de la orden de trabajo).
 *
 * Esta ruta SOLO manda el correo. Quién queda avisado y cuándo lo guarda el
 * POS en pedidos_web.retiro_avisos (supabase/41), después de que esto
 * responde `enviado: true`.
 */
export async function POST(req: NextRequest) {
  if (!verificarSecretoSync(req)) {
    return NextResponse.json({ error: 'Secreto de sincronización inválido' }, { status: 401 });
  }

  let numeroPedido: string | null = null;
  let skus: string[] = [];
  try {
    const body = await req.json();
    numeroPedido = (body?.numero_pedido || '').trim() || null;
    skus = Array.isArray(body?.skus) ? body.skus.map((s: unknown) => String(s || '').trim()).filter(Boolean) : [];
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  if (!numeroPedido) return NextResponse.json({ error: 'Falta numero_pedido' }, { status: 400 });

  const pedido = await obtenerPedidoPorNumero(numeroPedido).catch(() => null);
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  if (pedido.metodo_envio !== 'RETIRO') {
    return NextResponse.json({ error: 'Este pedido no es de retiro en tienda' }, { status: 409 });
  }

  const productos = pedido.items.filter((it) => !it.es_servicio);
  const listos = productos.filter((it) => skus.includes(it.sku));
  if (listos.length === 0) {
    return NextResponse.json({ error: 'Indica qué productos quedaron listos para retiro' }, { status: 400 });
  }
  /* Pendiente = lo que no viene en este aviso NI en uno anterior: lo que ya
     se avisó antes no se vuelve a nombrar como "todavía no". */
  const yaAvisados = new Set((pedido.retiro_avisos || []).flatMap((a) => a.skus || []));
  const pendientes = productos.filter((it) => !skus.includes(it.sku) && !yaAvisados.has(it.sku));

  if (!pedido.cliente_email) {
    return NextResponse.json({ ok: true, enviado: false, motivo: 'sin_email' });
  }

  // Si la consulta de fotos falla, el correo sale igual con los nombres.
  const imagenes = await obtenerImagenesPorProductoPosId(listos.map((it) => it.producto_pos_id)).catch(() => ({}));

  const { subject, html } = correoListoParaRetiro(pedido, { listos, pendientes }, imagenes);
  const enviado = await enviarCorreo({ to: pedido.cliente_email, subject, html });

  return NextResponse.json({ ok: true, enviado, listos: listos.length, pendientes: pendientes.length });
}
