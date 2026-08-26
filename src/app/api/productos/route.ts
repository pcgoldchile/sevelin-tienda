import { NextResponse } from 'next/server';
import { listarCatalogo } from '@/lib/catalogo';

// GET /api/productos — catálogo público (ver README-ECOMMERCE-SEVELIN.md sección 5).
// Sin auth: es la tienda pública. El filtro publicado_web/stock_web vive en listarCatalogo().
export async function GET() {
  try {
    const productos = await listarCatalogo();
    return NextResponse.json(productos);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo cargar el catálogo';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
