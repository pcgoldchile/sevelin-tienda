import { NextRequest, NextResponse } from 'next/server';
import { darDeBajaRecordatorios } from '@/lib/carritos-web';

/** POST /api/carrito/baja — el botón de /baja-recordatorio. Es POST a propósito:
 * los antivirus de correo abren los links solos, y un GET daría de baja a gente
 * que nunca lo pidió. */
export async function POST(req: NextRequest) {
  const formulario = await req.formData().catch(() => null);
  const token = String(formulario?.get('t') || '').trim();
  const destino = new URL('/baja-recordatorio', req.url);

  try {
    const correo = token ? await darDeBajaRecordatorios(token) : null;
    destino.searchParams.set(correo ? 'listo' : 'error', '1');
  } catch {
    destino.searchParams.set('error', '1');
  }
  return NextResponse.redirect(destino, 303);
}
