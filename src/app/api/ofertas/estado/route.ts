import { NextResponse } from 'next/server';
import { estadoOfertas } from '@/lib/ofertas';

/**
 * GET /api/ofertas/estado — si hay ofertas vigentes o por empezar, y qué
 * dice la franja. La pide <FranjaOfertas /> al cargar cada página: las
 * páginas guardadas en caché no se enteran solas de que una oferta empezó
 * o terminó, y esto las pone al día sin esperar un despliegue.
 *
 * Sin auth: es información pública (lo mismo que se ve en /ofertas). Se
 * guarda un minuto en la CDN, así una ráfaga de visitas no se convierte en
 * una consulta a la base por cada una.
 */
export async function GET() {
  try {
    return NextResponse.json(await estadoOfertas(), {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    // Sin franja es mejor que una franja equivocada: el navegador se queda con lo que ya tenía.
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo leer el estado de las ofertas' }, { status: 500 });
  }
}
