import { NextRequest, NextResponse } from 'next/server';
import { obtenerProductoPorSku } from '@/lib/catalogo';

// GET /api/productos/:sku — ficha de un producto (README sección 5).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  try {
    const producto = await obtenerProductoPorSku(sku);
    if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    return NextResponse.json(producto);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo cargar el producto';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
