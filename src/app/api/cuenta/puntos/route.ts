import { NextRequest, NextResponse } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase-server';
import { activarCuentaWeb, cuentaDeUsuario, generarCodigoCanje } from '@/lib/puntos';

/**
 * Puntos Sevelin desde la cuenta web (supabase/47). La cuenta se lee de la cookie, nunca del body.
 *   POST { accion: 'activar', telefono, nombre, fecha_nacimiento?, consentimiento }
 *   POST { accion: 'codigo' } → código de canje de 6 números para dictarlo en la caja (10 min)
 */
export async function POST(req: NextRequest) {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inicia sesión' }, { status: 401 });
  let cuerpo: Record<string, unknown>;
  try { cuerpo = await req.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 }); }

  try {
    if (cuerpo.accion === 'activar') {
      const fecha = String(cuerpo.fecha_nacimiento || '');
      const r = await activarCuentaWeb(user, {
        telefono: String(cuerpo.telefono || ''),
        nombre: String(cuerpo.nombre || ''),
        fechaNacimiento: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
        consentimiento: cuerpo.consentimiento === true,
      });
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ ok: true, codigo: r.cuenta.codigo, unida: r.unida });
    }
    if (cuerpo.accion === 'codigo') {
      const cuenta = await cuentaDeUsuario(user.id);
      if (!cuenta) return NextResponse.json({ error: 'Primero activa tus puntos' }, { status: 400 });
      const codigo = await generarCodigoCanje(cuenta.id, 'web');
      return NextResponse.json({ codigo, minutos: 10 }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (err) {
    console.error('[cuenta/puntos]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'No se pudo completar. Intenta de nuevo en un rato.' }, { status: 500 });
  }
}
