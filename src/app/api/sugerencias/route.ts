import { NextRequest, NextResponse } from 'next/server';
import { publicadosEnMemoria } from '@/lib/catalogo-memoria';
import { buscarEnProductos } from '@/lib/busqueda';

/**
 * GET /api/sugerencias?q=pow — lo que aparece bajo el buscador mientras se
 * escribe (#2, 18-10-2026). Mismo buscador que /productos?q= (perdona tildes,
 * plurales y errores), solo los 6 primeros y con lo justo para mostrarlos.
 * Pública, como el catálogo. No registra la búsqueda: eso pasa al apretar Buscar.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').slice(0, 80);
  if (q.trim().length < 2) return NextResponse.json({ sugerencias: [] });
  try {
    const encontrados = buscarEnProductos(await publicadosEnMemoria(), q).slice(0, 6);
    return NextResponse.json({
      sugerencias: encontrados.map((p) => ({
        sku: p.sku,
        nombre: p.nombre,
        precio: p.precio_web,
        desde: !!p.precio_a_consultar,
        imagen: p.imagen_urls?.[0] ?? null,
        encargo: !!p.es_pedido_encargo,
        agotado: !p.es_pedido_encargo && !p.por_llegar && p.stock_web <= 0,
      })),
    }, { headers: { 'Cache-Control': 'public, max-age=30' } });
  } catch (err) {
    console.error('[sugerencias]', err instanceof Error ? err.message : err);
    return NextResponse.json({ sugerencias: [] });
  }
}
