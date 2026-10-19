import { NextRequest, NextResponse } from 'next/server';
import { publicadosEnMemoria } from '@/lib/catalogo-memoria';

/**
 * GET /api/catalogo/por-sku?skus=a,b,c — los productos publicados de esa lista,
 * en ese orden. Lo usa "Vistos recientemente" (#11), que guarda los SKU en el
 * navegador. Lo que ya no está publicado simplemente no vuelve.
 */
export async function GET(req: NextRequest) {
  const skus = (req.nextUrl.searchParams.get('skus') || '')
    .split(',').map((s) => s.trim()).filter((s) => s && s.length <= 120).slice(0, 12);
  if (!skus.length) return NextResponse.json({ productos: [] });
  try {
    const porSku = new Map((await publicadosEnMemoria()).map((p) => [p.sku, p]));
    const productos = skus.map((s) => porSku.get(s)).filter(Boolean);
    return NextResponse.json({ productos }, { headers: { 'Cache-Control': 'public, max-age=30' } });
  } catch (err) {
    console.error('[por-sku]', err instanceof Error ? err.message : err);
    return NextResponse.json({ productos: [] });
  }
}
