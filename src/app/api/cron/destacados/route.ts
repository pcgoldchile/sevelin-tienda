import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { recalcularDestacados } from '@/lib/destacados';

/**
 * GET /api/cron/destacados — una vez al día (vercel.json, 08:00 de Chile).
 * Recalcula el puntaje de Destacados con las vistas, la tendencia y el clima de
 * hoy (ver src/lib/destacados.ts) y refresca la portada. Las ventas del mes las
 * empuja el POS antes (su cron de las 07:30), y esa sincronización también
 * recalcula; este cron es el que asegura que corra aunque el POS no mande nada.
 * Vercel manda "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get('authorization') !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const resultado = await recalcularDestacados();
    revalidatePath('/');
    console.log(`[cron destacados] ${resultado.calculados} productos · Arica ${resultado.maximaArica ?? '?'} °C${resultado.calor ? ' (calor)' : ''}`);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    console.error('[cron destacados]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
