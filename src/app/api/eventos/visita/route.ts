import { NextResponse } from 'next/server';
import { registrarVisita } from '@/lib/eventos-web';

/** POST /api/eventos/visita — lo llama VisitTracker (cliente) en cada
 * carga de página/navegación. Sin body, sin autenticación: es un contador
 * simple, no algo sensible. registrarVisita() es mejor esfuerzo (nunca
 * lanza), así que esto siempre responde 200. */
export async function POST() {
  await registrarVisita();
  return NextResponse.json({ ok: true });
}
