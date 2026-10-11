import { NextRequest, NextResponse } from 'next/server';
import { supabaseWeb } from '@/lib/supabase-web';
import { obtenerProductoPorSku } from '@/lib/catalogo';
import { enviarCorreo } from '@/lib/resend';
import { correoCarritoAbandonado, correoPedidoSinPagar } from '@/lib/correo-pedido';
import { obtenerImagenesPorProductoPosId } from '@/lib/catalogo';
import { marcarRecordatorioPagoEnviado, pedidosSinPagarParaRecordar } from '@/lib/pedidos';
import { HORAS_PARA_PAGAR } from '@/lib/link-pago';
import { correoDadoDeBaja, esCorreoDeRobot, urlBajaRecordatorios, urlCarrito, type ItemCarritoWeb } from '@/lib/carritos-web';

/** Cuánto esperar desde que el cliente dejó el correo (o lo actualizó por
 * última vez) antes de mandarle el recordatorio — bastante para no
 * molestar a alguien que sigue comprando en ese momento, pero dentro de la
 * ventana de 24h en que el carrito sigue vivo. */
const RETRASO_RECORDATORIO_MS = 60 * 60 * 1000;

/** Lo mismo para un pedido que llegó a crearse y quedó sin pagar: una hora de
 * margen, por si sigue pagando o el dueño está por confirmar un pago hecho
 * con el link. */
const HORAS_ANTES_DE_RECORDAR_PAGO = 1;

/**
 * PEDIDOS SIN PAGAR (supabase/42, 11-10-2026).
 * Hasta ahora el recordatorio de abandono se apagaba apenas el carrito se
 * convertía en pedido, así que quien llegaba al banco (o al link de pago) y
 * no terminaba no recibía nada: 4 de los 8 pedidos por Khipu vencieron así.
 * El correo lleva a la página del pedido, que deja terminar el pago sin
 * volver a llenar nada. Una vez por pedido; respeta la baja y a los robots.
 */
async function recordarPedidosSinPagar(): Promise<{ revisados: number; enviados: number }> {
  const sitio = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sevelin.cl').replace(/\/+$/, '');
  const pedidos = await pedidosSinPagarParaRecordar(HORAS_ANTES_DE_RECORDAR_PAGO, HORAS_PARA_PAGAR);
  let enviados = 0;

  for (const pedido of pedidos) {
    const correo = (pedido.cliente_email || '').trim();
    if (correo && !esCorreoDeRobot(correo) && !(await correoDadoDeBaja(correo))) {
      const imagenes = await obtenerImagenesPorProductoPosId(pedido.items.map((it) => it.producto_pos_id)).catch(() => ({}));
      const { subject, html } = correoPedidoSinPagar(pedido, imagenes, {
        pedido: `${sitio}/pedido/${pedido.token_publico}`,
        baja: urlBajaRecordatorios(pedido.token_publico),
      });
      if (await enviarCorreo({ to: correo, subject, html })) enviados++;
    }
    // Se marca igual aunque no saliera (baja, robot o fallo del envío): una sola pasada por pedido.
    await marcarRecordatorioPagoEnviado(pedido.id);
  }
  return { revisados: pedidos.length, enviados };
}

function verificarCron(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  return req.headers.get('authorization') === `Bearer ${secreto}`;
}

/**
 * GET /api/cron/recordar-carritos — programado en vercel.json tres veces al
 * día (el plan Hobby permite una ejecución diaria por cron). Busca carritos
 * de checkout con correo, sin pedido y sin recordatorio, que llevan más de
 * RETRASO_RECORDATORIO_MS sin actualizarse y siguen dentro de su ventana de
 * 24h. El correo trae el link a SU carrito y el de baja (ley 19.496, 28 B).
 */
export async function GET(req: NextRequest) {
  if (!verificarCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const ahora = new Date();
  const limiteActualizacion = new Date(ahora.getTime() - RETRASO_RECORDATORIO_MS).toISOString();

  const { data: candidatos, error } = await supabaseWeb
    .from('carritos_web')
    .select('id, token, items, correo, expira_en')
    .eq('origen', 'checkout')
    .is('recordatorio_enviado_en', null)
    .is('numero_pedido', null)
    .not('correo', 'is', null)
    .lte('actualizado_en', limiteActualizacion)
    .gt('expira_en', ahora.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let enviados = 0;
  for (const carrito of candidatos || []) {
    const correo = carrito.correo as string;
    const items = (carrito.items as ItemCarritoWeb[]) || [];
    const resueltos = esCorreoDeRobot(correo) || (await correoDadoDeBaja(correo))
      ? []
      : await Promise.all(items.map(async (it) => ({ it, producto: await obtenerProductoPorSku(it.sku) })));
    const disponibles = resueltos.filter((r) => r.producto !== null);

    if (disponibles.length > 0) {
      const { subject, html } = correoCarritoAbandonado(
        disponibles.map(({ producto, it }) => ({
          nombre: producto!.nombre,
          cantidad: it.cantidad,
          precio_web: producto!.precio_web,
          imagen_url: producto!.imagen_urls?.[0],
        })),
        { retomar: urlCarrito(carrito.token as string), baja: urlBajaRecordatorios(carrito.token as string) }
      );
      const ok = await enviarCorreo({ to: correo, subject, html });
      if (ok) enviados++;
    }

    // Se marca igual aunque no quedara nada disponible, el correo esté dado de
    // baja o el envío fallara: así no se vuelve a evaluar en cada pasada.
    await supabaseWeb.from('carritos_web').update({ recordatorio_enviado_en: ahora.toISOString() }).eq('id', carrito.id);
  }

  // Política de privacidad: los datos personales de un checkout se borran a los 90 días.
  // Se anonimiza en vez de borrar la fila para no romper las métricas de conversión del POS.
  const hace90Dias = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await supabaseWeb
    .from('carritos_web')
    .update({ correo: null, nombre: null, telefono: null })
    .eq('origen', 'checkout')
    .lt('creado_en', hace90Dias)
    .not('correo', 'is', null);

  /* Va al final y con su propio try: si la columna de supabase/42 todavía no
     existe o algo falla, los recordatorios de carrito de arriba ya salieron. */
  let pedidosSinPagar = { revisados: 0, enviados: 0 };
  try {
    pedidosSinPagar = await recordarPedidosSinPagar();
  } catch (err) {
    console.error('[recordar-carritos] pedidos sin pagar:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true, revisados: candidatos?.length || 0, enviados, pedidos_sin_pagar: pedidosSinPagar });
}
