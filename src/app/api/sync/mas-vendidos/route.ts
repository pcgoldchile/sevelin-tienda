import { NextRequest, NextResponse } from 'next/server';
import { supabaseWeb } from '@/lib/supabase-web';

/**
 * POST /api/sync/mas-vendidos — recibe del POS cuántas unidades se ha
 * vendido de cada producto, para poder ordenar "Destacados" por lo que de
 * verdad se vende.
 *
 * Protegido con el mismo secreto compartido que el resto de la
 * sincronización (SYNC_SECRET en el header), NO con JWT de staff: quien
 * llama es el backend del POS, no una persona logueada.
 *
 * El grueso de las ventas del negocio pasa por el mostrador, así que este
 * dato solo puede venir del POS. Esta tienda nunca consulta el Supabase
 * del POS directo (regla dura del proyecto, ver CLAUDE.md): el POS empuja,
 * acá solo se guarda.
 *
 * Formato del cuerpo:
 *   { ventas: [{ producto_pos_id: 104, unidades: 37 }, ...] }
 *
 * Es idempotente: manda el total histórico de cada producto, no un
 * incremento. Reenviar el mismo lote deja exactamente el mismo estado, así
 * que un reintento tras un timeout no infla los contadores.
 */

interface FilaVentas {
  producto_pos_id?: number;
  unidades?: number;
}

export async function POST(req: NextRequest) {
  const secreto = process.env.SYNC_SECRET;
  if (!secreto) {
    return NextResponse.json({ error: 'SYNC_SECRET no está configurado en la tienda' }, { status: 500 });
  }
  if (req.headers.get('x-sync-secret') !== secreto) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let cuerpo: { ventas?: FilaVentas[] };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const filas = (cuerpo.ventas || [])
    .map((v) => ({
      producto_pos_id: Number(v.producto_pos_id),
      // Nunca negativo: un contador de unidades vendidas por debajo de 0
      // no significa nada y rompería el orden de la portada.
      unidades: Math.max(0, Math.round(Number(v.unidades) || 0)),
    }))
    .filter((v) => Number.isFinite(v.producto_pos_id) && v.producto_pos_id > 0);

  if (filas.length === 0) {
    return NextResponse.json({ error: 'No llegó ninguna venta válida' }, { status: 400 });
  }

  /* Se actualiza producto por producto en vez de con un upsert masivo:
     un upsert sobre productos_web necesitaría mandar TODAS las columnas
     NOT NULL (nombre, precio_web, etc.), y este endpoint solo conoce el
     contador — un upsert incompleto borraría el resto del producto. */
  let actualizados = 0;
  let sinCoincidencia = 0;

  for (const fila of filas) {
    const { error, count } = await supabaseWeb
      .from('productos_web')
      .update({ unidades_vendidas: fila.unidades }, { count: 'exact' })
      .eq('producto_pos_id', fila.producto_pos_id);

    if (error) {
      console.error('[sync/mas-vendidos] Error al actualizar', fila.producto_pos_id, error.message);
      continue;
    }
    // Un producto del POS que todavía no está sincronizado acá no es un
    // error: simplemente no se publicó en la web.
    if (count && count > 0) actualizados += count;
    else sinCoincidencia += 1;
  }

  return NextResponse.json({ ok: true, recibidos: filas.length, actualizados, sinCoincidencia });
}
