import { NextRequest, NextResponse } from 'next/server';
import { crearCarritoCompartido, type ItemCarritoWeb } from '@/lib/carritos-web';

/** POST /api/carrito/compartir — crea el carrito detrás del botón "🔗
 * Compartir carrito" (ver carrito-drawer.tsx). Solo guarda sku+cantidad,
 * igual que antes cuando iba codificado en la URL — precio/nombre/stock se
 * revalidan contra el catálogo real al abrir el link (ver
 * /carrito-compartido). Expira a las 24h desde que se crea. */
export async function POST(req: NextRequest) {
  let cuerpo: { items?: { sku?: string; cantidad?: number }[] };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const items: ItemCarritoWeb[] = (cuerpo.items || [])
    .map((it) => ({ sku: String(it.sku || '').trim(), cantidad: Math.max(1, Math.round(Number(it.cantidad) || 0)) }))
    .filter((it) => it.sku);

  if (items.length === 0) {
    return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
  }

  try {
    const { token, expiraEn } = await crearCarritoCompartido(items);
    return NextResponse.json({ ok: true, token, expiraEn });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo crear el link' }, { status: 500 });
  }
}
