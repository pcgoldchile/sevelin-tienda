import { NextRequest, NextResponse } from 'next/server';
import { obtenerDetalleLugar } from '@/lib/places';

interface CuerpoDetalle {
  placeId?: string;
}

/**
 * POST /api/detalle-direccion — al elegir una sugerencia del
 * autocompletado, trae calle/número (si Google los separó) para rellenar
 * el formulario. Las coordenadas NO viajan de vuelta al navegador: el
 * checkout solo necesita el placeId para cotizar (ver
 * src/app/api/cotizar-envio/route.ts) — el servidor las vuelve a resolver
 * él mismo cuando cotiza, nunca confía en coordenadas del cliente.
 */
export async function POST(req: NextRequest) {
  let cuerpo: CuerpoDetalle;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const placeId = (cuerpo.placeId || '').trim();
  if (!placeId) return NextResponse.json({ error: 'Falta placeId' }, { status: 400 });

  const detalle = await obtenerDetalleLugar(placeId);
  if (!detalle) return NextResponse.json({ error: 'No se pudo obtener el detalle de esa dirección' }, { status: 404 });

  return NextResponse.json({ calle: detalle.calle, numero: detalle.numero });
}
