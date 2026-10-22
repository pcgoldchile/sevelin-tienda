import { NextResponse } from 'next/server';
import { listarCatalogoCompleto } from '@/lib/catalogo';

// GET /api/productos — catálogo público (ver README-ECOMMERCE-SEVELIN.md sección 5).
// Sin auth: es la tienda pública. El filtro publicado_web/stock_web vive en listarCatalogoCompleto() (con descripción, desde la base).
export async function GET() {
  try {
    const productos = await listarCatalogoCompleto();
    return NextResponse.json(productos);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo cargar el catálogo';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
