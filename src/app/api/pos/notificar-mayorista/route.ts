import { NextRequest, NextResponse } from 'next/server';
import { verificarSecretoSync } from '@/lib/verificar-secreto';
import { cuentaMayoristaDe, pedidoMinimoMayorista } from '@/lib/mayorista';
import { correoMayoristaAprobado } from '@/lib/correo-pedido';
import { enviarCorreo } from '@/lib/resend';

/**
 * El POS (sevelin-pos-oficial) llama acá justo después de aprobar una
 * cuenta mayorista (POST /api/pos/mayoristas/:userId/estado) — mismo patrón
 * que /api/pos/notificar-entrega: el POS no tiene la API key de Resend ni
 * la plantilla. Protegido con el SYNC_SECRET compartido de siempre.
 *
 * Solo manda el correo si la cuenta está APROBADA de verdad: el POS no
 * puede hacer que se mande a una cuenta pendiente o suspendida.
 */
export async function POST(req: NextRequest) {
  if (!verificarSecretoSync(req)) {
    return NextResponse.json({ error: 'Secreto de sincronización inválido' }, { status: 401 });
  }
  let userId = '';
  try {
    const body = await req.json();
    userId = String(body?.user_id || '').trim();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  if (!userId) return NextResponse.json({ error: 'Falta user_id' }, { status: 400 });

  const cuenta = await cuentaMayoristaDe(userId);
  if (!cuenta) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
  if (cuenta.estado !== 'APROBADA') return NextResponse.json({ error: 'La cuenta no está aprobada' }, { status: 409 });

  const { subject, html } = correoMayoristaAprobado({
    nombre: cuenta.nombre,
    pedidoMinimo: await pedidoMinimoMayorista(),
    urlSitio: (process.env.NEXT_PUBLIC_SITE_URL || 'https://sevelin.cl').replace(/\/+$/, ''),
  });
  const enviado = await enviarCorreo({ to: cuenta.email, subject, html });
  return NextResponse.json({ ok: true, enviado });
}
