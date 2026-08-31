import { NextRequest, NextResponse } from 'next/server';
import { supabaseWeb } from '@/lib/supabase-web';
import { obtenerProductoPorSku } from '@/lib/catalogo';
import { enviarCorreo } from '@/lib/resend';
import { correoCarritoAbandonado } from '@/lib/correo-pedido';
import type { ItemCarritoWeb } from '@/lib/carritos-web';

/** Cuánto esperar desde que el cliente dejó el correo (o lo actualizó por
 * última vez) antes de mandarle el recordatorio — bastante para no
 * molestar a alguien que sigue comprando en ese momento, pero dentro de la
 * ventana de 24h en que el carrito sigue vivo. */
const RETRASO_RECORDATORIO_MS = 60 * 60 * 1000;

function verificarCron(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  return req.headers.get('authorization') === `Bearer ${secreto}`;
}

/**
 * GET /api/cron/recordar-carritos — programado en vercel.json. Busca
 * carritos de checkout con correo, sin pedido asociado y sin recordatorio
 * enviado, que ya llevan más de RETRASO_RECORDATORIO_MS sin actualizarse y
 * todavía no expiraron (24h desde que se guardaron). Reutiliza el mismo
 * Resend que la confirmación/cancelación de pedido — mismo aviso: mientras
 * no haya dominio propio verificado, solo entrega de verdad a la cuenta que
 * creó la API key (ver docs/SNAPSHOT.md, pendiente #1).
 */
export async function GET(req: NextRequest) {
  if (!verificarCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const ahora = new Date();
  const limiteActualizacion = new Date(ahora.getTime() - RETRASO_RECORDATORIO_MS).toISOString();

  const { data: candidatos, error } = await supabaseWeb
    .from('carritos_web')
    .select('id, items, correo, expira_en')
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
    const items = (carrito.items as ItemCarritoWeb[]) || [];
    const resueltos = await Promise.all(items.map(async (it) => ({ it, producto: await obtenerProductoPorSku(it.sku) })));
    const disponibles = resueltos.filter((r) => r.producto !== null);

    if (disponibles.length > 0) {
      const { subject, html } = correoCarritoAbandonado(
        disponibles.map(({ producto, it }) => ({ nombre: producto!.nombre, cantidad: it.cantidad, precio_web: producto!.precio_web }))
      );
      const ok = await enviarCorreo({ to: carrito.correo as string, subject, html });
      if (ok) enviados++;
    }

    // Se marca igual aunque no quedara nada disponible o el envío fallara —
    // un recordatorio de un carrito vacío no tiene sentido, y reintentar un
    // envío fallido de Resend automáticamente no es la solución (ver aviso
    // arriba: casi siempre es el dominio no verificado, no un error transitorio).
    await supabaseWeb.from('carritos_web').update({ recordatorio_enviado_en: ahora.toISOString() }).eq('id', carrito.id);
  }

  return NextResponse.json({ ok: true, revisados: candidatos?.length || 0, enviados });
}
