import { NextRequest, NextResponse } from 'next/server';
import { supabaseWeb } from '@/lib/supabase-web';
import { correoRecordatorioRetiro } from '@/lib/correo-pedido';
import { enviarCorreo } from '@/lib/resend';
import type { PedidoWeb } from '@/lib/tipos';

function verificarCron(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  return req.headers.get('authorization') === `Bearer ${secreto}`;
}

/**
 * GET /api/cron/recordar-retiros — programado en vercel.json.
 *
 * Avisa a quienes dijeron que HOY pasarían a retirar su pedido. Corre
 * temprano en la mañana de Chile a propósito: un recordatorio que llega
 * después de la hora en que la persona pensaba venir no recuerda nada.
 *
 * SOLO PEDIDOS YA PAGADOS Y SIN ENTREGAR. Recordarle que venga a buscar
 * algo a quien nunca completó el pago sería pedirle que pase por un
 * pedido que no existe; y a quien ya lo retiró, hacerlo volver.
 *
 * SE MARCA DESPUÉS DE ENVIAR, nunca antes: si el correo falla, la fila
 * sigue pendiente. La alternativa —marcar primero— perdería el aviso en
 * silencio, que es exactamente lo que el cliente estaba esperando.
 */
export async function GET(req: NextRequest) {
  if (!verificarCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // "Hoy" en Chile, no en UTC: el servidor corre en UTC y a partir de las
  // 21:00 de Chile allá ya es el día siguiente.
  const hoyChile = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

  const { data, error } = await supabaseWeb
    .from('pedidos_web')
    .select('*')
    .eq('retiro_fecha', hoyChile)
    .is('recordatorio_retiro_enviado_en', null)
    .in('estado', ['PAGADO', 'PREPARANDO']);

  if (error) {
    console.error('[recordar-retiros] no se pudo consultar:', error.message);
    return NextResponse.json({ error: 'No se pudo consultar' }, { status: 500 });
  }

  const pedidos = (data || []) as PedidoWeb[];
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const avisados: string[] = [];

  for (const pedido of pedidos) {
    if (!pedido.cliente_email) continue;
    const { subject, html } = correoRecordatorioRetiro({
      nombreCliente: pedido.cliente_nombre,
      numeroPedido: pedido.numero_pedido,
      bloque: pedido.retiro_bloque,
      whatsapp,
    });

    // enviarCorreo() no lanza: devuelve false. Hay que mirar el valor, o se
    // marcarían como avisados correos que nunca salieron.
    const enviado = await enviarCorreo({ to: pedido.cliente_email, subject, html });
    if (enviado) avisados.push(pedido.numero_pedido);
    else console.error(`[recordar-retiros] no se pudo avisar a ${pedido.cliente_email}`);
  }

  if (avisados.length > 0) {
    const { error: errMarcar } = await supabaseWeb
      .from('pedidos_web')
      .update({ recordatorio_retiro_enviado_en: new Date().toISOString() })
      .in('numero_pedido', avisados);
    if (errMarcar) console.error('[recordar-retiros] no se pudo marcar:', errMarcar.message);
  }

  return NextResponse.json({ ok: true, candidatos: pedidos.length, avisados: avisados.length });
}
