import { NextRequest, NextResponse } from 'next/server';
import { correoQrRetiro } from '@/lib/correo-pedido';
import { enviarCorreo } from '@/lib/resend';
import { esTokenRetiroValido, urlRetiro } from '@/lib/retiro-ot';
import { verificarSecretoSync } from '@/lib/verificar-secreto';

/**
 * El POS llama acá al crear una Orden de Trabajo (o al regenerar su QR)
 * para mandarle al dueño del equipo su QR de retiro — mismo patrón que
 * /api/pos/notificar-entrega: el POS no tiene Resend ni la plantilla.
 *
 * A diferencia de los pedidos, la tienda no tiene la tabla de OT: los
 * datos llegan en el cuerpo, protegidos por el mismo SYNC_SECRET.
 */
export async function POST(req: NextRequest) {
  if (!verificarSecretoSync(req)) {
    return NextResponse.json({ error: 'Secreto de sincronización inválido' }, { status: 401 });
  }

  let body: { correo?: string; nombre?: string; numero_ot?: string; dispositivo?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const correo = String(body.correo || '').trim();
  const numeroOt = String(body.numero_ot || '').trim();
  if (!correo.includes('@')) return NextResponse.json({ error: 'Falta un correo válido' }, { status: 400 });
  if (!numeroOt) return NextResponse.json({ error: 'Falta numero_ot' }, { status: 400 });
  if (!esTokenRetiroValido(body.token)) return NextResponse.json({ error: 'Código de retiro inválido' }, { status: 400 });

  const { subject, html } = correoQrRetiro({
    nombreCliente: String(body.nombre || '').trim().split(/\s+/)[0] || null,
    numeroOt,
    dispositivo: String(body.dispositivo || '').trim() || null,
    url: urlRetiro(body.token),
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  });
  const enviado = await enviarCorreo({ to: correo, subject, html });

  return NextResponse.json({ ok: true, enviado });
}
