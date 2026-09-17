import { NextRequest, NextResponse } from 'next/server';
import { supabaseWeb } from '@/lib/supabase-web';
import { crearClienteServidor } from '@/lib/supabase-server';
import { chequearLimite, ipReal, respuestaLimiteExcedido } from '@/lib/rate-limit';
import { enviarCorreoCotizacion } from '@/lib/correo-cotizacion';
import {
  correoValido,
  resolverLineasCotizacion,
  totalesDeCotizacion,
  vencimientoCotizacion,
} from '@/lib/cotizaciones';

interface CuerpoCotizacion {
  nombre?: string;
  correo?: string;
  telefono?: string;
  empresa?: string;
  rut?: string;
  giro?: string;
  nota?: string;
  items?: { sku?: string; cantidad?: number }[];
  /** El cliente decide si además quiere el documento por correo. */
  enviarPorCorreo?: boolean;
}

const limpiar = (v: unknown, max: number): string | null => {
  const t = String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
  return t || null;
};

/**
 * POST /api/cotizacion — el cliente arma su propia cotización desde el
 * carrito (supabase/35).
 *
 * Los precios NUNCA salen del body: el carrito vive en localStorage del
 * navegador y cualquiera puede editarlo. Cada línea se vuelve a resolver
 * contra `productos_web`, igual que hace el checkout con una compra real —
 * un documento con un precio que el cliente se puso solo sería peor que no
 * tener cotizador.
 *
 * Con freno de tasa porque manda correo: sin él, el endpoint sirve de relay
 * para spamear a terceros desde el dominio de Sevelin.
 */
export async function POST(req: NextRequest) {
  const limite = await chequearLimite('crear-cotizacion', ipReal(req));
  if (!limite.permitido) return respuestaLimiteExcedido(limite);

  let cuerpo: CuerpoCotizacion;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'No se pudo leer la solicitud' }, { status: 400 });
  }

  const nombre = limpiar(cuerpo.nombre, 80);
  const correo = String(cuerpo.correo ?? '').trim().toLowerCase().slice(0, 120);
  if (!nombre) return NextResponse.json({ error: 'Escribe tu nombre' }, { status: 400 });
  if (!correoValido(correo)) return NextResponse.json({ error: 'Revisa el correo: no parece válido' }, { status: 400 });

  // Los precios del documento salen del catálogo, nunca del navegador.
  let lineas;
  try {
    lineas = await resolverLineasCotizacion(
      (cuerpo.items || []).map((i) => ({ sku: String(i?.sku || ''), cantidad: Number(i?.cantidad) || 0 }))
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No se pudo armar la cotización' },
      { status: 400 }
    );
  }

  const totales = totalesDeCotizacion(lineas);

  /* La sesión se lee de la cookie en el servidor, nunca del body — mismo
     criterio que el checkout: aceptar un user_id que manda el navegador
     dejaría colgar una cotización de la cuenta de cualquier otro. */
  let clienteUserId: string | null = null;
  try {
    const supabaseSesion = await crearClienteServidor();
    const { data } = await supabaseSesion.auth.getUser();
    clienteUserId = data.user?.id ?? null;
  } catch {
    // Sin sesión (o Supabase Auth sin configurar): se cotiza igual como invitado.
  }

  const { data, error } = await supabaseWeb
    .from('cotizaciones_web')
    .insert([{
      nombre,
      correo,
      telefono: limpiar(cuerpo.telefono, 40),
      empresa: limpiar(cuerpo.empresa, 120),
      rut: limpiar(cuerpo.rut, 20),
      giro: limpiar(cuerpo.giro, 120),
      nota: limpiar(cuerpo.nota, 500),
      cliente_user_id: clienteUserId,
      vence_en: vencimientoCotizacion().toISOString(),
      neto: totales.neto,
      iva: totales.iva,
      total: totales.total,
      items: lineas,
    }])
    .select('numero_cotizacion, token_publico, vence_en')
    .single();

  if (error || !data) {
    console.error('[cotizacion] No se pudo guardar:', error?.message);
    return NextResponse.json({ error: 'No se pudo generar la cotización. Intenta de nuevo.' }, { status: 500 });
  }

  /* El correo se manda después de guardar y NO puede voltear la respuesta:
     la cotización ya existe y el cliente ya puede descargarla. Si el envío
     falla, se le dice —para que no quede esperando un correo que no va a
     llegar— pero no se pierde el documento. */
  let correoEnviado = false;
  if (cuerpo.enviarPorCorreo) {
    correoEnviado = await enviarCorreoCotizacion({
      para: correo,
      nombre,
      numero: data.numero_cotizacion,
      token: data.token_publico,
      venceEn: data.vence_en,
      lineas,
      totales,
    });
  }

  return NextResponse.json({
    numero: data.numero_cotizacion,
    token: data.token_publico,
    vence_en: data.vence_en,
    correo_enviado: correoEnviado,
  }, { status: 201 });
}
