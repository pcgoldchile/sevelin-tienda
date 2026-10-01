import { NextRequest, NextResponse } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase-server';
import { supabaseWeb } from '@/lib/supabase-web';
import { cuentaMayoristaDe } from '@/lib/mayorista';
import { normalizarRutValido } from '@/lib/rut';
import { correoSolicitudMayorista } from '@/lib/correo-pedido';
import { enviarCorreo } from '@/lib/resend';

/**
 * Venta mayorista, Fase 1 (supabase/39). Solo con sesión: la cuenta se lee
 * de la cookie, nunca del body.
 *
 * GET  → estado de la solicitud de esta cuenta (o null si nunca pidió).
 * POST → pide la cuenta mayorista. Queda PENDIENTE hasta que el dueño la
 *        verifique por WhatsApp o llamada y la apruebe en el POS (regla del
 *        dueño, 30-09-2026: la verificación es SIEMPRE manual). Una cuenta
 *        rechazada puede volver a pedirla; las demás no.
 */

async function usuarioDeSesion() {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await usuarioDeSesion();
  if (!user) return NextResponse.json({ error: 'Inicia sesión' }, { status: 401 });
  const cuenta = await cuentaMayoristaDe(user.id);
  return NextResponse.json(
    { estado: cuenta?.estado ?? null },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

function correoDelDueno(): string {
  // Mismo destinatario que las demás alertas internas (webhooks de pago).
  return process.env.ALERTA_STOCK_EMAIL || process.env.NEXT_PUBLIC_PRIVACIDAD_EMAIL || 'sevelin.contacto@gmail.com';
}

export async function POST(req: NextRequest) {
  const user = await usuarioDeSesion();
  if (!user || !user.email) return NextResponse.json({ error: 'Inicia sesión para pedir la cuenta mayorista' }, { status: 401 });

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  const texto = (k: string, max: number) => String(cuerpo[k] ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const nombre = texto('nombre', 120);
  const rut = normalizarRutValido(texto('rut', 20));
  const telefono = texto('telefono', 20).replace(/[^\d+]/g, '');
  const ciudad = texto('ciudad', 80);
  const actividad = texto('actividad', 400);
  const declaraReventa = cuerpo.declara_reventa === true;

  if (nombre.length < 3) return NextResponse.json({ error: 'Escribe tu nombre o el de tu negocio' }, { status: 400 });
  if (!rut) return NextResponse.json({ error: 'Revisa el RUT: el dígito verificador no calza' }, { status: 400 });
  if (telefono.replace(/\D/g, '').length < 8) return NextResponse.json({ error: 'Escribe un WhatsApp donde podamos contactarte' }, { status: 400 });
  if (ciudad.length < 2) return NextResponse.json({ error: 'Escribe tu ciudad' }, { status: 400 });
  if (actividad.length < 5) return NextResponse.json({ error: 'Cuéntanos en pocas palabras a qué te dedicas o qué te interesa comprar' }, { status: 400 });

  const actual = await cuentaMayoristaDe(user.id);
  if (actual && actual.estado !== 'RECHAZADA') {
    return NextResponse.json({ error: 'Ya pediste la cuenta mayorista.', estado: actual.estado }, { status: 409 });
  }

  const ahora = new Date().toISOString();
  const fila = {
    user_id: user.id,
    estado: 'PENDIENTE',
    nombre,
    rut,
    telefono,
    email: user.email,
    ciudad,
    actividad,
    declara_reventa: declaraReventa,
    solicitado_en: ahora,
    revisado_en: null,
    revisado_por: null,
    nota_verificacion: null,
    motivo: null,
    actualizado_en: ahora,
  };
  const { error } = await supabaseWeb.from('cuentas_mayoristas').upsert(fila, { onConflict: 'user_id' });
  if (error) {
    if (/cuentas_mayoristas_rut_viva|duplicate key/i.test(error.message)) {
      return NextResponse.json({ error: 'Ese RUT ya tiene una cuenta mayorista. Escríbenos por WhatsApp y lo revisamos.' }, { status: 409 });
    }
    console.error('[mayorista] no se pudo guardar la solicitud:', error.message);
    return NextResponse.json({ error: 'No pudimos guardar tu solicitud. Intenta de nuevo en unos minutos.' }, { status: 500 });
  }

  /* Aviso al dueño. Si el correo falla, la solicitud igual quedó guardada y
     aparece en el POS (chip "mayoristas por aprobar"): no se le dice al
     cliente que falló algo que no le afecta. */
  const { subject, html } = correoSolicitudMayorista({
    nombre, rut, telefono, email: user.email, ciudad, actividad, declaraReventa,
  });
  const enviado = await enviarCorreo({ to: correoDelDueno(), subject, html });
  if (!enviado) console.error('[mayorista] no se pudo avisar por correo la solicitud de', user.id);

  return NextResponse.json({ ok: true, estado: 'PENDIENTE' });
}
