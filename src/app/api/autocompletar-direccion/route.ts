import { NextRequest, NextResponse } from 'next/server';
import { autocompletarDireccion } from '@/lib/places';
import { chequearLimite, ipReal, respuestaLimiteExcedido } from '@/lib/rate-limit';

interface CuerpoAutocompletar {
  input?: string;
}

/**
 * POST /api/autocompletar-direccion — sugerencias en vivo mientras el
 * cliente escribe la calle en el checkout (ver src/lib/places.ts). La
 * llave de Google nunca llega al navegador: el checkout llama a esta ruta
 * propia, que es quien habla con Places API (New).
 *
 * Freno de tasa por IP (ver src/lib/rate-limit.ts) ANTES de tocar Google:
 * esta ruta se dispara con cada tecla, y Places Autocomplete es una API
 * pagada sin tope de presupuesto configurado todavía — sin freno, un
 * script puede generar costo ilimitado (Reporte de Seguridad Consolidado
 * B, hallazgo #3).
 */
export async function POST(req: NextRequest) {
  const limite = await chequearLimite('autocompletar-direccion', ipReal(req));
  if (!limite.permitido) return respuestaLimiteExcedido(limite);

  let cuerpo: CuerpoAutocompletar;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const sugerencias = await autocompletarDireccion(cuerpo.input || '');
  return NextResponse.json({ sugerencias });
}
