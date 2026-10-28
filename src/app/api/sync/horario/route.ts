import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { supabaseWeb } from '@/lib/supabase-web';
import { sanearHorario } from '@/lib/horarios';
import { ETIQUETA_HORARIO } from '@/lib/horario-actual';

/**
 * POST /api/sync/horario — el POS manda el horario de atención que el dueño acaba de guardar
 * (módulo "🕒 Horario", 28-10-2026). Se guarda en ajustes_tienda y se refrescan las páginas que
 * lo muestran: el pie de página está en todas, así que se refresca el layout entero.
 *
 * Mismo secreto compartido que el resto de la sincronización (x-sync-secret), no JWT.
 * Cuerpo: { horario: { tramos: [{desde:10,hasta:13},{desde:14,hasta:20}], dias, aviso_domingo } }
 */
export async function POST(req: NextRequest) {
  const secreto = process.env.SYNC_SECRET;
  if (!secreto) return NextResponse.json({ error: 'SYNC_SECRET no está configurado en la tienda' }, { status: 500 });
  if (req.headers.get('x-sync-secret') !== secreto) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let cuerpo: { horario?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  const horario = sanearHorario(cuerpo.horario);
  if (!horario) return NextResponse.json({ error: 'Horario inválido: revisa que cada tramo empiece antes de terminar y que vayan en orden' }, { status: 400 });

  const { error } = await supabaseWeb
    .from('ajustes_tienda')
    .upsert({ clave: 'horario', valor: horario, actualizado_en: new Date().toISOString() }, { onConflict: 'clave' });
  if (error) {
    console.error('[sync/horario]', error.message);
    return NextResponse.json({ error: 'No se pudo guardar el horario' }, { status: 500 });
  }

  revalidateTag(ETIQUETA_HORARIO, { expire: 0 });
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, horario });
}
