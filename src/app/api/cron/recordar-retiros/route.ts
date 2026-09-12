import { NextRequest, NextResponse } from 'next/server';
import { supabaseWeb } from '@/lib/supabase-web';
import { correoRecordatorioEntregaEquipo, correoRecordatorioRetiro } from '@/lib/correo-pedido';
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
 * Dos avisos distintos en la misma corrida de la mañana:
 *
 *   RETIRO          → a quienes dijeron que HOY pasarían a retirar su
 *                     pedido. Temprano a propósito: un recordatorio que
 *                     llega después de la hora en que la persona pensaba
 *                     venir no recuerda nada.
 *   ENTREGA_EQUIPO  → a quienes pagaron un servicio técnico y dijeron que
 *                     MAÑANA traen su equipo (supabase/32). Con un día de
 *                     margen: tienen que respaldar, buscar el cargador y
 *                     hacerse el tiempo.
 *
 * SOLO PEDIDOS YA PAGADOS Y SIN ENTREGAR. Recordarle que venga a quien
 * nunca completó el pago sería citarlo por un pedido que no existe.
 *
 * SE MARCA DESPUÉS DE ENVIAR, nunca antes: si el correo falla, la fila
 * sigue pendiente. Marcar primero perdería el aviso en silencio. Los dos
 * tipos comparten la misma marca (recordatorio_retiro_enviado_en): cada
 * pedido tiene un solo tipo de agenda.
 */
export async function GET(req: NextRequest) {
  if (!verificarCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // "Hoy" y "mañana" en Chile, no en UTC: el servidor corre en UTC y a
  // partir de las 21:00 de Chile allá ya es el día siguiente.
  const hoyChile = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  const manana = new Date(`${hoyChile}T12:00:00`);
  manana.setDate(manana.getDate() + 1);
  const mananaChile = manana.toLocaleDateString('en-CA');

  const consulta = (fecha: string, tipo: PedidoWeb['agenda_tipo']) =>
    supabaseWeb
      .from('pedidos_web')
      .select('*')
      .eq('retiro_fecha', fecha)
      .eq('agenda_tipo', tipo)
      .is('recordatorio_retiro_enviado_en', null)
      .in('estado', ['PAGADO', 'PREPARANDO']);

  const [retiros, entregas] = await Promise.all([
    consulta(hoyChile, 'RETIRO'),
    consulta(mananaChile, 'ENTREGA_EQUIPO'),
  ]);

  if (retiros.error || entregas.error) {
    console.error('[recordar-retiros] no se pudo consultar:', (retiros.error || entregas.error)?.message);
    return NextResponse.json({ error: 'No se pudo consultar' }, { status: 500 });
  }

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const pedidos = [...((retiros.data || []) as PedidoWeb[]), ...((entregas.data || []) as PedidoWeb[])];
  const avisados: string[] = [];

  for (const pedido of pedidos) {
    if (!pedido.cliente_email) continue;
    const { subject, html } = pedido.agenda_tipo === 'ENTREGA_EQUIPO'
      ? correoRecordatorioEntregaEquipo({
          nombreCliente: pedido.cliente_nombre,
          numeroPedido: pedido.numero_pedido,
          fecha: pedido.retiro_fecha as string,
          bloque: pedido.retiro_bloque,
          servicios: pedido.items.map((it) => it.nombre),
          whatsapp,
        })
      : correoRecordatorioRetiro({
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

  return NextResponse.json({
    ok: true,
    candidatos: pedidos.length,
    retiros: retiros.data?.length ?? 0,
    entregasEquipo: entregas.data?.length ?? 0,
    avisados: avisados.length,
  });
}
