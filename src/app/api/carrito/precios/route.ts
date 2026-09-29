import { NextRequest, NextResponse } from 'next/server';
import { obtenerProductoPorSku } from '@/lib/catalogo';

/**
 * POST /api/carrito/precios — el precio VIGENTE de lo que hay en el carrito.
 *
 * El carrito vive en el navegador y guarda el precio del momento en que se
 * agregó cada producto. Con ofertas que empiezan y terminan solas
 * (supabase/37), ese precio queda viejo: el cliente vería $5.990 y el
 * checkout cobraría $7.000. Esto lo pone al día al abrir el carrito o el
 * checkout. Usa la MISMA función que POST /api/checkout
 * (obtenerProductoPorSku), así lo que se muestra es exactamente lo que se
 * va a cobrar.
 *
 * Solo lectura y datos públicos (los mismos de la ficha). Tope de 50 SKU.
 */
export async function POST(req: NextRequest) {
  let cuerpo: { skus?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  const skus = Array.isArray(cuerpo.skus)
    ? [...new Set(cuerpo.skus.map((s) => String(s || '').trim()).filter(Boolean))].slice(0, 50)
    : [];
  if (!skus.length) return NextResponse.json({ precios: {} });

  try {
    const productos = await Promise.all(skus.map((sku) => obtenerProductoPorSku(sku)));
    const precios: Record<string, { precio_web: number; precio_antes: number | null; stock_web: number }> = {};
    productos.forEach((p) => {
      if (p) precios[p.sku] = { precio_web: p.precio_web, precio_antes: p.precio_antes ?? null, stock_web: p.stock_web };
    });
    return NextResponse.json({ precios });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudieron leer los precios' }, { status: 500 });
  }
}
