import { NextRequest, NextResponse } from 'next/server';
import { autocompletarDireccion } from '@/lib/places';

interface CuerpoAutocompletar {
  input?: string;
}

/**
 * POST /api/autocompletar-direccion — sugerencias en vivo mientras el
 * cliente escribe la calle en el checkout (ver src/lib/places.ts). La
 * llave de Google nunca llega al navegador: el checkout llama a esta ruta
 * propia, que es quien habla con Places API (New).
 */
export async function POST(req: NextRequest) {
  let cuerpo: CuerpoAutocompletar;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const sugerencias = await autocompletarDireccion(cuerpo.input || '');
  return NextResponse.json({ sugerencias });
}
