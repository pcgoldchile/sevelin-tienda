import { NextRequest, NextResponse } from 'next/server';
import { registrarLatido } from '@/lib/visitas-activas';

/** POST /api/visita-activa — lo llama VisitTracker (cliente) cada ~25s
 * mientras la pestaña sigue abierta y visible. Sin autenticación, mismo
 * criterio que /api/eventos/visita: no es sensible, solo alimenta
 * "visitantes activos ahora" del panel Métricas del POS. */
export async function POST(req: NextRequest) {
  let sessionId = '';
  try {
    const body = await req.json();
    sessionId = String(body?.sessionId || '').trim();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  // Validación mínima: un UUID real, nunca lo que mande el cliente tal
  // cual — evita que una fila con basura arbitraria quede como PK.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    return NextResponse.json({ error: 'sessionId inválido' }, { status: 400 });
  }

  await registrarLatido(sessionId);
  return NextResponse.json({ ok: true });
}
