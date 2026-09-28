import { NextRequest, NextResponse } from 'next/server';
import { esCorreoDeRobot, guardarCarritoAbandonado, type ItemCarritoWeb } from '@/lib/carritos-web';

/** POST /api/carrito/abandono — lo llama formulario-checkout.tsx apenas el
 * cliente deja un correo válido (antes de pagar), y de nuevo si después
 * completa nombre o teléfono. Sirve para recordarle el carrito si no termina
 * (ver /api/cron/recordar-carritos) y para que el dueño le escriba por
 * WhatsApp desde el POS. Mejor esfuerzo: si falla, el checkout sigue igual. */
export async function POST(req: NextRequest) {
  let cuerpo: {
    id?: string;
    correo?: string;
    nombre?: string;
    telefono?: string;
    items?: { sku?: string; cantidad?: number }[];
  };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const correo = (cuerpo.correo || '').trim();
  if (!correo || !correo.includes('@')) {
    return NextResponse.json({ error: 'Correo inválido' }, { status: 400 });
  }
  // El robot de Google Merchant Center prueba el checkout: no es una venta que recuperar
  if (esCorreoDeRobot(correo)) return NextResponse.json({ ok: true, id: null });

  const items: ItemCarritoWeb[] = (cuerpo.items || [])
    .map((it) => ({ sku: String(it.sku || '').trim(), cantidad: Math.max(1, Math.round(Number(it.cantidad) || 0)) }))
    .filter((it) => it.sku);
  if (items.length === 0) {
    return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
  }

  const nombre = String(cuerpo.nombre || '').trim().slice(0, 120) || null;
  const telefono = String(cuerpo.telefono || '').replace(/[^\d+]/g, '').slice(0, 20) || null;

  try {
    const { id } = await guardarCarritoAbandonado({ id: cuerpo.id, items, correo, nombre, telefono });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo guardar el carrito' }, { status: 500 });
  }
}
