import { NextRequest, NextResponse } from 'next/server';
import { obtenerProductoPublicado } from '@/lib/catalogo';
import { skuDesdeRuta } from '@/lib/sku-url';

// GET /api/productos/:sku — ficha de un producto (README sección 5).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  try {
    // Next entrega el parámetro SIN decodificar: un SKU con espacio llega
    // como "TECMOU150%20E4U" y no calzaría con la base (ver lib/sku-url).
    const producto = await obtenerProductoPublicado(skuDesdeRuta(sku));
    if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    return NextResponse.json(producto);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo cargar el producto';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
