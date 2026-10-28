import { NextRequest, NextResponse } from 'next/server';
import { registrarVisita, registrarVistaProducto } from '@/lib/eventos-web';
import { chequearLimite, ipReal, respuestaLimiteExcedido } from '@/lib/rate-limit';

/** POST /api/eventos/visita — dos usos, los dos desde el navegador:
 *  - sin cuerpo: una carga de página o navegación (VisitTracker);
 *  - con { vista_producto_id }: una vista de la ficha de un producto (RegistrarVistaProducto).
 *    Desde el 28-10-2026 la ficha queda en caché, así que la vista ya no la puede contar el servidor.
 * Sin autenticación: son contadores simples, no algo sensible. Con freno por IP (auditoría
 * 28-10-2026) para que un script no llene la tabla. registrarVisita()/registrarVistaProducto() son
 * mejor esfuerzo (nunca lanzan), así que esto siempre responde 200. */
export async function POST(req: NextRequest) {
  const limite = await chequearLimite('eventos-visita', ipReal(req));
  if (!limite.permitido) return respuestaLimiteExcedido(limite);

  let idProducto = 0;
  try {
    const cuerpo = await req.json();
    idProducto = Number(cuerpo?.vista_producto_id) || 0;
  } catch {
    // Sin cuerpo (VisitTracker): es una visita de página.
  }

  if (Number.isInteger(idProducto) && idProducto > 0) await registrarVistaProducto(idProducto);
  else await registrarVisita();
  return NextResponse.json({ ok: true });
}
