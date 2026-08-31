import { NextRequest, NextResponse } from 'next/server';
import { guardarCarritoAbandonado, type ItemCarritoWeb } from '@/lib/carritos-web';

/** POST /api/carrito/abandono — se llama desde formulario-checkout.tsx apenas
 * el cliente completa el correo (antes de pagar), para poder recordarle si
 * no vuelve a comprar dentro de 24h (ver cron en
 * /api/cron/recordar-carritos). Mejor esfuerzo: si falla, el checkout sigue
 * funcionando igual, solo no queda registro para el recordatorio. */
export async function POST(req: NextRequest) {
  let cuerpo: { id?: string; correo?: string; items?: { sku?: string; cantidad?: number }[] };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const correo = (cuerpo.correo || '').trim();
  if (!correo || !correo.includes('@')) {
    return NextResponse.json({ error: 'Correo inválido' }, { status: 400 });
  }

  const items: ItemCarritoWeb[] = (cuerpo.items || [])
    .map((it) => ({ sku: String(it.sku || '').trim(), cantidad: Math.max(1, Math.round(Number(it.cantidad) || 0)) }))
    .filter((it) => it.sku);
  if (items.length === 0) {
    return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
  }

  try {
    const { id } = await guardarCarritoAbandonado({ id: cuerpo.id, items, correo });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo guardar el carrito' }, { status: 500 });
  }
}
